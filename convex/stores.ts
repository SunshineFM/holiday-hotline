import { env } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import schema, { fact } from "./schema";
export async function ownedStore(
  ctx: QueryCtx | MutationCtx,
  id: Id<"stores">,
) {
  const userId = await getAuthUserId(ctx);
  const store = await ctx.db.get("stores", id);
  if (!userId || !store || store.ownerId !== userId)
    throw new ConvexError("Please sign in to your store.");
  return store;
}
async function invitedPilotUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  const user = userId ? await ctx.db.get("users", userId) : null;
  if (
    !user ||
    user.isAnonymous ||
    user.email?.toLowerCase() !== env.STAFF_EMAIL?.toLowerCase()
  )
    throw new ConvexError("This desk is available to the invited manager only.");
  return user;
}
export const mine = query({
  args: {},
  returns: v.union(schema.doc("stores"), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("stores")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first();
  },
});
export const startDemo = mutation({
  args: {},
  returns: v.id("stores"),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Please open a demo session first.");
    const old = await ctx.db
      .query("stores")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first();
    if (old) return old._id;
    return await ctx.db.insert("stores", {
      ownerId: userId,
      name: "The Holiday Edit",
      slug: "demo-" + userId,
      isDemo: true,
      facts: [
        {
          question: "What are your holiday hours?",
          answer:
            "For this demo, the shop is open Monday–Saturday, 10 am–6 pm, and Sunday, 11 am–5 pm. Christmas Day is closed.",
          source: "Fictional demo store",
          approved: true,
        },
        {
          question: "Can you gift wrap my purchase?",
          answer:
            "For this demo, complimentary gift wrapping is available for purchases made in store.",
          source: "Fictional demo store",
          approved: true,
        },
        {
          question: "Can I check a size before I visit?",
          answer:
            "An associate can check availability and price. An item is not reserved until the store confirms it.",
          source: "Fictional demo store",
          approved: true,
        },
      ],
    });
  },
});
export const pilotInvitation = query({
  args: {},
  returns: v.union(v.object({ name: v.string() }), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const user = userId ? await ctx.db.get("users", userId) : null;
    const name = env.PILOT_NAME?.trim();
    if (
      !user ||
      user.isAnonymous ||
      !name ||
      user.email?.toLowerCase() !== env.STAFF_EMAIL?.toLowerCase()
    )
      return null;
    return { name };
  },
});
export const activatePilot = mutation({
  args: {},
  returns: v.id("stores"),
  handler: async (ctx) => {
    const user = await invitedPilotUser(ctx);
    const name = env.PILOT_NAME?.trim();
    const slug = env.PILOT_SLUG?.trim();
    const website = env.PILOT_WEBSITE?.trim();
    if (!name || !slug || !website)
      throw new ConvexError("The pilot details have not been configured yet.");
    try {
      const parsed = new URL(website);
      if (parsed.protocol !== "https:" || !parsed.hostname.includes("."))
        throw new Error("Invalid website");
    } catch {
      throw new ConvexError("The pilot website is not configured correctly.");
    }
    const existing = await ctx.db
      .query("stores")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user._id))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("stores", {
      ownerId: user._id,
      name,
      slug,
      website,
      isDemo: false,
      facts: [],
    });
  },
});
export const saveFacts = mutation({
  args: { storeId: v.id("stores"), facts: v.array(fact) },
  returns: v.null(),
  handler: async (ctx, a) => {
    await ownedStore(ctx, a.storeId);
    if (
      a.facts.length > 25 ||
      a.facts.some(
        (f) =>
          !f.question.trim() ||
          !f.answer.trim() ||
          f.question.length > 300 ||
          f.answer.length > 2000 ||
          f.source.length > 1000 ||
          (f.expiresAt !== undefined && !Number.isFinite(f.expiresAt)),
      )
    )
      throw new ConvexError("Please keep up to 25 concise, complete answers.");
    await ctx.db.patch("stores", a.storeId, { facts: a.facts });
    return null;
  },
});
export const forOwner = internalQuery({
  args: { storeId: v.id("stores") },
  returns: schema.doc("stores"),
  handler: async (ctx, a) => ownedStore(ctx, a.storeId),
});
export const bySlug = internalQuery({
  args: { slug: v.string() },
  returns: v.union(schema.doc("stores"), v.null()),
  handler: async (ctx, a) =>
    ctx.db
      .query("stores")
      .withIndex("by_slug", (q) => q.eq("slug", a.slug))
      .unique(),
});
export const byId = internalQuery({
  args: { id: v.id("stores") },
  returns: v.union(schema.doc("stores"), v.null()),
  handler: async (ctx, args) => await ctx.db.get("stores", args.id),
});
export const publicHotline = query({
  args: {},
  returns: v.object({
    name: v.string(),
    hotline: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const slug = env.HOTLINE_STORE_SLUG;
    if (!slug) return { name: "Holiday Helper", hotline: null };
    const store = await ctx.db
      .query("stores")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    return {
      name: store?.name ?? "Holiday Helper",
      hotline: store && !store.isDemo ? (store.hotline ?? null) : null,
    };
  },
});
export const configurePilot = internalMutation({
  args: {
    ownerId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    website: v.string(),
    hotline: v.optional(v.string()),
    agentId: v.optional(v.string()),
  },
  returns: v.id("stores"),
  handler: async (ctx, a) => {
    const user = await ctx.db.get("users", a.ownerId);
    if (
      !user ||
      user.isAnonymous ||
      user.email?.toLowerCase() !== env.STAFF_EMAIL?.toLowerCase()
    )
      throw new ConvexError("Use the invited store account.");
    const existing = await ctx.db
      .query("stores")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", a.ownerId))
      .first();
    if (existing)
      throw new ConvexError(
        "Store already configured; inspect before updating.",
      );
    const { hotline, agentId, ...store } = a;
    return await ctx.db.insert("stores", {
      ...store,
      ...(hotline?.trim() ? { hotline: hotline.trim() } : {}),
      ...(agentId?.trim() ? { agentId: agentId.trim() } : {}),
      isDemo: false,
      facts: [],
    });
  },
});
