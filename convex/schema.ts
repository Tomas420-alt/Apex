import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    hasCompletedOnboarding: v.optional(v.boolean()),
    country: v.optional(v.string()),
    notificationPreferences: v.optional(
      v.object({
        push: v.boolean(),
        sms: v.boolean(),
        email: v.boolean(),
      })
    ),
  }).index("by_clerk_id", ["clerkId"]),

  bikes: defineTable({
    userId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    mileage: v.number(),
    imageUrl: v.optional(v.string()),
    lastServiceDate: v.optional(v.string()),
    lastServiceMileage: v.optional(v.number()),
    notes: v.optional(v.string()),
    ridingStyle: v.optional(v.string()),
    annualMileage: v.optional(v.number()),
    climate: v.optional(v.string()),
    storageType: v.optional(v.string()),
    experienceLevel: v.optional(v.string()),
    maintenanceComfort: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  maintenancePlans: defineTable({
    bikeId: v.id("bikes"),
    userId: v.string(),
    generatedAt: v.number(),
    totalEstimatedCost: v.number(),
    nextServiceDate: v.optional(v.string()),
    status: v.string(), // "active" | "archived"
  })
    .index("by_bike", ["bikeId"])
    .index("by_user", ["userId"]),

  maintenanceTasks: defineTable({
    planId: v.id("maintenancePlans"),
    bikeId: v.id("bikes"),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    intervalKm: v.optional(v.number()),
    intervalMonths: v.optional(v.number()),
    priority: v.string(), // "low" | "medium" | "high" | "critical"
    status: v.string(), // "pending" | "due" | "overdue" | "completed" | "skipped"
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
    category: v.optional(v.string()), // "required" | "consumable" | "tool"
    isAlternative: v.optional(v.boolean()), // deprecated — kept for existing data compatibility
  })
    .index("by_task", ["taskId"])
    .index("by_bike", ["bikeId"])
    .index("by_user", ["userId"]),

  reminders: defineTable({
    taskId: v.id("maintenanceTasks"),
    userId: v.string(),
    channel: v.string(), // "push" | "sms" | "email"
    scheduledAt: v.number(),
    sentAt: v.optional(v.number()),
    status: v.string(), // "scheduled" | "sent" | "failed" | "snoozed" | "cancelled"
    messageSid: v.optional(v.string()),
    emailId: v.optional(v.string()),
  })
    .index("by_task", ["taskId"])
    .index("by_user_and_status", ["userId", "status"]),
});
