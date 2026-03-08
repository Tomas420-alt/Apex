import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Internal mutations (called by inspection action) ────────────────────────

export const insertItem = internalMutation({
  args: {
    bikeId: v.id("bikes"),
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    responseType: v.string(),
    options: v.optional(v.array(v.string())),
    unit: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("inspectionItems", args);
  },
});

export const setBikeInspectionStatus = internalMutation({
  args: {
    bikeId: v.id("bikes"),
    status: v.string(),
  },
  handler: async (ctx, { bikeId, status }) => {
    await ctx.db.patch(bikeId, { inspectionStatus: status });
  },
});

// ─── Public queries ──────────────────────────────────────────────────────────

// Get all inspection items for a bike
export const listByBike = query({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("inspectionItems")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();

    return items
      .filter((i) => i.userId === userId)
      .sort((a, b) => a.order - b.order);
  },
});

// ─── Public mutations ────────────────────────────────────────────────────────

// Save a user's response to an inspection item
export const saveResponse = mutation({
  args: {
    itemId: v.id("inspectionItems"),
    response: v.string(),
  },
  handler: async (ctx, { itemId, response }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Item not found");
    if (item.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(itemId, { response });
  },
});

// Trigger plan generation: mark inspection complete and generate plan with inspection data
export const completeInspection = mutation({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(bikeId);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    // Get all inspection items with responses
    const items = await ctx.db
      .query("inspectionItems")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();

    const userItems = items.filter((i) => i.userId === userId);

    // Send all inspection items with full context — let the AI judge severity
    const sortedItems = userItems.sort((a, b) => a.order - b.order);

    const formattedItems: string[] = [];
    for (const item of sortedItems) {
      const response = item.response ?? "Not checked";
      let line = `- ${item.name} [${item.category}]: ${response}`;
      if (item.unit) line += ` ${item.unit}`;
      if (item.options && item.options.length > 0) {
        line += ` (options were: ${item.options.join(", ")})`;
      }
      formattedItems.push(line);
    }

    const inspectionSummary = formattedItems.length > 0
      ? `USER INSPECTION RESULTS — each item below shows what the user reported:\n${formattedItems.join("\n")}`
      : "No inspection data available.";

    // Mark inspection as complete
    await ctx.db.patch(bikeId, { inspectionStatus: "complete" });

    // Look up user's country
    const user = await ctx.db.get(userId);

    // Generate the plan
    await ctx.scheduler.runAfter(0, internal.ai.generateMaintenancePlan, {
      bikeId,
      userId,
      make: bike.make,
      model: bike.model,
      year: bike.year,
      mileage: bike.mileage,
      lastServiceDate: bike.lastServiceDate,
      lastServiceMileage: bike.lastServiceMileage,
      country: user?.country,
      ridingStyle: bike.ridingStyle,
      annualMileage: bike.annualMileage,
      climate: bike.climate,
      storageType: bike.storageType,
      inspectionData: inspectionSummary,
    });
  },
});

// TEMP: Reset a bike for inspection testing — deletes plan, tasks, parts, inspection items
export const resetForInspection = mutation({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(bikeId);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    // Delete all plans for this bike
    const plans = await ctx.db
      .query("maintenancePlans")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();
    for (const plan of plans) {
      await ctx.db.delete(plan._id);
    }

    // Delete all tasks for this bike
    const tasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Delete all parts for this bike
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();
    for (const part of parts) {
      await ctx.db.delete(part._id);
    }

    // Delete existing inspection items
    const inspItems = await ctx.db
      .query("inspectionItems")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();
    for (const item of inspItems) {
      await ctx.db.delete(item._id);
    }

    // Clear service history and inspection status on the bike
    await ctx.db.patch(bikeId, {
      lastServiceDate: undefined,
      lastServiceMileage: undefined,
      inspectionStatus: undefined,
    });
  },
});

// Start the inspection: called from bike detail to kick off checklist generation
export const startInspection = mutation({
  args: { bikeId: v.id("bikes") },
  handler: async (ctx, { bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(bikeId);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    // Delete any existing inspection items (in case of retry after error)
    const existing = await ctx.db
      .query("inspectionItems")
      .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
      .collect();
    for (const item of existing) {
      if (item.userId === userId) {
        await ctx.db.delete(item._id);
      }
    }

    // Set pending immediately so UI shows loading
    await ctx.db.patch(bikeId, { inspectionStatus: "pending" });

    await ctx.scheduler.runAfter(0, internal.inspection.generateChecklist, {
      bikeId,
      userId,
      make: bike.make,
      model: bike.model,
      year: bike.year,
      mileage: bike.mileage,
      notes: bike.notes,
    });
  },
});
