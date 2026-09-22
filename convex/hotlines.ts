import { ConvexError, v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import schema from "./schema";
import { ownedStore } from "./stores";

function secretForConnection() {
  // Two UUIDs give a one-time secret that is long enough for provider headers.
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
}

async function hashSecret(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Creates the one-time connection material for a location. The secret is
 * returned only at creation, while Convex retains only its hash.
 */
export const provision = mutation({
  args: {
    storeId: v.id("stores"),
    agentId: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  returns: v.object({
    routeKey: v.string(),
    toolSecret: v.string(),
  }),
  handler: async (ctx, args) => {
    await ownedStore(ctx, args.storeId);
    const existing = await ctx.db
      .query("hotlineConnections")
      .withIndex("by_storeId", (q) => q.eq("storeId", args.storeId))
      .first();
    if (existing)
      throw new ConvexError(
        "This location already has a hotline connection. Keep its existing configuration active.",
      );
    const routeKey = crypto.randomUUID().replaceAll("-", "");
    const toolSecret = secretForConnection();
    const now = Date.now();
    await ctx.db.insert("hotlineConnections", {
      storeId: args.storeId,
      routeKey,
      toolSecretHash: await hashSecret(toolSecret),
      ...(args.agentId?.trim() ? { agentId: args.agentId.trim() } : {}),
      ...(args.phoneNumber?.trim()
        ? { phoneNumber: args.phoneNumber.trim() }
        : {}),
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    return { routeKey, toolSecret };
  },
});

export const mine = query({
  args: { storeId: v.id("stores") },
  returns: v.union(
    v.object({
      routeKey: v.string(),
      agentId: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
      active: v.boolean(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await ownedStore(ctx, args.storeId);
    const connection = await ctx.db
      .query("hotlineConnections")
      .withIndex("by_storeId", (q) => q.eq("storeId", args.storeId))
      .first();
    if (!connection) return null;
    return {
      routeKey: connection.routeKey,
      ...(connection.agentId ? { agentId: connection.agentId } : {}),
      ...(connection.phoneNumber
        ? { phoneNumber: connection.phoneNumber }
        : {}),
      active: connection.active,
      updatedAt: connection.updatedAt,
    };
  },
});

export const byRouteKey = internalQuery({
  args: { routeKey: v.string() },
  returns: v.union(schema.doc("hotlineConnections"), v.null()),
  handler: async (ctx, args) =>
    await ctx.db
      .query("hotlineConnections")
      .withIndex("by_routeKey", (q) => q.eq("routeKey", args.routeKey))
      .unique(),
});

export const secretMatches = internalQuery({
  args: { routeKey: v.string(), secretHash: v.string() },
  returns: v.union(v.id("stores"), v.null()),
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("hotlineConnections")
      .withIndex("by_routeKey", (q) => q.eq("routeKey", args.routeKey))
      .unique();
    if (!connection || !connection.active) return null;
    return connection.toolSecretHash === args.secretHash
      ? connection.storeId
      : null;
  },
});
