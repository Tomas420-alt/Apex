import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ─── Update task statuses based on due dates ─────────────────────────────────
// Runs daily: "due" = due today or tomorrow, "overdue" = past due date
export const updateTaskStatuses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Get all non-completed/skipped tasks
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
      } else if (timeUntilDue <= oneDayMs) {
        // Due today or tomorrow → due
        if (task.status !== "due") {
          await ctx.db.patch(task._id, { status: "due" });
        }
      } else {
        // More than 1 day away → pending
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
      const user = await ctx.runQuery(internal.crons.getUserById, {
        userId: task.userId,
      });
      if (!user) continue;

      // Skip notifications for users without active subscription
      if (user.subscriptionStatus !== 'active') continue;

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

export const getUserById = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId as Id<"users">);
  },
});

export const getBike = internalQuery({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.bikeId);
  },
});

// ─── Push notification helpers ────────────────────────────────────────────────

// Get all active (non-completed) maintenance tasks
export const getAllActiveTasks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("maintenanceTasks").collect();
    return tasks.filter(t => t.status !== "completed" && t.status !== "done");
  },
});

// Check if a task has real parts (not just consumables)
const GENERIC_CONSUMABLES = ['rag', 'rags', 'cleaner', 'lube', 'chain lube', 'wd40', 'wd-40', 'degreaser', 'towel', 'cloth', 'gloves', 'tape'];

export const taskHasRealParts = internalQuery({
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (ctx, { taskId }) => {
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_task", q => q.eq("taskId", taskId))
      .collect();

    if (parts.length === 0) return false;

    // Check if any part is NOT a generic consumable
    return parts.some(p => {
      const name = p.name.toLowerCase();
      return !GENERIC_CONSUMABLES.some(c => name.includes(c));
    });
  },
});

// Check if a specific reminder type has already been sent for a task
export const hasReminderBeenSent = internalQuery({
  args: { taskId: v.id("maintenanceTasks"), reminderType: v.string() },
  handler: async (ctx, { taskId, reminderType }) => {
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_task", q => q.eq("taskId", taskId))
      .collect();
    return reminders.some(r => r.reminderType === reminderType && r.status !== "cancelled");
  },
});

// Record that a reminder was sent
export const recordReminderSent = internalMutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    userId: v.string(),
    reminderType: v.string(),
  },
  handler: async (ctx, { taskId, userId, reminderType }) => {
    await ctx.db.insert("reminders", {
      taskId,
      userId,
      channel: "push",
      scheduledAt: Date.now(),
      sentAt: Date.now(),
      status: "sent",
      reminderType,
    });
  },
});

// ─── Push notification cron action ────────────────────────────────────────────

export const schedulePushReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.runQuery(internal.crons.getAllActiveTasks);
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;

    for (const task of tasks) {
      if (!task.dueDate) continue;
      const dueTime = new Date(task.dueDate).getTime();
      if (isNaN(dueTime)) continue;

      const daysUntilDue = (dueTime - now) / ONE_DAY;

      // Get user
      const user = await ctx.runQuery(internal.crons.getUserById, { userId: task.userId });
      if (!user) continue;
      if (user.subscriptionStatus !== 'active') continue;
      if (!user.expoPushToken) continue;

      const bike = await ctx.runQuery(internal.crons.getBike, { bikeId: task.bikeId });
      const bikeName = bike ? `${bike.make} ${bike.model}` : "your bike";

      // 7 days before — parts reminder (only if task has real parts)
      if (daysUntilDue >= 6 && daysUntilDue <= 8) {
        const hasRealParts = await ctx.runQuery(internal.crons.taskHasRealParts, { taskId: task._id });
        if (hasRealParts) {
          const alreadySent = await ctx.runQuery(internal.crons.hasReminderBeenSent, {
            taskId: task._id, reminderType: "parts_7day",
          });
          if (!alreadySent) {
            await ctx.runAction(internal.notifications.sendPushNotification, {
              pushToken: user.expoPushToken,
              title: "Parts Reminder",
              body: `${task.name} is due in 7 days for your ${bikeName}. Order the necessary parts now.`,
            });
            await ctx.runMutation(internal.crons.recordReminderSent, {
              taskId: task._id, userId: task.userId, reminderType: "parts_7day",
            });
          }
        }
      }

      // 1 day before — due tomorrow
      if (daysUntilDue >= 0 && daysUntilDue <= 2) {
        const alreadySent = await ctx.runQuery(internal.crons.hasReminderBeenSent, {
          taskId: task._id, reminderType: "due_tomorrow",
        });
        if (!alreadySent) {
          await ctx.runAction(internal.notifications.sendPushNotification, {
            pushToken: user.expoPushToken,
            title: "Due Tomorrow",
            body: `${task.name} is due tomorrow for your ${bikeName}. Make sure you're ready.`,
          });
          await ctx.runMutation(internal.crons.recordReminderSent, {
            taskId: task._id, userId: task.userId, reminderType: "due_tomorrow",
          });
        }
      }

      // On due date — due today
      if (daysUntilDue >= -1 && daysUntilDue <= 1) {
        const alreadySent = await ctx.runQuery(internal.crons.hasReminderBeenSent, {
          taskId: task._id, reminderType: "due_today",
        });
        if (!alreadySent) {
          await ctx.runAction(internal.notifications.sendPushNotification, {
            pushToken: user.expoPushToken,
            title: "Due Today",
            body: `${task.name} is due today for your ${bikeName}.`,
          });
          await ctx.runMutation(internal.crons.recordReminderSent, {
            taskId: task._id, userId: task.userId, reminderType: "due_today",
          });
        }
      }
    }
  },
});

// ─── Cron schedule ───────────────────────────────────────────────────────────

const crons = cronJobs();

// Run status updates every day at 6 AM UTC
crons.cron("update task statuses", "0 6 * * *", internal.crons.updateTaskStatuses, {});

// PAUSED: SMS/email reminders — replaced by push notifications
// crons.cron("schedule upcoming reminders", "0 7 * * *", internal.crons.scheduleUpcomingReminders, {});

// Schedule push notifications daily at 9 AM UTC
crons.cron("schedule push reminders", "0 9 * * *", internal.crons.schedulePushReminders, {});

// Clean up old rate limit entries every hour (deletes entries older than 2 hours)
crons.cron("cleanup rate limits", "0 * * * *", internal.rateLimit.cleanupAllOldEntries, {});

export default crons;
