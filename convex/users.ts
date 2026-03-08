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
