import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { ensureUser } from "./users";

// Save all onboarding data: create bike + update user profile + trigger plan generation
export const save = mutation({
  args: {
    // Bike details
    make: v.string(),
    model: v.string(),
    year: v.number(),
    mileage: v.number(),
    lastServiceDate: v.optional(v.string()),
    lastServiceMileage: v.optional(v.number()),
    notes: v.optional(v.string()),
    // Rider context
    ridingStyle: v.optional(v.string()),
    annualMileage: v.optional(v.number()),
    climate: v.optional(v.string()),
    storageType: v.optional(v.string()),
    experienceLevel: v.optional(v.string()),
    maintenanceComfort: v.optional(v.string()),
    country: v.optional(v.string()),
    // Notification preferences
    phone: v.optional(v.string()),
    notificationPreferences: v.optional(
      v.object({
        push: v.boolean(),
        sms: v.boolean(),
        email: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ensureUser(ctx);
    if (!user) throw new Error("Could not create user");

    // Create the bike
    const bikeId = await ctx.db.insert("bikes", {
      userId: identity.subject,
      make: args.make,
      model: args.model,
      year: args.year,
      mileage: args.mileage,
      lastServiceDate: args.lastServiceDate,
      lastServiceMileage: args.lastServiceMileage,
      notes: args.notes,
      ridingStyle: args.ridingStyle,
      annualMileage: args.annualMileage,
      climate: args.climate,
      storageType: args.storageType,
      experienceLevel: args.experienceLevel,
      maintenanceComfort: args.maintenanceComfort,
    });

    // Mark onboarding as complete + save country + notification prefs
    await ctx.db.patch(user._id, {
      hasCompletedOnboarding: true,
      country: args.country,
      ...(args.phone ? { phone: args.phone } : {}),
      ...(args.notificationPreferences
        ? { notificationPreferences: args.notificationPreferences }
        : {}),
    });

    // Auto-trigger maintenance plan generation
    await ctx.scheduler.runAfter(0, internal.ai.generateMaintenancePlan, {
      bikeId,
      userId: identity.subject,
      make: args.make,
      model: args.model,
      year: args.year,
      mileage: args.mileage,
      lastServiceDate: args.lastServiceDate,
      lastServiceMileage: args.lastServiceMileage,
      country: args.country,
    });

    return bikeId;
  },
});
