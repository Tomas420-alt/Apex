import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Internal mutation: Bulk save parts
export const saveParts = internalMutation({
  args: {
    parts: v.array(
      v.object({
        taskId: v.optional(v.id("maintenanceTasks")),
        bikeId: v.id("bikes"),
        userId: v.string(),
        name: v.string(),
        partNumber: v.optional(v.string()),
        estimatedPrice: v.optional(v.number()),
        supplier: v.optional(v.string()),
        url: v.optional(v.string()),
        category: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { parts }) => {
    // Delete existing parts for this task before inserting new ones
    if (parts.length > 0 && parts[0].taskId) {
      const existing = await ctx.db
        .query("parts")
        .withIndex("by_task", (q) => q.eq("taskId", parts[0].taskId!))
        .collect();
      for (const old of existing) {
        await ctx.db.delete(old._id);
      }
    }

    const insertedIds: string[] = [];

    for (const part of parts) {
      const id = await ctx.db.insert("parts", {
        ...part,
        purchased: false,
      });
      insertedIds.push(id);
    }

    // Update the task's estimatedCostUsd to match actual parts prices
    // (required + consumable only, excluding tools)
    if (parts.length > 0 && parts[0].taskId) {
      const partsCost = parts
        .filter((p) => p.category !== "tool")
        .reduce((sum, p) => sum + (p.estimatedPrice ?? 0), 0);

      if (partsCost > 0) {
        await ctx.db.patch(parts[0].taskId, {
          estimatedCostUsd: Math.round(partsCost * 100) / 100,
        });
      }
    }

    return insertedIds;
  },
});

// Query: Get all parts for a bike
export const listByBike = query({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const parts = await ctx.db
      .query("parts")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();

    return parts.filter((p) => p.userId === identity.subject);
  },
});

// Query: Get all parts for a task
export const listByTask = query({
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (ctx, { taskId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const parts = await ctx.db
      .query("parts")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();

    return parts.filter((p) => p.userId === identity.subject);
  },
});

// Mutation: Trigger AI parts generation for a task
export const generateForTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    bikeId: v.id("bikes"),
  },
  handler: async (ctx, { taskId, bikeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const bike = await ctx.db.get(bikeId);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== identity.subject) throw new Error("Unauthorized");

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== identity.subject) throw new Error("Unauthorized");

    await ctx.scheduler.runAfter(0, internal.ai.generatePartsList, {
      taskId,
      bikeId,
      userId: identity.subject,
      taskName: task.name,
      taskDescription: task.description,
      make: bike.make,
      model: bike.model,
      year: bike.year,
    });
  },
});

// Mutation: Toggle purchased status for a part
export const togglePurchased = mutation({
  args: { partId: v.id("parts") },
  handler: async (ctx, { partId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const part = await ctx.db.get(partId);
    if (!part) throw new Error("Part not found");
    if (part.userId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.patch(partId, { purchased: !part.purchased });
  },
});
