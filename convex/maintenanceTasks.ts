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

// Query: Get all tasks for a bike (from active plan + manual tasks)
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

    // Get plan-based tasks if there's an active plan
    const planTasks = activePlan
      ? await ctx.db
          .query("maintenanceTasks")
          .withIndex("by_plan", (q) => q.eq("planId", activePlan._id))
          .collect()
      : [];

    // Also get manual tasks (no planId) for this bike
    const allBikeTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();
    const manualTasks = allBikeTasks.filter(
      (t) => !t.planId && t.userId === userId
    );

    // Combine and deduplicate
    const taskIds = new Set(planTasks.map((t) => t._id));
    const combined = [...planTasks.filter((t) => t.userId === userId)];
    for (const mt of manualTasks) {
      if (!taskIds.has(mt._id)) combined.push(mt);
    }

    return combined;
  },
});

// Query: Get tasks that are due within 7 days or overdue
// Only includes tasks from active plans
export const listDue = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

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
      if (task.planId && !activePlanIds.has(task.planId)) continue;
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
            } else if (timeUntilDue <= sevenDaysMs) {
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

      // Only include tasks that are due soon (within 7 days) or overdue
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

// Mutation: Complete a task, log to history, and advance recurring tasks to next due date
export const completeAndAdvance = mutation({
  args: { id: v.id("maintenanceTasks") },
  handler: async (ctx, { id: taskId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Unauthorized");

    const now = Date.now();

    // 1. Log completion to history
    await ctx.db.insert("completionHistory", {
      taskId,
      bikeId: task.bikeId,
      userId,
      taskName: task.name,
      completedAt: now,
      dueDate: task.dueDate,
      estimatedLaborCostUsd: task.estimatedLaborCostUsd,
      estimatedCostUsd: task.estimatedCostUsd,
    });

    // 2. Check if recurring
    const hasInterval = task.intervalMonths && task.intervalMonths > 0;

    if (hasInterval) {
      // Advance due date to next occurrence
      const baseDueDate = task.dueDate ?? new Date().toISOString().slice(0, 10);
      const nextDueDate = addMonthsToDate(baseDueDate, task.intervalMonths!);
      // Also advance dueMileage if set
      const nextDueMileage = task.dueMileage && task.intervalKm
        ? task.dueMileage + task.intervalKm
        : task.dueMileage;

      await ctx.db.patch(taskId, {
        status: "pending",
        dueDate: nextDueDate,
        dueMileage: nextDueMileage,
        completedAt: undefined,
      });

      return { advanced: true, nextDueDate };
    } else {
      // One-off task — mark completed permanently
      await ctx.db.patch(taskId, {
        status: "completed",
        completedAt: now,
      });

      return { advanced: false };
    }
  },
});

// Query: Get completion history for a bike
export const listCompletionHistory = query({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const history = await ctx.db
      .query("completionHistory")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();

    return history
      .filter((h) => h.userId === userId)
      .sort((a, b) => b.completedAt - a.completedAt);
  },
});

// Query: Get ALL completion history for all user's bikes
export const listAllCompletionHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const history = await ctx.db
      .query("completionHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return history.sort((a, b) => b.completedAt - a.completedAt);
  },
});

// Mutation: Manually add a maintenance task (free users)
export const addManual = mutation({
  args: {
    bikeId: v.id("bikes"),
    name: v.string(),
    description: v.optional(v.string()),
    priority: v.string(),
    dueDate: v.optional(v.string()),
    dueMileage: v.optional(v.number()),
    intervalKm: v.optional(v.number()),
    intervalMonths: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Input validation
    if (args.name.trim().length === 0) throw new Error("Task name is required");
    if (args.name.length > 200) throw new Error("Task name too long (max 200 characters)");
    if (args.description !== undefined && args.description.length > 1000) throw new Error("Description too long (max 1000 characters)");
    const validPriorities = ["low", "medium", "high", "critical"];
    if (!validPriorities.includes(args.priority)) {
      throw new Error("Invalid priority (must be low, medium, high, or critical)");
    }
    if (args.dueMileage !== undefined && (args.dueMileage < 0 || args.dueMileage > 999999)) {
      throw new Error("Invalid due mileage (must be 0–999999)");
    }
    if (args.intervalKm !== undefined && (args.intervalKm < 0 || args.intervalKm > 999999)) {
      throw new Error("Invalid interval km (must be 0–999999)");
    }
    if (args.intervalMonths !== undefined && (args.intervalMonths < 0 || args.intervalMonths > 120)) {
      throw new Error("Invalid interval months (must be 0–120)");
    }

    const bike = await ctx.db.get(args.bikeId);
    if (!bike || bike.userId !== userId) throw new Error("Bike not found");

    // Normalize dueDate to YYYY-MM-DD format (handles 2026/3/27, 2026-3-27, etc.)
    let normalizedDueDate: string | undefined;
    if (args.dueDate) {
      const parsed = new Date(args.dueDate);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        normalizedDueDate = `${y}-${m}-${d}`;
      }
    }

    // Compute initial status based on dueDate
    let status: "pending" | "due" | "overdue" = "pending";
    if (normalizedDueDate) {
      const now = Date.now();
      const dueTime = new Date(normalizedDueDate).getTime();
      if (!isNaN(dueTime)) {
        const timeUntilDue = dueTime - now;
        if (timeUntilDue < 0) {
          status = "overdue";
        } else if (timeUntilDue <= 14 * 24 * 60 * 60 * 1000) {
          status = "due";
        }
      }
    }

    return await ctx.db.insert("maintenanceTasks", {
      bikeId: args.bikeId,
      userId,
      name: args.name,
      description: args.description,
      priority: args.priority,
      status,
      dueDate: normalizedDueDate,
      dueMileage: args.dueMileage,
      intervalKm: args.intervalKm,
      intervalMonths: args.intervalMonths,
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

// Query: Yearly stats for progress bars — uses recurring task projection (same as calendar)
// to count ALL task occurrences through end of year, not just single DB records
export const yearlyStats = query({
  args: { bikeId: v.optional(v.id("bikes")) },
  handler: async (ctx, { bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { completedThisYear: 0, totalThisYear: 0, savedThisYear: 0, projectedSavings: 0, partsSpentThisYear: 0, projectedPartsCost: 0, mechanicCostThisYear: 0 };

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const yearEnd = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);

    // Get all tasks for this user (optionally filtered by bike)
    const allTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
      .collect();

    const relevantTasks = bikeId
      ? allTasks.filter((t) => t.bikeId === bikeId)
      : allTasks;

    // ── Completed this year (from completion history, not task status) ──
    const allHistory = await ctx.db
      .query("completionHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const historyThisYear = allHistory.filter((h) => {
      if (bikeId && h.bikeId !== bikeId) return false;
      return new Date(h.completedAt).getFullYear() === now.getFullYear();
    });

    const completedThisYearCount = historyThisYear.length;

    const savedThisYear = historyThisYear.reduce(
      (sum, h) => sum + (h.estimatedLaborCostUsd ?? 0), 0
    );
    const partsSpentThisYear = historyThisYear.reduce(
      (sum, h) => sum + (h.estimatedCostUsd ?? 0), 0
    );

    // ── Project all task occurrences through end of year (including recurring) ──
    let totalOccurrences = 0;
    let projectedLaborTotal = 0;
    let projectedPartsTotal = 0;

    for (const task of relevantTasks) {
      if (!task.dueDate) continue;
      // Skip completed/skipped tasks from projection — count them separately
      const isActive = task.status !== "completed" && task.status !== "skipped";

      // Count original occurrence if it falls in this year
      if (task.dueDate >= yearStart && task.dueDate <= yearEnd) {
        totalOccurrences++;
        if (isActive) {
          projectedLaborTotal += task.estimatedLaborCostUsd ?? 0;
          projectedPartsTotal += task.estimatedCostUsd ?? 0;
        }
      }

      // Project recurring occurrences through year end
      const interval = task.intervalMonths && task.intervalMonths > 0
        ? task.intervalMonths
        : 0; // 0 = non-recurring, don't project
      if (interval > 0) {
        const maxOccurrences = interval < 1 ? 60 : 24;
        for (let occ = 1; occ <= maxOccurrences; occ++) {
          const projectedDate = addMonthsToDate(task.dueDate, interval * occ);
          if (projectedDate > yearEnd) break;
          if (projectedDate >= yearStart) {
            totalOccurrences++;
            projectedLaborTotal += task.estimatedLaborCostUsd ?? 0;
            projectedPartsTotal += task.estimatedCostUsd ?? 0;
          }
        }
      }
    }

    // Add completed-this-year to totals (from history, not task projections)
    totalOccurrences += completedThisYearCount;
    projectedLaborTotal += savedThisYear;
    projectedPartsTotal += partsSpentThisYear;

    // Mechanic cost = all labor + all parts for the year
    const mechanicCostThisYear = projectedLaborTotal + projectedPartsTotal;

    return {
      completedThisYear: completedThisYearCount,
      totalThisYear: totalOccurrences,
      savedThisYear,
      projectedSavings: projectedLaborTotal,
      partsSpentThisYear,
      projectedPartsCost: projectedPartsTotal,
      mechanicCostThisYear,
    };
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

    // Helper: compute real-time status for a due date
    const computeStatus = (dueDateStr: string) => {
      const dueTime = new Date(dueDateStr).getTime();
      if (isNaN(dueTime)) return "pending";
      if (dueTime < now) return "overdue";
      if (dueTime - now <= 7 * 86400000) return "due";
      return "pending";
    };

    // Helper: process a task and add it (+ recurring projections) to results
    const processTask = (task: { _id: any; name: string; priority: string; status: string; dueDate?: string; intervalMonths?: number; bikeId: any; userId: any }) => {
      if (task.userId !== userId) return;
      if (!task.dueDate) return;

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
        const maxOccurrences = isSubMonthly ? 60 : 24;
        while (occurrence <= maxOccurrences) {
          const projectedDate = addMonthsToDate(
            task.dueDate,
            interval * occurrence,
            isSubMonthly,
          );

          if (projectedDate > endDate) break;

          if (projectedDate >= startDate) {
            const projectedPriority =
              task.priority === "critical" || task.priority === "high"
                ? "medium"
                : task.priority;

            results.push({
              _id: `${task._id}_r${occurrence}`,
              name: task.name,
              priority: projectedPriority,
              status: computeStatus(projectedDate),
              dueDate: projectedDate,
              bikeId: task.bikeId,
            });
          }

          occurrence++;
        }
      }
    };

    for (const bike of bikes) {
      const activePlan = allPlans.find(
        (p) => p.bikeId === bike._id && p.status === "active"
      );

      // Get plan-based tasks if there's an active plan
      if (activePlan) {
        const tasks = await ctx.db
          .query("maintenanceTasks")
          .withIndex("by_plan", (q) => q.eq("planId", activePlan._id))
          .collect();

        for (const task of tasks) {
          processTask(task);
        }
      }

      // Also include manual tasks (no planId) for this bike
      const allBikeTasks = await ctx.db
        .query("maintenanceTasks")
        .withIndex("by_bike", (q) => q.eq("bikeId", bike._id))
        .collect();
      const manualTasks = allBikeTasks.filter(
        (t) => !t.planId && t.userId === userId
      );

      for (const task of manualTasks) {
        if (task.dueDate) {
          processTask(task);
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
