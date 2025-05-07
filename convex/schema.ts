import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table to track user information
  users: defineTable({
    name: v.string(),
    email: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    // Field to track available image credits for the one-time payment model
    imageCredits: v.optional(v.number()),
  }).index("by_user_id", ["userId"]),
  // Images table to store information about uploaded images
  images: defineTable({
    // Reference to the user who uploaded the image
    userId: v.string(),
    // Original image storage ID
    originalStorageId: v.string(),
    // Original image URL
    originalImageUrl: v.optional(v.string()),
    // Cartoonified image storage ID (null until processed)
    cartoonStorageId: v.optional(v.string()),
    // Cartoonified image URL
    cartoonImageUrl: v.optional(v.string()),
    // Status of the cartoonification process
    status: v.string(), // "pending", "processing", "completed", "failed"
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  webhookEvents: defineTable({
    type: v.string(),
    polarEventId: v.string(),
    createdAt: v.string(),
    modifiedAt: v.string(),
    data: v.any(),
  })
    .index("type", ["type"])
    .index("polarEventId", ["polarEventId"]),
  // New table to track one-time payment transactions
  transactions: defineTable({
    userId: v.string(),
    polarId: v.string(), // Polar checkout/payment ID
    polarPriceId: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(), // "completed", "failed", etc.
    purchaseType: v.string(), // "image_pack" 
    quantity: v.number(), // How many image credits were purchased
    createdAt: v.string(),
    modifiedAt: v.string(),
  }).index("by_user", ["userId"])
    .index("by_polar_id", ["polarId"]),
});
