import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { ownedStore } from "./stores";
import schema from "./schema";

const SHOPPER_REQUEST_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const list = query({
  args: { storeId: v.id("stores") },
  returns: v.array(schema.doc("requests")),
  handler: async (ctx, a) => {
    await ownedStore(ctx, a.storeId);
    return await ctx.db
      .query("requests")
      .withIndex("by_storeId", (q) => q.eq("storeId", a.storeId))
      .order("desc")
      .take(100);
  },
});
export const addExample = mutation({
  args: {
    storeId: v.id("stores"),
    example: v.union(v.literal("shirt"), v.literal("gift"), v.literal("size")),
    requestKey: v.string(),
  },
  returns: v.id("requests"),
  handler: async (ctx, a) => {
    const store = await ownedStore(ctx, a.storeId);
    if (!store.isDemo)
      throw new ConvexError("Examples are only available in the demo store.");
    if (a.requestKey.length > 120) throw new ConvexError("Invalid request.");
    const old = await ctx.db
      .query("requests")
      .withIndex("by_storeId_and_requestKey", (q) =>
        q.eq("storeId", a.storeId).eq("requestKey", a.requestKey),
      )
      .unique();
    if (old) return old._id;
    const examples = {
      shirt: {
        item: "Blue linen shirt · Medium",
        detail:
          "Could you check whether the blue linen shirt is available in medium, and confirm the price?",
        timeframe: "Pickup today",
        shopper: "Demo shopper",
      },
      gift: {
        item: "A gift under $75",
        detail:
          "Looking for a gift for someone who loves hosting. Could you suggest something and share a photo?",
        timeframe: "This week",
        shopper: "Demo shopper",
      },
      size: {
        item: "Cashmere scarf · Burgundy",
        detail:
          "Is the burgundy cashmere scarf available? A photo and price would help.",
        timeframe: "Exploring options",
        shopper: "Demo shopper",
      },
    };
    return await ctx.db.insert("requests", {
      storeId: a.storeId,
      requestKey: a.requestKey,
      ...examples[a.example],
      emailConsent: false,
      status: "waiting",
      isDemo: true,
    });
  },
});
export const reply = mutation({
  args: {
    id: v.id("requests"),
    answer: v.string(),
    availability: v.union(
      v.literal("available"),
      v.literal("unavailable"),
      v.literal("checking"),
      v.literal("alternative"),
      v.literal("photo"),
    ),
    photoId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    const r = await ctx.db.get("requests", a.id);
    if (!r) throw new ConvexError("Request not found.");
    await ownedStore(ctx, r.storeId);
    if (r.status !== "waiting") return null;
    if (!a.answer.trim() || a.answer.length > 2000)
      throw new ConvexError("Add an answer of up to 2,000 characters.");
    if (a.photoId) {
      const photo = await ctx.db
        .query("uploads")
        .withIndex("by_storageId", (q) => q.eq("storageId", a.photoId!))
        .unique();
      if (!photo || photo.ownerId !== (await getAuthUserId(ctx)))
        throw new ConvexError("This photo does not belong to your store.");
    }
    const next = r.isDemo ? "preview" : "queued";
    if (!r.isDemo && (!r.email || !r.emailConsent))
      throw new ConvexError("Shopper has not agreed to an email follow-up.");
    await ctx.db.patch("requests", a.id, {
      answer: a.answer.trim(),
      availability: a.availability,
      ...(a.photoId ? { photoId: a.photoId } : {}),
      status: next,
      answeredAt: Date.now(),
    });
    if (!r.isDemo)
      await ctx.scheduler.runAfter(0, internal.delivery.send, { id: a.id });
    return null;
  },
});
export const generateUploadUrl = mutation({
  args: { storeId: v.id("stores") },
  returns: v.string(),
  handler: async (ctx, a) => {
    await ownedStore(ctx, a.storeId);
    return await ctx.storage.generateUploadUrl();
  },
});
export const registerPhoto = mutation({
  args: { storeId: v.id("stores"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, a) => {
    const s = await ownedStore(ctx, a.storeId);
    const meta = await ctx.db.system.get("_storage", a.storageId);
    if (
      !meta ||
      meta.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(
        meta.contentType ?? "",
      )
    )
      throw new ConvexError("Use a JPG, PNG, or WebP image under 5 MB.");
    const old = await ctx.db
      .query("uploads")
      .withIndex("by_storageId", (q) => q.eq("storageId", a.storageId))
      .unique();
    if (old && old.ownerId !== s.ownerId)
      throw new ConvexError("Photo unavailable.");
    if (!old)
      await ctx.db.insert("uploads", {
        ownerId: s.ownerId,
        storageId: a.storageId,
      });
    return null;
  },
});
export const photo = query({
  args: { id: v.id("requests") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, a) => {
    const r = await ctx.db.get("requests", a.id);
    if (!r) return null;
    await ownedStore(ctx, r.storeId);
    return r.photoId ? await ctx.storage.getUrl(r.photoId) : null;
  },
});
export const createFromCall = internalMutation({
  args: {
    storeId: v.id("stores"),
    requestKey: v.string(),
    item: v.string(),
    detail: v.string(),
    timeframe: v.string(),
    shopper: v.string(),
    email: v.string(),
    emailConsent: v.boolean(),
  },
  returns: v.id("requests"),
  handler: async (ctx, a) => {
    const s = await ctx.db.get("stores", a.storeId);
    if (!s || s.isDemo) throw new ConvexError("Hotline is not ready.");
    if (
      !a.emailConsent ||
      !/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(a.email) ||
      a.email.length > 254
    )
      throw new ConvexError(
        "Please confirm the shopper's email and permission.",
      );
    for (const k of [
      "requestKey",
      "item",
      "detail",
      "timeframe",
      "shopper",
    ] as const)
      if (!a[k].trim() || a[k].length > (k === "detail" ? 2000 : 200))
        throw new ConvexError("Invalid request detail.");
    const old = await ctx.db
      .query("requests")
      .withIndex("by_storeId_and_requestKey", (q) =>
        q.eq("storeId", a.storeId).eq("requestKey", a.requestKey),
      )
      .unique();
    if (old) return old._id;
    const id = await ctx.db.insert("requests", {
      ...a,
      status: "waiting",
      isDemo: false,
    });
    await ctx.scheduler.runAfter(SHOPPER_REQUEST_RETENTION_MS, internal.requests.cleanup, {
      id,
    });
    return id;
  },
});
export const cleanup = internalMutation({
  args: { id: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, a) => {
    const request = await ctx.db.get("requests", a.id);
    if (!request || request.isDemo) return null;
    if (request.photoId) {
      await ctx.storage.delete(request.photoId);
      const upload = await ctx.db
        .query("uploads")
        .withIndex("by_storageId", (q) => q.eq("storageId", request.photoId!))
        .unique();
      if (upload) await ctx.db.delete("uploads", upload._id);
    }
    await ctx.db.delete("requests", a.id);
    return null;
  },
});
export const claimDelivery = internalMutation({
  args: { id: v.id("requests") },
  returns: v.union(schema.doc("requests"), v.null()),
  handler: async (ctx, a) => {
    const r = await ctx.db.get("requests", a.id);
    if (!r || r.isDemo || r.status !== "queued") return null;
    await ctx.db.patch("requests", a.id, { status: "sending" });
    await ctx.scheduler.runAfter(
      60000,
      internal.requests.checkInterruptedDelivery,
      { id: a.id },
    );
    return r;
  },
});
export const deliveryResult = internalMutation({
  args: {
    id: v.id("requests"),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("uncertain"),
    ),
    messageId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, a) => {
    await ctx.db.patch("requests", a.id, {
      status: a.status,
      ...(a.messageId ? { messageId: a.messageId } : {}),
      ...(a.error ? { deliveryError: a.error } : {}),
    });
    return null;
  },
});
export const deliveryData = internalQuery({
  args: { id: v.id("requests") },
  returns: v.union(
    v.object({ name: v.string(), photoUrl: v.union(v.string(), v.null()) }),
    v.null(),
  ),
  handler: async (ctx, a) => {
    const r = await ctx.db.get("requests", a.id);
    if (!r) return null;
    const s = await ctx.db.get("stores", r.storeId);
    return {
      name: s?.name ?? "Holiday Hotline",
      photoUrl: r.photoId ? await ctx.storage.getUrl(r.photoId) : null,
    };
  },
});

export const checkInterruptedDelivery = internalMutation({
  args: { id: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, a) => {
    const r = await ctx.db.get("requests", a.id);
    if (r?.status === "sending")
      await ctx.db.patch("requests", a.id, {
        status: "uncertain",
        deliveryError:
          "Email confirmation did not complete. Check the email provider before retrying.",
      });
    return null;
  },
});
