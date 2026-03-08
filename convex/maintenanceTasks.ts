import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper: check if a bike still exists
async function bikeExists(ctx: any, bikeId: any): Promise<boolean> {
  const bike = await ctx.db.get(bikeId);
  return bike !== null;
}

// Query: Get all tasks for a plan
export const listByPlan = query({
  args: { planId: v.id("maintenancePlans") },
  handler: async (ctx, { planId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    const userTasks = tasks.filter((t) => t.userId === userId);
    const results = [];
    for (const task of userTasks) {
      if (await bikeExists(ctx, task.bikeId)) {
        results.push(task);
      }
    }
    return results;
  },
});

// Query: Get all tasks for a bike (only from the active plan)
export const listByBike = query({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find the active plan for this bike
    const plans = await ctx.db
      .query("maintenancePlans")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();
    const activePlan = plans.find(
      (p) => p.status === "active" && p.userId === userId
    );
    if (!activePlan) return [];

    const tasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_plan", (q) => q.eq("planId", activePlan._id))
      .collect();

    return tasks.filter((t) => t.userId === userId);
  },
});

// Query: Get tasks that are due within 14 days or overdue
// Only includes tasks from active plans
export const listDue = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

    // Get active plan IDs to filter tasks
    const allPlans = await ctx.db
      .query("maintenancePlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const activePlanIds = new Set(
      allPlans.filter((p) => p.status === "active").map((p) => p._id)
    );

    const pendingTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "pending")
      )
      .collect();

    const dueTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "due")
      )
      .collect();

    const overdueTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "overdue")
      )
      .collect();

    const allTasks = [...overdueTasks, ...dueTasks, ...pendingTasks];
    const results = [];
    for (const task of allTasks) {
      if (!activePlanIds.has(task.planId)) continue;
      if (!(await bikeExists(ctx, task.bikeId))) continue;

      // Compute real-time status from dueDate
      let computedStatus = task.status;
      if (task.status !== "completed" && task.status !== "skipped") {
        if (!task.dueDate) {
          // No due date → treat as "due" (show it, since we can't determine timing)
          computedStatus = "due";
        } else {
          const dueTime = new Date(task.dueDate).getTime();
          if (!isNaN(dueTime)) {
            const timeUntilDue = dueTime - now;
            if (timeUntilDue < 0) {
              computedStatus = "overdue";
            } else if (timeUntilDue <= fourteenDaysMs) {
              computedStatus = "due";
            } else {
              computedStatus = "pending";
            }
          } else {
            // Invalid date string → treat as "due"
            computedStatus = "due";
          }
        }
      }

      // Only include tasks that are due soon (within 14 days) or overdue
      if (computedStatus === "due" || computedStatus === "overdue") {
        results.push({ ...task, status: computedStatus });
      }
    }
    return results;
  },
});

// Mutation: Update task status
export const updateStatus = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    status: v.union(
      v.literal("pending"),
      v.literal("due"),
      v.literal("overdue"),
      v.literal("completed"),
      v.literal("skipped")
    ),
  },
  handler: async (ctx, { taskId, status }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(taskId, { status });
  },
});

// Mutation: Mark task as completed and set completedAt timestamp
export const complete = mutation({
  args: { id: v.id("maintenanceTasks") },
  handler: async (ctx, { id: taskId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(taskId, {
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

// Query: Get recently completed tasks (last 10)
export const listRecentlyCompleted = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const completed = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "completed")
      )
      .collect();

    const withBike = [];
    for (const task of completed) {
      if (await bikeExists(ctx, task.bikeId)) {
        withBike.push(task);
      }
    }

    return withBike
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, 10);
  },
});

// Query: Count of completed tasks
export const countCompleted = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const completed = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "completed")
      )
      .collect();

    let count = 0;
    for (const task of completed) {
      if (await bikeExists(ctx, task.bikeId)) {
        count++;
      }
    }
    return count;
  },
});

// Query: Total labor savings across all completed tasks
export const totalSavings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const completed = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", "completed")
      )
      .collect();

    let total = 0;
    for (const task of completed) {
      if (await bikeExists(ctx, task.bikeId)) {
        total += task.estimatedLaborCostUsd ?? 0;
      }
    }
    return total;
  },
});

// Helper: snap a date to the nearest Saturday
function snapToSaturday(d: Date): Date {
  const dow = d.getUTCDay(); // 0=Sun, 6=Sat
  if (dow === 6) return d; // already Saturday
  if (dow === 0) {
    // Sunday → go back 1 day to Saturday
    d.setUTCDate(d.getUTCDate() - 1);
  } else {
    // Mon-Fri → go forward to Saturday
    d.setUTCDate(d.getUTCDate() + (6 - dow));
  }
  return d;
}

// Helper: add months to a date string, supporting fractional months (0.5 = ~2 weeks)
// Sub-monthly intervals snap to the nearest Saturday (weekend tasks)
function addMonthsToDate(isoDate: string, months: number, snapWeekend = false): string {
  const d = new Date(isoDate + "T00:00:00Z");
  if (months >= 1 && Number.isInteger(months)) {
    d.setUTCMonth(d.getUTCMonth() + months);
  } else {
    // Fractional months — convert to days (30.44 avg days/month)
    const days = Math.round(months * 30.44);
    d.setUTCDate(d.getUTCDate() + days);
  }
  // Snap sub-monthly projected tasks to Saturday
  if (snapWeekend) snapToSaturday(d);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Query: Get ALL tasks with due dates for calendar display (from full maintenance plans)
// Projects recurring tasks into the future based on intervalMonths so the calendar never runs out
export const listForCalendar = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();

    // Get all user's bikes
    const bikes = await ctx.db
      .query("bikes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get active plan IDs only
    const allPlans = await ctx.db
      .query("maintenancePlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const activePlanIds = new Set(
      allPlans.filter((p) => p.status === "active").map((p) => p._id)
    );

    const results: Array<{
      _id: string;
      name: string;
      priority: string;
      status: string;
      dueDate: string;
      bikeId: string;
    }> = [];

    for (const bike of bikes) {
      // Find the active plan for this bike
      const activePlan = allPlans.find(
        (p) => p.bikeId === bike._id && p.status === "active"
      );
      if (!activePlan) continue;

      // Get tasks for active plan only
      const tasks = await ctx.db
        .query("maintenanceTasks")
        .withIndex("by_plan", (q) => q.eq("planId", activePlan._id))
        .collect();

      for (const task of tasks) {
        if (task.userId !== userId) continue;
        if (!task.dueDate) continue;

        // Compute real-time status for the original due date
        const computeStatus = (dueDateStr: string) => {
          const dueTime = new Date(dueDateStr).getTime();
          if (isNaN(dueTime)) return "pending";
          if (dueTime < now) return "overdue";
          if (dueTime - now <= 14 * 86400000) return "due";
          return "pending";
        };

        // Add the original task if it falls in range
        if (task.dueDate >= startDate && task.dueDate <= endDate) {
          let computedStatus = task.status;
          if (task.status !== "completed" && task.status !== "skipped") {
            computedStatus = computeStatus(task.dueDate);
          }

          results.push({
            _id: task._id,
            name: task.name,
            priority: task.priority,
            status: computedStatus,
            dueDate: task.dueDate,
            bikeId: task.bikeId,
          });
        }

        // Project future recurring occurrences based on intervalMonths
        // Default to 12 months if no interval set (annual re-check)
        const interval = task.intervalMonths && task.intervalMonths > 0
          ? task.intervalMonths
          : 12;
        const isSubMonthly = interval < 1;
        {
          let occurrence = 1;
          // Safety limit: more occurrences for sub-monthly tasks
          const maxOccurrences = isSubMonthly ? 60 : 24;
          while (occurrence <= maxOccurrences) {
            const projectedDate = addMonthsToDate(
              task.dueDate,
              interval * occurrence,
              isSubMonthly, // snap sub-monthly to Saturday
            );

            // Past the end of our range — stop
            if (projectedDate > endDate) break;

            // Only include if within requested range
            if (projectedDate >= startDate) {
              results.push({
                _id: `${task._id}_r${occurrence}`,
                name: task.name,
                priority: task.priority,
                status: computeStatus(projectedDate),
                dueDate: projectedDate,
                bikeId: task.bikeId,
              });
            }

            occurrence++;
          }
        }
      }
    }

    return results;
  },
});

// Mutation: Clean up orphaned tasks/plans/parts whose bike no longer exists
export const cleanupOrphaned = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Clean orphaned tasks
    const allTasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    for (const task of allTasks) {
      if (!(await bikeExists(ctx, task.bikeId))) {
        await ctx.db.delete(task._id);
      }
    }

    // Clean orphaned plans
    const allPlans = await ctx.db
      .query("maintenancePlans")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    for (const plan of allPlans) {
      if (!(await bikeExists(ctx, plan.bikeId))) {
        await ctx.db.delete(plan._id);
      }
    }

    // Clean orphaned parts
    const allParts = await ctx.db
      .query("parts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    for (const part of allParts) {
      if (!(await bikeExists(ctx, part.bikeId))) {
        await ctx.db.delete(part._id);
      }
    }
  },
});
