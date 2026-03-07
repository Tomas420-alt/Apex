import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ─── Update task statuses based on due dates ─────────────────────────────────
// Runs daily: sets tasks to "due" (within 14 days) or "overdue" (past due date)
export const updateTaskStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    // Get all pending tasks
    const pendingTasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "due"),
        )
      )
      .collect();

    for (const task of pendingTasks) {
      if (!task.dueDate) continue;

      const dueTime = new Date(task.dueDate).getTime();
      if (isNaN(dueTime)) continue;

      const timeUntilDue = dueTime - now;

      if (timeUntilDue < 0) {
        // Past due date → overdue
        if (task.status !== "overdue") {
          await ctx.db.patch(task._id, { status: "overdue" });
        }
      } else if (timeUntilDue <= fourteenDaysMs) {
        // Within 14 days → due
        if (task.status !== "due") {
          await ctx.db.patch(task._id, { status: "due" });
        }
      } else {
        // More than 14 days away → keep/set as pending
        if (task.status !== "pending") {
          await ctx.db.patch(task._id, { status: "pending" });
        }
      }
    }
  },
});

// ─── Schedule reminder notifications 7 days before due ───────────────────────
// Runs daily: for tasks due in ~7 days, schedule reminder if not already sent
export const scheduleUpcomingReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const tasksToRemind = await ctx.runQuery(internal.crons.getTasksDueSoon);

    for (const task of tasksToRemind) {
      // Check if a reminder was already scheduled/sent for this task
      const existingReminder = await ctx.runQuery(
        internal.crons.getReminderForTask,
        { taskId: task._id }
      );
      if (existingReminder) continue;

      // Get the user's notification preferences
      const user = await ctx.runQuery(internal.crons.getUserByClerkId, {
        clerkId: task.userId,
      });
      if (!user) continue;

      const prefs = user.notificationPreferences;
      if (!prefs) continue;

      // Get bike name for the notification
      const bike = await ctx.runQuery(internal.crons.getBike, {
        bikeId: task.bikeId,
      });
      const bikeName = bike ? `${bike.make} ${bike.model}` : "your bike";

      // Schedule SMS reminder
      if (prefs.sms && user.phone) {
        await ctx.runAction(internal.notifications.sendReminder, {
          taskId: task._id,
          userId: task.userId,
          channel: "sms",
          taskName: task.name,
          bikeName,
        });
      }

      // Schedule email reminder
      if (prefs.email && user.email) {
        await ctx.runAction(internal.notifications.sendReminder, {
          taskId: task._id,
          userId: task.userId,
          channel: "email",
          taskName: task.name,
          bikeName,
        });
      }
    }
  },
});

// ─── Internal queries for the cron ───────────────────────────────────────────

// Get tasks that are due within 6-8 days (the 7-day window, checked daily)
export const getTasksDueSoon = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000;

    const tasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "due"),
        )
      )
      .collect();

    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueTime = new Date(task.dueDate).getTime();
      if (isNaN(dueTime)) return false;
      const timeUntilDue = dueTime - now;
      return timeUntilDue >= sixDaysMs && timeUntilDue <= eightDaysMs;
    });
  },
});

// Check if a reminder already exists for a task (any status except cancelled)
export const getReminderForTask = internalQuery({
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (ctx, args) => {
    const reminder = await ctx.db
      .query("reminders")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();

    if (!reminder) return null;
    if (reminder.status === "cancelled") return null;
    return reminder;
  },
});

export const getUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const getBike = internalQuery({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bikeId);
  },
});

// ─── Cron schedule ───────────────────────────────────────────────────────────

const crons = cronJobs();

// Run status updates every day at 6 AM UTC
crons.cron("update task statuses", "0 6 * * *", internal.crons.updateTaskStatuses, {});

// Run reminder scheduling every day at 7 AM UTC (after statuses are updated)
crons.cron("schedule upcoming reminders", "0 7 * * *", internal.crons.scheduleUpcomingReminders, {});

export default crons;
