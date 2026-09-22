import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/** Retained only to migrate the original hackathon facts into durable updates. */
export const fact = v.object({
  question: v.string(),
  answer: v.string(),
  source: v.string(),
  approved: v.boolean(),
  expiresAt: v.optional(v.number()),
});

export const updateScope = v.union(
  v.literal("today"),
  v.literal("temporary"),
  v.literal("ongoing"),
);
export const updateSource = v.union(
  v.literal("manager"),
  v.literal("website"),
  v.literal("manual"),
  v.literal("legacy"),
);
export const updateStatus = v.union(
  v.literal("draft"),
  v.literal("approved"),
  v.literal("archived"),
);
export const draftAnswer = v.object({
  question: v.string(),
  answer: v.string(),
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
    // Existing stores retain this until their first manager-session migration.
    facts: v.optional(v.array(fact)),
    website: v.optional(v.string()),
    hotline: v.optional(v.string()),
    agentId: v.optional(v.string()),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_slug", ["slug"]),

  briefs: defineTable({
    storeId: v.id("stores"),
    text: v.string(),
    scope: updateScope,
    effectiveAt: v.number(),
    expiresAt: v.optional(v.number()),
    source: updateSource,
    createdBy: v.id("users"),
  }).index("by_storeId", ["storeId"]),

  updates: defineTable({
    storeId: v.id("stores"),
    briefId: v.optional(v.id("briefs")),
    question: v.string(),
    answer: v.string(),
    scope: updateScope,
    source: updateSource,
    status: updateStatus,
    effectiveAt: v.number(),
    expiresAt: v.optional(v.number()),
    createdBy: v.id("users"),
    approvedAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
  })
    // eslint-disable-next-line @convex-dev/no-duplicate-indexes -- The manager timeline needs creation order; the status index groups review state.
    .index("by_storeId", ["storeId"])
    .index("by_storeId_and_status", ["storeId", "status"]),

  hotlineConnections: defineTable({
    storeId: v.id("stores"),
    routeKey: v.string(),
    toolSecretHash: v.string(),
    agentId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_storeId", ["storeId"])
    .index("by_routeKey", ["routeKey"]),

  requests: defineTable({
    storeId: v.id("stores"),
    requestKey: v.string(),
    // These legacy field names remain for the migration. They now contain a
    // caller's topic, timing, and name rather than retail-only values.
    item: v.string(),
    detail: v.string(),
    timeframe: v.string(),
    shopper: v.string(),
    email: v.optional(v.string()),
    emailConsent: v.boolean(),
    status,
    isDemo: v.boolean(),
    answer: v.optional(v.string()),
    responseKind: v.optional(
      v.union(
        v.literal("answered"),
        v.literal("checking"),
        v.literal("alternative"),
        v.literal("photo"),
      ),
    ),
    availability: v.optional(v.string()),
    photoId: v.optional(v.id("_storage")),
    messageId: v.optional(v.string()),
    deliveryError: v.optional(v.string()),
    answeredAt: v.optional(v.number()),
  })
    // eslint-disable-next-line @convex-dev/no-duplicate-indexes -- The queue needs creation order; the request-key index is for HTTP idempotency.
    .index("by_storeId", ["storeId"])
    .index("by_storeId_and_requestKey", ["storeId", "requestKey"]),

  helperPresence: defineTable({
    storeId: v.id("stores"),
    status: v.union(
      v.literal("ready"),
      v.literal("busy"),
      // Preserved so an existing desk deployment can upgrade safely.
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
