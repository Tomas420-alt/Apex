import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to get user (read-only)
async function getUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  return await ctx.db.get(userId);
}

// Helper to ensure user exists (for mutations only)
export async function ensureUser(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;

  return await ctx.db.get(userId);
}

// Get current user
export const getCurrent = query({
  handler: async (ctx) => {
    return await getUser(ctx);
  },
});

// Update user notification preferences and phone number
export const updatePreferences = mutation({
  args: {
    phone: v.optional(v.string()),
    notificationPreferences: v.optional(
      v.object({
        push: v.boolean(),
        sms: v.boolean(),
        email: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const patch: Record<string, unknown> = {};
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.notificationPreferences !== undefined) {
      patch.notificationPreferences = args.notificationPreferences;
    }

    await ctx.db.patch(userId, patch);
  },
});

// Update user country (called immediately during onboarding)
export const updateCountry = mutation({
  args: { country: v.string() },
  handler: async (ctx, { country }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(userId, { country });
  },
});

// Update subscription status (called after payment confirmation)
export const updateSubscription = mutation({
  args: {
    subscriptionStatus: v.string(),
    subscriptionPlan: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(userId, {
      subscriptionStatus: args.subscriptionStatus,
      subscriptionPlan: args.subscriptionPlan,
      subscriptionExpiresAt: args.subscriptionExpiresAt,
    });
  },
});

// Update user profile image from storage
export const updateProfileImageFromStorage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) throw new Error("Failed to get image URL");

    await ctx.db.patch(userId, { image: imageUrl });
  },
});

// Reset subscription (internal — for testing only)
export const resetSubscription = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", q => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      subscriptionStatus: undefined,
      subscriptionPlan: undefined,
      subscriptionExpiresAt: undefined,
    });
  },
});

// Delete user by email (internal — for testing only)
export const deleteByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", q => q.eq("email", email))
      .first();
    if (!user) throw new Error("User not found");

    // Delete auth sessions/accounts linked to this user
    const authSessions = await ctx.db
      .query("authSessions")
      .filter(q => q.eq(q.field("userId"), user._id))
      .collect();
    for (const session of authSessions) {
      await ctx.db.delete(session._id);
    }
    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter(q => q.eq(q.field("userId"), user._id))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    // Delete bikes and related data
    const bikes = await ctx.db
      .query("bikes")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();
    for (const bike of bikes) {
      await ctx.db.delete(bike._id);
    }

    await ctx.db.delete(user._id);
  },
});

// Delete user and their data (internal only)
export const deleteUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return;

    // Delete all user's bikes
    const bikes = await ctx.db
      .query("bikes")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();

    for (const bike of bikes) {
      await ctx.db.delete(bike._id);
    }

    // Delete user
    await ctx.db.delete(userId);
  },
});
