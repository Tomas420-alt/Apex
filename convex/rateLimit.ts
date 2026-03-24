import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Simple rate limiting using a dedicated table.
 * Checks if a user has exceeded N calls for a given action within a time window.
 */

// Check how many times a user has performed an action within the given window (ms)
export const checkRateLimit = internalQuery({
  args: {
    userId: v.string(),
    action: v.string(),
    windowMs: v.number(),
  },
  handler: async (ctx, { userId, action, windowMs }) => {
    const cutoff = Date.now() - windowMs;
    const entries = await ctx.db
      .query("rateLimits")
      .withIndex("by_user_action", (q) =>
        q.eq("userId", userId).eq("action", action)
      )
      .collect();

    // Count entries within the time window
    const recentCount = entries.filter((e) => e.timestamp >= cutoff).length;
    return recentCount;
  },
});

// Record that a user performed an action (insert a timestamp entry)
export const recordAction = internalMutation({
  args: {
    userId: v.string(),
    action: v.string(),
  },
  handler: async (ctx, { userId, action }) => {
    await ctx.db.insert("rateLimits", {
      userId,
      action,
      timestamp: Date.now(),
    });
  },
});

// Clean up old rate limit entries (older than the given window)
export const cleanupOldEntries = internalMutation({
  args: {
    action: v.string(),
    windowMs: v.number(),
  },
  handler: async (ctx, { action, windowMs }) => {
    const cutoff = Date.now() - windowMs;
    const allEntries = await ctx.db
      .query("rateLimits")
      .collect();

    const oldEntries = allEntries.filter(
      (e) => e.action === action && e.timestamp < cutoff
    );

    for (const entry of oldEntries) {
      await ctx.db.delete(entry._id);
    }
  },
});

// Clean up ALL rate limit entries older than 2 hours — called by cron
export const cleanupAllOldEntries = internalMutation({
  args: {},
  handler: async (ctx) => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const allEntries = await ctx.db
      .query("rateLimits")
      .collect();

    let deleted = 0;
    for (const entry of allEntries) {
      if (entry.timestamp < twoHoursAgo) {
        await ctx.db.delete(entry._id);
        deleted++;
      }
    }
  },
});
