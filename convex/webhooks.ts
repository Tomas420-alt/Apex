import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── RevenueCat Webhook Handler ─────────────────────────────────────────────
// Receives server-to-server webhook events from RevenueCat for subscription
// lifecycle management. This is the authoritative source of truth for
// subscription status — more reliable than client-side SDK checks.
//
// Setup:
// 1. Set REVENUECAT_WEBHOOK_SECRET env var in Convex dashboard
// 2. In RevenueCat dashboard → Integrations → Webhooks, set URL to:
//    https://<your-deployment>.convex.site/webhooks/revenuecat
// 3. Set the Authorization header value to match REVENUECAT_WEBHOOK_SECRET
//
// RevenueCat webhook payload docs:
// https://www.revenuecat.com/docs/integrations/webhooks

export const revenuecatWebhook = httpAction(async (ctx, request) => {
  // 1. Verify the webhook secret in the Authorization header
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Webhook] REVENUECAT_WEBHOOK_SECRET not configured");
    return new Response("Internal server error", { status: 500 });
  }

  const authHeader = request.headers.get("Authorization") ?? "";
  // RevenueCat sends: "Bearer <secret>" or just the raw secret
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (token !== webhookSecret) {
    console.error("[Webhook] Invalid authorization");
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse the webhook body
  let body: any;
  try {
    body = await request.json();
  } catch {
    console.error("[Webhook] Invalid JSON body");
    return new Response("Bad request", { status: 400 });
  }

  const event = body?.event;
  if (!event) {
    console.error("[Webhook] Missing event in payload");
    return new Response("Bad request", { status: 400 });
  }

  const eventType: string = event.type ?? "";
  // app_user_id is the Convex user ID (set via Purchases.logIn on the client)
  const appUserId: string = event.app_user_id ?? "";
  const productId: string = event.product_id ?? "";
  const expirationAtMs: number | undefined = event.expiration_at_ms
    ? Number(event.expiration_at_ms)
    : undefined;

  console.log(`[Webhook] RevenueCat event: ${eventType} for user: ${appUserId}`);

  if (!appUserId) {
    console.error("[Webhook] Missing app_user_id in event");
    return new Response("Bad request", { status: 400 });
  }

  // 3. Handle event types
  try {
    switch (eventType) {
      // ── Activation events ─────────────────────────────────────────
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE":
      case "UNCANCELLATION": {
        const plan = productId.includes("yearly") ? "yearly" : "monthly";
        await ctx.runMutation(internal.users.activateSubscription, {
          userId: appUserId as any, // Convex user ID
          subscriptionPlan: plan,
          subscriptionExpiresAt: expirationAtMs,
        });
        console.log(`[Webhook] Activated subscription for ${appUserId}: ${plan}`);
        break;
      }

      // ── Deactivation events ───────────────────────────────────────
      case "EXPIRATION": {
        await ctx.runMutation(internal.users.updateSubscriptionInternal, {
          userId: appUserId as any,
          subscriptionStatus: "expired",
          subscriptionPlan: undefined,
          subscriptionExpiresAt: undefined,
        });
        console.log(`[Webhook] Expired subscription for ${appUserId}`);
        break;
      }

      case "CANCELLATION": {
        // User cancelled but may still have access until period ends
        await ctx.runMutation(internal.users.updateSubscriptionInternal, {
          userId: appUserId as any,
          subscriptionStatus: "cancelled",
          subscriptionPlan: undefined,
          subscriptionExpiresAt: expirationAtMs,
        });
        console.log(`[Webhook] Cancelled subscription for ${appUserId}`);
        break;
      }

      case "BILLING_ISSUE": {
        await ctx.runMutation(internal.users.updateSubscriptionInternal, {
          userId: appUserId as any,
          subscriptionStatus: "billing_issue",
          subscriptionPlan: undefined,
          subscriptionExpiresAt: undefined,
        });
        console.log(`[Webhook] Billing issue for ${appUserId}`);
        break;
      }

      // ── Informational events (no action needed) ───────────────────
      case "SUBSCRIBER_ALIAS":
      case "TRANSFER":
      case "NON_RENEWING_PURCHASE":
      case "SUBSCRIPTION_PAUSED":
        console.log(`[Webhook] Informational event ${eventType} — no action taken`);
        break;

      default:
        console.log(`[Webhook] Unknown event type: ${eventType} — ignored`);
    }
  } catch (error: any) {
    console.error(`[Webhook] Error handling ${eventType}:`, error?.message);
    return new Response("Internal server error", { status: 500 });
  }

  // 4. Always return 200 to acknowledge receipt (RevenueCat retries on non-2xx)
  return new Response("OK", { status: 200 });
});
