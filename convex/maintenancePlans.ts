import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation: Save a maintenance plan and its tasks to the database
export const savePlan = internalMutation({
  args: {
    bikeId: v.id("bikes"),
    userId: v.string(),
    totalEstimatedCost: v.number(),
    nextServiceDate: v.optional(v.string()),
    tasks: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        intervalKm: v.optional(v.number()),
        intervalMonths: v.optional(v.number()),
        priority: v.string(),
        estimatedCostUsd: v.optional(v.number()),
        estimatedLaborCostUsd: v.optional(v.number()),
        dueDate: v.optional(v.string()),
        dueMileage: v.optional(v.number()),
        partsNeeded: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, { bikeId, userId, totalEstimatedCost, nextServiceDate, tasks }) => {
    // Archive any existing active plans for this bike
    const existingPlans = await ctx.db
      .query("maintenancePlans")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();

    for (const plan of existingPlans) {
      if (plan.status === "active") {
        await ctx.db.patch(plan._id, { status: "archived" });

        // Delete old tasks and their parts
        const oldTasks = await ctx.db
          .query("maintenanceTasks")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect();

        for (const task of oldTasks) {
          // Delete parts for this task
          const oldParts = await ctx.db
            .query("parts")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          for (const part of oldParts) {
            await ctx.db.delete(part._id);
          }
          await ctx.db.delete(task._id);
        }
      }
    }

    // Create the new maintenance plan
    const planId = await ctx.db.insert("maintenancePlans", {
      bikeId,
      userId,
      generatedAt: Date.now(),
      totalEstimatedCost,
      nextServiceDate,
      status: "active",
    });

    // Insert all tasks for this plan
    const insertedTasks: { _id: typeof planId extends any ? any : never; name: string; description?: string; priority: string }[] = [];

    for (const task of tasks) {
      const taskId = await ctx.db.insert("maintenanceTasks", {
        planId,
        bikeId,
        userId,
        name: task.name,
        description: task.description,
        intervalKm: task.intervalKm,
        intervalMonths: task.intervalMonths,
        priority: task.priority,
        status: "pending",
        estimatedCostUsd: task.estimatedCostUsd,
        estimatedLaborCostUsd: task.estimatedLaborCostUsd,
        dueDate: task.dueDate ?? undefined,
        dueMileage: task.dueMileage ?? undefined,
        partsNeeded: task.partsNeeded,
      });

      insertedTasks.push({
        _id: taskId,
        name: task.name,
        description: task.description,
        priority: task.priority,
      });
    }

    return { planId, tasks: insertedTasks };
  },
});

// Query: List all plans for authenticated user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("maintenancePlans")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// Query: Get the active plan for a specific bike
export const getByBike = query({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const plans = await ctx.db
      .query("maintenancePlans")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .order("desc")
      .collect();

    return plans.find((p) => p.status === "active" && p.userId === identity.subject) ?? null;
  },
});

// Mutation: Set plan status to archived
export const archivePlan = mutation({
  args: { planId: v.id("maintenancePlans") },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const plan = await ctx.db.get(planId);
    if (!plan) throw new Error("Plan not found");
    if (plan.userId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.patch(planId, { status: "archived" });
  },
});
