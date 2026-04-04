import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Find or create a user from Apple Sign In credentials.
// Uses the Apple user ID (sub claim) as the unique identifier.
// Stores it in the authAccounts table for Convex Auth compatibility,
// and creates a user record if one doesn't exist.
export const findOrCreateAppleUser = internalMutation({
  args: {
    appleUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, { appleUserId, email, name }) => {
    // Look for existing auth account with this Apple ID
    const existingAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("provider"), "apple"),
          q.eq(q.field("providerAccountId"), appleUserId),
        )
      )
      .first();

    if (existingAccount) {
      // Check if the user record still exists (might have been deleted)
      const user = await ctx.db.get(existingAccount.userId);
      if (user) {
        // Update name/email if provided (Apple only sends on first sign-in)
        const patch: Record<string, string> = {};
        if (name && !user.name) patch.name = name;
        if (email && !user.email) patch.email = email;
        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(user._id, patch);
        }
        return existingAccount.userId;
      }
      // User was deleted — clean up orphaned auth account and create fresh
      await ctx.db.delete(existingAccount._id);
    }

    // New user — create user record and auth account
    const userId = await ctx.db.insert("users", {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
    });

    // Create auth account linking Apple ID to user
    await ctx.db.insert("authAccounts" as any, {
      userId,
      provider: "apple",
      providerAccountId: appleUserId,
    });

    return userId;
  },
});
