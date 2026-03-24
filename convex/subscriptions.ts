"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// TODO: Add RevenueCat server-side validation once webhook integration is set up.
// Currently this action trusts the client-provided entitlement data, but it
// centralises activation through a server action so that:
//   1. The public mutation can no longer set status to "active" directly.
//   2. When RevenueCat webhook/API validation is added, only this file needs to change.
//
// Future improvement: call RevenueCat REST API here to verify the customer's
// entitlement before calling activateSubscription. Example:
//   GET https://api.revenuecat.com/v1/subscribers/<app_user_id>
//   Header: Authorization: Bearer <REVENUECAT_API_KEY>

export const validateAndActivateSubscription = action({
  args: {
    subscriptionPlan: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // TODO: Validate with RevenueCat REST API before activating.
    // For now, we trust the client claim but route it through an action
    // so activation only happens via server-side code path.

    await ctx.runMutation(internal.users.activateSubscription, {
      userId,
      subscriptionPlan: args.subscriptionPlan,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
    });
  },
});
