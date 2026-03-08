import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Internal helpers ──────────────────────────────────────────────────────────

// Fetch a user record by ID (used by notifications.ts actions)
export const getUserById = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId as Id<"users">);
  },
});

// Update the status of a reminder after it has been processed by a notification action
export const updateStatus = internalMutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    userId: v.string(),
    status: v.string(),
    messageSid: v.optional(v.string()),
    emailId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the most recent scheduled/snoozed reminder for this task + user
    const reminder = await ctx.db
      .query("reminders")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();

    if (!reminder) return;

    const patch: Partial<{
      status: string;
      sentAt: number;
      messageSid: string;
      emailId: string;
    }> = { status: args.status };

    if (args.status === "sent") {
      patch.sentAt = Date.now();
    }
    if (args.messageSid !== undefined) {
      patch.messageSid = args.messageSid;
    }
    if (args.emailId !== undefined) {
      patch.emailId = args.emailId;
    }

    await ctx.db.patch(reminder._id, patch);
  },
});

// ─── Public queries ────────────────────────────────────────────────────────────

// List all reminders belonging to the authenticated user
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("reminders")
      .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// List all reminders for a specific maintenance task
export const listByTask = query({
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("reminders")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();
  },
});

// ─── Public mutations ──────────────────────────────────────────────────────────

// Create a new reminder and schedule a notification job for it
export const scheduleReminder = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    channel: v.string(),
    scheduledAt: v.number(),
    taskName: v.string(),
    bikeName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const delayMs = Math.max(0, args.scheduledAt - Date.now());

    // Persist the reminder record first
    const reminderId = await ctx.db.insert("reminders", {
      taskId: args.taskId,
      userId,
      channel: args.channel,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
    });

    // Schedule the notification action to fire after the requested delay
    await ctx.scheduler.runAfter(delayMs, internal.notifications.sendReminder, {
      taskId: args.taskId,
      userId,
      channel: args.channel,
      taskName: args.taskName,
      bikeName: args.bikeName,
    });

    return reminderId;
  },
});

// Cancel a scheduled reminder by marking it as cancelled
export const cancel = mutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) throw new Error("Reminder not found");
    if (reminder.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(args.reminderId, { status: "cancelled" });
  },
});

// Snooze a reminder: mark the current one as snoozed and schedule a new one
export const snooze = mutation({
  args: {
    reminderId: v.id("reminders"),
    snoozeUntil: v.number(),
    taskName: v.string(),
    bikeName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) throw new Error("Reminder not found");
    if (reminder.userId !== userId) throw new Error("Unauthorized");

    // Mark the existing reminder as snoozed
    await ctx.db.patch(args.reminderId, { status: "snoozed" });

    const delayMs = Math.max(0, args.snoozeUntil - Date.now());

    // Persist the rescheduled reminder
    const newReminderId = await ctx.db.insert("reminders", {
      taskId: reminder.taskId,
      userId: reminder.userId,
      channel: reminder.channel,
      scheduledAt: args.snoozeUntil,
      status: "scheduled",
    });

    // Schedule the new notification job
    await ctx.scheduler.runAfter(delayMs, internal.notifications.sendReminder, {
      taskId: reminder.taskId,
      userId: reminder.userId,
      channel: reminder.channel,
      taskName: args.taskName,
      bikeName: args.bikeName,
    });

    return newReminderId;
  },
});
