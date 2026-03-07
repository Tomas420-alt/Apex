import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ensureUser } from "./users";

// Get all bikes for authenticated user
export const list = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("bikes")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

// Get a single bike by id (verify user owns it)
export const get = query({
  args: { id: v.id("bikes") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const bike = await ctx.db.get(id);
    if (!bike) return null;
    if (bike.userId !== identity.subject) return null;

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    await ensureUser(ctx);

    return await ctx.db.insert("bikes", {
      userId: identity.subject,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const bike = await ctx.db.get(id);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== identity.subject) throw new Error("Unauthorized");

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const bike = await ctx.db.get(id);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== identity.subject) throw new Error("Unauthorized");

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

// Quick update just the mileage field
export const updateMileage = mutation({
  args: {
    id: v.id("bikes"),
    mileage: v.number(),
  },
  handler: async (ctx, { id, mileage }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const bike = await ctx.db.get(id);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.patch(id, { mileage });
  },
});

// Trigger AI maintenance plan generation for a bike
export const generatePlan = mutation({
  args: {
    bikeId: v.id("bikes"),
  },
  handler: async (ctx, { bikeId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const bike = await ctx.db.get(bikeId);
    if (!bike) throw new Error("Bike not found");
    if (bike.userId !== identity.subject) throw new Error("Unauthorized");

    // Look up user's country for localized labor cost estimates
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    // Include inspection data if available
    let inspectionSummary: string | undefined;
    if (bike.inspectionStatus === "complete") {
      const items = await ctx.db
        .query("inspectionItems")
        .withIndex("by_bike", (q) => q.eq("bikeId", bikeId))
        .collect();
      const sorted = items
        .filter((i) => i.userId === identity.subject)
        .sort((a, b) => a.order - b.order);
      if (sorted.length > 0) {
        const lines: string[] = [];
        for (const item of sorted) {
          const response = item.response ?? "Not checked";
          let line = `- ${item.name} [${item.category}]: ${response}`;
          if (item.unit) line += ` ${item.unit}`;
          if (item.options && item.options.length > 0) {
            line += ` (options were: ${item.options.join(", ")})`;
          }
          lines.push(line);
        }
        inspectionSummary = `USER INSPECTION RESULTS — each item below shows what the user reported:\n${lines.join("\n")}`;
      }
    }

    await ctx.scheduler.runAfter(0, internal.ai.generateMaintenancePlan, {
      bikeId,
      userId: identity.subject,
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
