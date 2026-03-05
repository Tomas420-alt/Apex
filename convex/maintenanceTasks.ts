import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Helper: check if a bike still exists
async function bikeExists(ctx: any, bikeId: any): Promise<boolean> {
  const bike = await ctx.db.get(bikeId);
  return bike !== null;
}

// Query: Get all tasks for a plan
export const listByPlan = query({
  args: { planId: v.id("maintenancePlans") },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const tasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    const userTasks = tasks.filter((t) => t.userId === identity.subject);
    const results = [];
    for (const task of userTasks) {
      if (await bikeExists(ctx, task.bikeId)) {
        results.push(task);
      }
    }
    return results;
  },
});

// Query: Get all tasks for a bike
export const listByBike = query({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const tasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();

    return tasks.filter((t) => t.userId === identity.subject);
  },
});

// Query: Get all active tasks (pending, due, overdue) for the user
export const listDue = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const pendingTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "pending")
      )
      .collect();

    const dueTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "due")
      )
      .collect();

    const overdueTasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "overdue")
      )
      .collect();

    const allTasks = [...overdueTasks, ...dueTasks, ...pendingTasks];
    const results = [];
    for (const task of allTasks) {
      if (await bikeExists(ctx, task.bikeId)) {
        results.push(task);
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.patch(taskId, { status });
  },
});

// Mutation: Mark task as completed and set completedAt timestamp
export const complete = mutation({
  args: { id: v.id("maintenanceTasks") },
  handler: async (ctx, { id: taskId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== identity.subject) throw new Error("Unauthorized");

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const completed = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "completed")
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const completed = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "completed")
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const completed = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", identity.subject).eq("status", "completed")
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

// Mutation: Clean up orphaned tasks/plans/parts whose bike no longer exists
export const cleanupOrphaned = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Clean orphaned tasks
    const allTasks = await ctx.db
      .query("maintenanceTasks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const task of allTasks) {
      if (!(await bikeExists(ctx, task.bikeId))) {
        await ctx.db.delete(task._id);
      }
    }

    // Clean orphaned plans
    const allPlans = await ctx.db
      .query("maintenancePlans")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const plan of allPlans) {
      if (!(await bikeExists(ctx, plan.bikeId))) {
        await ctx.db.delete(plan._id);
      }
    }

    // Clean orphaned parts
    const allParts = await ctx.db
      .query("parts")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    for (const part of allParts) {
      if (!(await bikeExists(ctx, part.bikeId))) {
        await ctx.db.delete(part._id);
      }
    }
  },
});
