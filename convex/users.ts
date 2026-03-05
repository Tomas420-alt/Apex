import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// Helper to get user (read-only)
async function getUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .first();
}

// Helper to ensure user exists (for mutations only)
export async function ensureUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .first();

  // Auto-create user if doesn't exist
  if (!user) {
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email,
      name: identity.name,
    });
    user = await ctx.db.get(userId);
  }

  return user;
}

// Get current user
export const getCurrent = query({
  handler: async (ctx) => {
    return await getUser(ctx);
  },
});

// Create or update user from Clerk webhook (internal only - for webhook setup if desired)
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { clerkId, email, name }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { email, name });
      return existing._id;
    } else {
      return await ctx.db.insert("users", { clerkId, email, name });
    }
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const patch: Record<string, unknown> = {};
    if (args.phone !== undefined) patch.phone = args.phone;
    if (args.notificationPreferences !== undefined) {
      patch.notificationPreferences = args.notificationPreferences;
    }

    await ctx.db.patch(user._id, patch);
  },
});

// Update user country (called immediately during onboarding)
export const updateCountry = mutation({
  args: { country: v.string() },
  handler: async (ctx, { country }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      // Auto-create user if doesn't exist yet
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        email: identity.email,
        name: identity.name,
        country,
      });
      return userId;
    }

    await ctx.db.patch(user._id, { country });
  },
});

// Delete user and their data (internal only)
export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) return;

    // Delete all user's bikes
    const bikes = await ctx.db
      .query("bikes")
      .withIndex("by_user", q => q.eq("userId", clerkId))
      .collect();

    for (const bike of bikes) {
      await ctx.db.delete(bike._id);
    }

    // Delete user
    await ctx.db.delete(user._id);
  },
});