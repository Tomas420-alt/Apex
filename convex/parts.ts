import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    // Check what tools the user already owns (purchased in previous tasks)
    const userId = parts[0]?.userId;
    let ownedToolsLower: string[] = [];
    if (userId) {
      const allUserParts = await ctx.db
        .query("parts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      ownedToolsLower = allUserParts
        .filter((p) => p.purchased && p.category === "tool")
        .map((p) => p.name.toLowerCase());
    }

    const insertedIds: string[] = [];

    for (const part of parts) {
      // Pre-mark tools as purchased if user already owns an equivalent one
      const isOwnedTool =
        part.category === "tool" &&
        ownedToolsLower.some(
          (owned) =>
            part.name.toLowerCase().includes(owned) ||
            owned.includes(part.name.toLowerCase())
        );

      const id = await ctx.db.insert("parts", {
        ...part,
        purchased: isOwnedTool,
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const parts = await ctx.db
      .query("parts")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();

    return parts.filter((p) => p.userId === userId);
  },
});

// Query: Get all parts for a task
export const listByTask = query({
  args: { taskId: v.id("maintenanceTasks") },
  handler: async (ctx, { taskId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const parts = await ctx.db
      .query("parts")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();

    return parts.filter((p) => p.userId === userId);
  },
});

// Mutation: Trigger AI parts generation for a task
export const generateForTask = mutation({
  args: {
    taskId: v.id("maintenanceTasks"),
    bikeId: v.id("bikes"),
  },
  handler: async (ctx, { taskId, bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(bikeId);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== userId) throw new Error("Unauthorized");

    // Look up user's country for localized parts links
    const user = await ctx.db.get(userId);
    const country = (user as any)?.country;

    await ctx.scheduler.runAfter(0, internal.ai.generatePartsList, {
      taskId,
      bikeId,
      userId: userId,
      taskName: task.name,
      taskDescription: task.description,
      make: bike.make,
      model: bike.model,
      year: bike.year,
      country,
    });
  },
});

// Mutation: Toggle purchased status for a part
export const togglePurchased = mutation({
  args: { partId: v.id("parts") },
  handler: async (ctx, { partId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const part = await ctx.db.get(partId);
    if (!part) throw new Error("Part not found");
    if (part.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(partId, { purchased: !part.purchased });
  },
});
