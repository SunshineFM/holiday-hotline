import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { ownedStore } from "./stores";

const helperStatus = v.union(
  v.literal("ready"),
  v.literal("with-shopper"),
  v.literal("off"),
);

export const mine = query({
  args: { storeId: v.id("stores") },
  returns: v.union(
    v.object({ status: helperStatus, updatedAt: v.number() }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await ownedStore(ctx, args.storeId);
    const current = await ctx.db
      .query("helperPresence")
      .withIndex("by_storeId", (q) => q.eq("storeId", args.storeId))
      .unique();
    return current
      ? { status: current.status, updatedAt: current.updatedAt }
      : null;
  },
});

export const set = mutation({
  args: { storeId: v.id("stores"), status: helperStatus },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ownedStore(ctx, args.storeId);
    const current = await ctx.db
      .query("helperPresence")
      .withIndex("by_storeId", (q) => q.eq("storeId", args.storeId))
      .unique();
    const updatedAt = Date.now();
    if (current)
      await ctx.db.patch("helperPresence", current._id, {
        status: args.status,
        updatedAt,
      });
    else
      await ctx.db.insert("helperPresence", {
        storeId: args.storeId,
        status: args.status,
        updatedAt,
      });
    return null;
  },
});

export const forStore = internalQuery({
  args: { storeId: v.id("stores") },
  returns: v.union(v.object({ status: helperStatus, updatedAt: v.number() }), v.null()),
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("helperPresence")
      .withIndex("by_storeId", (q) => q.eq("storeId", args.storeId))
      .unique();
    return current
      ? { status: current.status, updatedAt: current.updatedAt }
      : null;
  },
});
