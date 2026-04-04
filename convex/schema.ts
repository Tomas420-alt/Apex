import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    // Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom app fields
    hasCompletedOnboarding: v.optional(v.boolean()),
    country: v.optional(v.string()),
    // Subscription
    subscriptionStatus: v.optional(v.string()), // "active" | "expired" | "cancelled" | undefined (free)
    subscriptionPlan: v.optional(v.string()), // "monthly" | "annual"
    subscriptionExpiresAt: v.optional(v.number()), // timestamp
    notificationPreferences: v.optional(
      v.object({
        push: v.boolean(),
        sms: v.boolean(),
        email: v.boolean(),
      })
    ),
    expoPushToken: v.optional(v.string()),
  }).index("email", ["email"]),

  bikes: defineTable({
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    mileage: v.number(),
    imageUrl: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    heroImageUrl: v.optional(v.string()),
    lastServiceDate: v.optional(v.string()),
    lastServiceMileage: v.optional(v.number()),
    notes: v.optional(v.string()),
    ridingStyle: v.optional(v.string()),
    annualMileage: v.optional(v.number()),
    climate: v.optional(v.string()),
    storageType: v.optional(v.string()),
    experienceLevel: v.optional(v.string()),
    maintenanceComfort: v.optional(v.string()),
    inspectionStatus: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  inspectionItems: defineTable({
    bikeId: v.id("bikes"),
    userId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    responseType: v.string(),
    options: v.optional(v.array(v.string())),
    unit: v.optional(v.string()),
    response: v.optional(v.string()),
    order: v.number(),
  })
    .index("by_bike", ["bikeId"])
    .index("by_user", ["userId"]),

  maintenancePlans: defineTable({
    bikeId: v.id("bikes"),
    userId: v.string(),
    generatedAt: v.number(),
    totalEstimatedCost: v.number(),
    nextServiceDate: v.optional(v.string()),
    status: v.string(),
  })
    .index("by_bike", ["bikeId"])
    .index("by_user", ["userId"]),

  maintenanceTasks: defineTable({
    planId: v.optional(v.id("maintenancePlans")),
    bikeId: v.id("bikes"),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    intervalKm: v.optional(v.number()),
    intervalMonths: v.optional(v.number()),
    priority: v.string(),
    status: v.string(),
    estimatedCostUsd: v.optional(v.number()),
    estimatedLaborCostUsd: v.optional(v.number()),
    dueDate: v.optional(v.string()),
    dueMileage: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    partsNeeded: v.optional(v.array(v.string())),
  })
    .index("by_plan", ["planId"])
    .index("by_bike", ["bikeId"])
    .index("by_user_and_status", ["userId", "status"]),

  parts: defineTable({
    taskId: v.optional(v.id("maintenanceTasks")),
    bikeId: v.id("bikes"),
    userId: v.string(),
    name: v.string(),
    partNumber: v.optional(v.string()),
    estimatedPrice: v.optional(v.number()),
    supplier: v.optional(v.string()),
    url: v.optional(v.string()),
    purchased: v.boolean(),
    category: v.optional(v.string()),
    isAlternative: v.optional(v.boolean()),
  })
    .index("by_task", ["taskId"])
    .index("by_bike", ["bikeId"])
    .index("by_user", ["userId"]),

  completionHistory: defineTable({
    taskId: v.id("maintenanceTasks"),
    bikeId: v.id("bikes"),
    userId: v.string(),
    taskName: v.string(),
    completedAt: v.number(),
    dueDate: v.optional(v.string()),
    estimatedLaborCostUsd: v.optional(v.number()),
    estimatedCostUsd: v.optional(v.number()),
  })
    .index("by_bike", ["bikeId"])
    .index("by_user", ["userId"]),

  reminders: defineTable({
    taskId: v.id("maintenanceTasks"),
    userId: v.string(),
    channel: v.string(),
    scheduledAt: v.number(),
    sentAt: v.optional(v.number()),
    status: v.string(),
    messageSid: v.optional(v.string()),
    emailId: v.optional(v.string()),
    reminderType: v.optional(v.string()),
  })
    .index("by_task", ["taskId"])
    .index("by_user_and_status", ["userId", "status"]),

  rateLimits: defineTable({
    userId: v.string(),
    action: v.string(),
    timestamp: v.number(),
  }).index("by_user_action", ["userId", "action"]),
});
