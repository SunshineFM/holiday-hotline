import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
export const fact = v.object({
  question: v.string(),
  answer: v.string(),
  source: v.string(),
  approved: v.boolean(),
  expiresAt: v.optional(v.number()),
});
export const status = v.union(
  v.literal("waiting"),
  v.literal("queued"),
  v.literal("sending"),
  v.literal("sent"),
  v.literal("preview"),
  v.literal("failed"),
  v.literal("uncertain"),
);
export default defineSchema({
  ...authTables,
  stores: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    isDemo: v.boolean(),
    facts: v.array(fact),
    website: v.optional(v.string()),
    hotline: v.optional(v.string()),
    agentId: v.optional(v.string()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_slug", ["slug"]),
  requests: defineTable({
    storeId: v.id("stores"),
    requestKey: v.string(),
    item: v.string(),
    detail: v.string(),
    timeframe: v.string(),
    shopper: v.string(),
    email: v.optional(v.string()),
    emailConsent: v.boolean(),
    status,
    isDemo: v.boolean(),
    answer: v.optional(v.string()),
    availability: v.optional(v.string()),
    photoId: v.optional(v.id("_storage")),
    messageId: v.optional(v.string()),
    deliveryError: v.optional(v.string()),
    answeredAt: v.optional(v.number()),
  })
    // eslint-disable-next-line @convex-dev/no-duplicate-indexes -- Queue order is creation time; the other index sorts by request key.
    .index("by_storeId", ["storeId"])
    .index("by_storeId_and_requestKey", ["storeId", "requestKey"]),
  helperPresence: defineTable({
    storeId: v.id("stores"),
    status: v.union(
      v.literal("ready"),
      v.literal("with-shopper"),
      v.literal("off"),
    ),
    updatedAt: v.number(),
  }).index("by_storeId", ["storeId"]),
  uploads: defineTable({
    ownerId: v.id("users"),
    storageId: v.id("_storage"),
  }).index("by_storageId", ["storageId"]),
});
