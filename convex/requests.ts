import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { ownedStore } from "./stores";
import schema from "./schema";

const REQUEST_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const responseKind = v.union(
  v.literal("answered"),
  v.literal("checking"),
  v.literal("alternative"),
  v.literal("photo"),
);

export const list = query({
  args: { storeId: v.id("stores") },
  returns: v.array(schema.doc("requests")),
  handler: async (ctx, args) => {
    await ownedStore(ctx, args.storeId);
    return await ctx.db
      .query("requests")
      .withIndex("by_storeId", (q) => q.eq("storeId", args.storeId))
      .order("desc")
      .take(100);
  },
});

export const addExample = mutation({
  args: {
    storeId: v.id("stores"),
    example: v.union(
      v.literal("special"),
      v.literal("event"),
      v.literal("service"),
    ),
    requestKey: v.string(),
  },
  returns: v.id("requests"),
  handler: async (ctx, args) => {
    const store = await ownedStore(ctx, args.storeId);
    if (!store.isDemo)
      throw new ConvexError(
        "Examples are only available in the practice desk.",
      );
    if (!args.requestKey.trim() || args.requestKey.length > 120)
      throw new ConvexError("Invalid request.");
    const old = await ctx.db
      .query("requests")
      .withIndex("by_storeId_and_requestKey", (q) =>
        q.eq("storeId", args.storeId).eq("requestKey", args.requestKey),
      )
      .unique();
    if (old) return old._id;
    const examples = {
      special: {
        item: "Today’s lunch special",
        detail: "What is today’s special, and is there a vegetarian option?",
        timeframe: "Today",
        shopper: "Practice caller",
      },
      event: {
        item: "Tonight’s community event",
        detail:
          "Can someone confirm the start time and whether parking is available?",
        timeframe: "This evening",
        shopper: "Practice caller",
      },
      service: {
        item: "A same-day service question",
        detail:
          "Can a team member check the current availability before I come by?",
        timeframe: "Today",
        shopper: "Practice caller",
      },
    };
    return await ctx.db.insert("requests", {
      storeId: args.storeId,
      requestKey: args.requestKey,
      ...examples[args.example],
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
    responseKind,
    photoId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get("requests", args.id);
    if (!request) throw new ConvexError("Request not found.");
    await ownedStore(ctx, request.storeId);
    if (request.status !== "waiting") return null;
    if (!args.answer.trim() || args.answer.length > 2000)
      throw new ConvexError("Add an answer of up to 2,000 characters.");
    if (args.photoId) {
      const photo = await ctx.db
        .query("uploads")
        .withIndex("by_storageId", (q) => q.eq("storageId", args.photoId!))
        .unique();
      if (!photo || photo.ownerId !== (await getAuthUserId(ctx)))
        throw new ConvexError("This photo does not belong to this team.");
    }
    const next = request.isDemo ? "preview" : "queued";
    if (!request.isDemo && (!request.email || !request.emailConsent))
      throw new ConvexError("The caller has not agreed to an email follow-up.");
    await ctx.db.patch("requests", args.id, {
      answer: args.answer.trim(),
      responseKind: args.responseKind,
      ...(args.photoId ? { photoId: args.photoId } : {}),
      status: next,
      answeredAt: Date.now(),
    });
    if (!request.isDemo)
      await ctx.scheduler.runAfter(0, internal.delivery.send, { id: args.id });
    return null;
  },
});

export const generateUploadUrl = mutation({
  args: { storeId: v.id("stores") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await ownedStore(ctx, args.storeId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerPhoto = mutation({
  args: { storeId: v.id("stores"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const store = await ownedStore(ctx, args.storeId);
    const meta = await ctx.db.system.get("_storage", args.storageId);
    if (
      !meta ||
      meta.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(
        meta.contentType ?? "",
      )
    )
      throw new ConvexError("Use a JPG, PNG, or WebP photo under 5 MB.");
    const old = await ctx.db
      .query("uploads")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();
    if (old && old.ownerId !== store.ownerId)
      throw new ConvexError("Photo unavailable.");
    if (!old)
      await ctx.db.insert("uploads", {
        ownerId: store.ownerId,
        storageId: args.storageId,
      });
    return null;
  },
});

export const photo = query({
  args: { id: v.id("requests") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const request = await ctx.db.get("requests", args.id);
    if (!request) return null;
    await ownedStore(ctx, request.storeId);
    return request.photoId ? await ctx.storage.getUrl(request.photoId) : null;
  },
});

export const createFromCall = internalMutation({
  args: {
    storeId: v.id("stores"),
    requestKey: v.string(),
    topic: v.string(),
    detail: v.string(),
    timing: v.string(),
    callerName: v.string(),
    email: v.string(),
    emailConsent: v.boolean(),
  },
  returns: v.id("requests"),
  handler: async (ctx, args) => {
    const store = await ctx.db.get("stores", args.storeId);
    if (!store || store.isDemo) throw new ConvexError("Hotline is not ready.");
    if (
      !args.emailConsent ||
      !/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(args.email) ||
      args.email.length > 254
    )
      throw new ConvexError(
        "Please confirm the caller's email and permission.",
      );
    for (const field of [
      args.requestKey,
      args.topic,
      args.detail,
      args.timing,
      args.callerName,
    ])
      if (!field.trim() || field.length > 2000)
        throw new ConvexError("Invalid request detail.");
    if (
      args.requestKey.length > 200 ||
      args.topic.length > 200 ||
      args.timing.length > 200 ||
      args.callerName.length > 200
    )
      throw new ConvexError("Invalid request detail.");
    const old = await ctx.db
      .query("requests")
      .withIndex("by_storeId_and_requestKey", (q) =>
        q.eq("storeId", args.storeId).eq("requestKey", args.requestKey),
      )
      .unique();
    if (old) return old._id;
    const id = await ctx.db.insert("requests", {
      storeId: args.storeId,
      requestKey: args.requestKey,
      item: args.topic,
      detail: args.detail,
      timeframe: args.timing,
      shopper: args.callerName,
      email: args.email,
      emailConsent: true,
      status: "waiting",
      isDemo: false,
    });
    await ctx.scheduler.runAfter(
      REQUEST_RETENTION_MS,
      internal.requests.cleanup,
      {
        id,
      },
    );
    return id;
  },
});

export const cleanup = internalMutation({
  args: { id: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get("requests", args.id);
    if (!request || request.isDemo) return null;
    if (request.photoId) {
      await ctx.storage.delete(request.photoId);
      const upload = await ctx.db
        .query("uploads")
        .withIndex("by_storageId", (q) => q.eq("storageId", request.photoId!))
        .unique();
      if (upload) await ctx.db.delete("uploads", upload._id);
    }
    await ctx.db.delete("requests", args.id);
    return null;
  },
});

export const claimDelivery = internalMutation({
  args: { id: v.id("requests") },
  returns: v.union(schema.doc("requests"), v.null()),
  handler: async (ctx, args) => {
    const request = await ctx.db.get("requests", args.id);
    if (!request || request.isDemo || request.status !== "queued") return null;
    await ctx.db.patch("requests", args.id, { status: "sending" });
    await ctx.scheduler.runAfter(
      60000,
      internal.requests.checkInterruptedDelivery,
      { id: args.id },
    );
    return request;
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
  handler: async (ctx, args) => {
    await ctx.db.patch("requests", args.id, {
      status: args.status,
      ...(args.messageId ? { messageId: args.messageId } : {}),
      ...(args.error ? { deliveryError: args.error } : {}),
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
  handler: async (ctx, args) => {
    const request = await ctx.db.get("requests", args.id);
    if (!request) return null;
    const store = await ctx.db.get("stores", request.storeId);
    return {
      name: store?.name ?? "Holiday Helper",
      photoUrl: request.photoId
        ? await ctx.storage.getUrl(request.photoId)
        : null,
    };
  },
});

export const checkInterruptedDelivery = internalMutation({
  args: { id: v.id("requests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get("requests", args.id);
    if (request?.status === "sending")
      await ctx.db.patch("requests", args.id, {
        status: "uncertain",
        deliveryError:
          "Email confirmation did not complete. Check the email provider before retrying.",
      });
    return null;
  },
});
