import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
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
    // Photo
    photoStorageId: v.optional(v.id("_storage")),
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ensureUser(ctx);
    if (!user) throw new Error("Could not create user");

    // Resolve photo storage ID to a serving URL
    let imageUrl: string | undefined;
    if (args.photoStorageId) {
      const url = await ctx.storage.getUrl(args.photoStorageId);
      if (url) imageUrl = url;
    }

    // Check for existing bike with same make/model/year to prevent duplicates
    // (e.g. user goes back during onboarding and re-submits)
    const existingBikes = await ctx.db
      .query("bikes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const duplicate = existingBikes.find(
      (b) =>
        b.make.toLowerCase() === args.make.toLowerCase() &&
        b.model.toLowerCase() === args.model.toLowerCase() &&
        b.year === args.year
    );
    if (duplicate) {
      // Update existing bike instead of creating a new one
      await ctx.db.patch(duplicate._id, {
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
        ...(imageUrl ? { imageUrl } : {}),
      });

      // Still mark onboarding complete
      await ctx.db.patch(user._id, {
        hasCompletedOnboarding: true,
        country: args.country,
        ...(args.phone ? { phone: args.phone } : {}),
        ...(args.notificationPreferences
          ? { notificationPreferences: args.notificationPreferences }
          : {}),
      });

      // Trigger AI hero image generation for existing bike too
      if (args.photoStorageId) {
        await ctx.scheduler.runAfter(0, internal.ai.generateHeroImage, {
          bikeId: duplicate._id,
          photoStorageId: args.photoStorageId,
        });
      }

      return duplicate._id;
    }

    // Create the bike
    const bikeId = await ctx.db.insert("bikes", {
      userId: userId,
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
      ...(imageUrl ? { imageUrl } : {}),
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

    // AI plan generation is gated behind paid subscription.
    // Free users track maintenance manually.
    // Plan generation is triggered from the client after subscription is confirmed.

    // If user uploaded a photo, trigger AI hero image generation in background
    if (args.photoStorageId) {
      await ctx.scheduler.runAfter(0, internal.ai.generateHeroImage, {
        bikeId,
        photoStorageId: args.photoStorageId,
      });
    }

    return bikeId;
  },
});

// Skip onboarding — just mark as completed without saving any bike data
export const skip = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ensureUser(ctx);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      hasCompletedOnboarding: true,
    });
  },
});
