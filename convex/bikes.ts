import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ensureUser } from "./users";

// Get all bikes for authenticated user
export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("bikes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get a single bike by id (verify user owns it)
export const get = query({
  args: { id: v.id("bikes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const bike = await ctx.db.get(id);
    if (!bike) return null;
    if (bike.userId !== userId) return null;

    return bike;
  },
});

// Add a new bike
export const add = mutation({
  args: {
    make: v.string(),
    model: v.string(),
    year: v.number(),
    mileage: v.number(),
    imageUrl: v.optional(v.string()),
    lastServiceDate: v.optional(v.string()),
    lastServiceMileage: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ensureUser(ctx);

    return await ctx.db.insert("bikes", {
      userId,
      make: args.make,
      model: args.model,
      year: args.year,
      mileage: args.mileage,
      imageUrl: args.imageUrl,
      lastServiceDate: args.lastServiceDate,
      lastServiceMileage: args.lastServiceMileage,
      notes: args.notes,
    });
  },
});

// Update bike fields (partial update)
export const update = mutation({
  args: {
    id: v.id("bikes"),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    mileage: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    lastServiceDate: v.optional(v.string()),
    lastServiceMileage: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(id);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    // Build patch object with only defined fields
    const patch: Partial<typeof fields> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        (patch as Record<string, unknown>)[key] = value;
      }
    }

    await ctx.db.patch(id, patch);
  },
});

// Delete a bike and all associated plans, tasks, and parts
export const remove = mutation({
  args: { id: v.id("bikes") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(id);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    // Delete all parts for this bike
    const parts = await ctx.db
      .query("parts")
      .withIndex("by_bike", (q) => q.eq("bikeId", id))
      .collect();
    for (const part of parts) {
      await ctx.db.delete(part._id);
    }

    // Delete all maintenance tasks for this bike
    const tasks = await ctx.db
      .query("maintenanceTasks")
      .withIndex("by_bike", (q) => q.eq("bikeId", id))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }

    // Delete all maintenance plans for this bike
    const plans = await ctx.db
      .query("maintenancePlans")
      .withIndex("by_bike", (q) => q.eq("bikeId", id))
      .collect();
    for (const plan of plans) {
      await ctx.db.delete(plan._id);
    }

    await ctx.db.delete(id);
  },
});

// Update a bike's image URL
export const updateBikeImage = mutation({
  args: {
    bikeId: v.id("bikes"),
    imageUrl: v.string(),
  },
  handler: async (ctx, { bikeId, imageUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(bikeId);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(bikeId, { imageUrl });
  },
});

// Quick update just the mileage field
export const updateMileage = mutation({
  args: {
    id: v.id("bikes"),
    mileage: v.number(),
  },
  handler: async (ctx, { id, mileage }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(id);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(id, { mileage });
  },
});

// Trigger AI maintenance plan generation for a bike
export const generatePlan = mutation({
  args: {
    bikeId: v.id("bikes"),
  },
  handler: async (ctx, { bikeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bike = await ctx.db.get(bikeId);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== userId) throw new Error("Unauthorized");

    // Look up user's country for localized labor cost estimates
    const user = await ctx.db.get(userId);

    // Include inspection data if available — only items with problems
    let inspectionSummary: string | undefined;
    if (bike.inspectionStatus === "complete") {
      const GOOD_RESPONSES = /^(good|ok|fine|clean|clear|normal|adequate|no issues|no leaks|within spec|n\/a|not applicable|no damage|no play|no wobble|smooth|firm|tight|dry|none)\b/i;
      const items = await ctx.db
        .query("inspectionItems")
        .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
        .collect();
      const problemItems = items
        .filter((i) => i.userId === userId)
        .filter((i) => {
          const response = (i.response ?? "").trim();
          if (!response || response === "Not checked") return false;
          return !GOOD_RESPONSES.test(response);
        })
        .sort((a, b) => a.order - b.order);
      if (problemItems.length > 0) {
        const lines = problemItems.map((item) => {
          let line = `- ${item.name} [${item.category}]: ${item.response}`;
          if (item.unit) line += ` ${item.unit}`;
          return line;
        });
        inspectionSummary = `USER INSPECTION RESULTS — only items that need attention:\n${lines.join("\n")}`;
      }
    }

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
