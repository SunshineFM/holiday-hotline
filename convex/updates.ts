import { ConvexError, v } from "convex/values";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import schema, {
  draftAnswer,
  updateScope,
  updateSource,
} from "./schema";
import { ownedStore } from "./stores";

const MAX_ACTIVE_UPDATES = 50;
const MAX_VISIBLE_UPDATES = 100;

function validateUpdate(
  question: string,
  answer: string,
  effectiveAt: number,
  expiresAt: number | undefined,
) {
  if (!question.trim() || question.length > 300)
    throw new ConvexError(
      "Use a concise caller question of up to 300 characters.",
    );
  if (!answer.trim() || answer.length > 2000)
    throw new ConvexError(
      "Use a complete caller answer of up to 2,000 characters.",
    );
  if (!Number.isFinite(effectiveAt))
    throw new ConvexError("Choose a valid start time for this update.");
  if (expiresAt !== undefined) {
    if (!Number.isFinite(expiresAt) || expiresAt <= effectiveAt)
      throw new ConvexError("The end time must be after the update begins.");
  }
}

async function activeCount(
  ctx: MutationCtx,
  storeId: import("./_generated/dataModel").Id<"stores">,
) {
  const [drafts, approved] = await Promise.all([
    ctx.db
      .query("updates")
      .withIndex("by_storeId_and_status", (q) =>
        q.eq("storeId", storeId).eq("status", "draft"),
      )
      .take(MAX_ACTIVE_UPDATES + 1),
    ctx.db
      .query("updates")
      .withIndex("by_storeId_and_status", (q) =>
        q.eq("storeId", storeId).eq("status", "approved"),
      )
      .take(MAX_ACTIVE_UPDATES + 1),
  ]);
  return drafts.length + approved.length;
}

export const list = query({
  args: { storeId: v.id("stores") },
  returns: v.array(schema.doc("updates")),
  handler: async (ctx, args) => {
    await ownedStore(ctx, args.storeId);
    return await ctx.db
      .query("updates")
      .withIndex("by_storeId", (q) => q.eq("storeId", args.storeId))
      .order("desc")
      .take(MAX_VISIBLE_UPDATES);
  },
});

export const createDrafts = mutation({
  args: {
    storeId: v.id("stores"),
    briefText: v.string(),
    scope: updateScope,
    effectiveAt: v.number(),
    expiresAt: v.optional(v.number()),
    source: updateSource,
    drafts: v.array(draftAnswer),
  },
  returns: v.array(v.id("updates")),
  handler: async (ctx, args) => {
    const store = await ownedStore(ctx, args.storeId);
    const briefText = args.briefText.trim();
    if (!briefText || briefText.length > 2000)
      throw new ConvexError(
        "Keep the manager brief to 2,000 characters or fewer.",
      );
    if (!args.drafts.length || args.drafts.length > 5)
      throw new ConvexError(
        "Prepare between one and five concise updates at a time.",
      );
    for (const draft of args.drafts)
      validateUpdate(
        draft.question,
        draft.answer,
        args.effectiveAt,
        args.expiresAt,
      );
    if (
      (await activeCount(ctx, args.storeId)) + args.drafts.length >
      MAX_ACTIVE_UPDATES
    )
      throw new ConvexError(
        "Archive or approve the current review queue before adding more updates.",
      );

    const briefId = await ctx.db.insert("briefs", {
      storeId: args.storeId,
      text: briefText,
      scope: args.scope,
      effectiveAt: args.effectiveAt,
      ...(args.expiresAt !== undefined ? { expiresAt: args.expiresAt } : {}),
      source: args.source,
      createdBy: store.ownerId,
    });
    const ids = [];
    for (const draft of args.drafts) {
      ids.push(
        await ctx.db.insert("updates", {
          storeId: args.storeId,
          briefId,
          question: draft.question.trim(),
          answer: draft.answer.trim(),
          scope: args.scope,
          source: args.source,
          status: "draft",
          effectiveAt: args.effectiveAt,
          ...(args.expiresAt !== undefined
            ? { expiresAt: args.expiresAt }
            : {}),
          createdBy: store.ownerId,
        }),
      );
    }
    return ids;
  },
});

export const edit = mutation({
  args: {
    id: v.id("updates"),
    question: v.string(),
    answer: v.string(),
    scope: updateScope,
    effectiveAt: v.number(),
    expiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update = await ctx.db.get("updates", args.id);
    if (!update) throw new ConvexError("Update not found.");
    await ownedStore(ctx, update.storeId);
    if (update.status === "archived")
      throw new ConvexError(
        "Archived updates are kept as history and cannot be changed.",
      );
    validateUpdate(
      args.question,
      args.answer,
      args.effectiveAt,
      args.expiresAt,
    );
    await ctx.db.patch("updates", args.id, {
      question: args.question.trim(),
      answer: args.answer.trim(),
      scope: args.scope,
      effectiveAt: args.effectiveAt,
      ...(args.expiresAt === undefined
        ? { expiresAt: undefined }
        : { expiresAt: args.expiresAt }),
    });
    return null;
  },
});

export const setApproval = mutation({
  args: { id: v.id("updates"), approved: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update = await ctx.db.get("updates", args.id);
    if (!update) throw new ConvexError("Update not found.");
    await ownedStore(ctx, update.storeId);
    if (update.status === "archived")
      throw new ConvexError(
        "Archived updates cannot return to the phone line.",
      );
    await ctx.db.patch("updates", args.id, {
      status: args.approved ? "approved" : "draft",
      ...(args.approved
        ? { approvedAt: Date.now() }
        : { approvedAt: undefined }),
    });
    return null;
  },
});

export const archive = mutation({
  args: { id: v.id("updates") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update = await ctx.db.get("updates", args.id);
    if (!update) throw new ConvexError("Update not found.");
    await ownedStore(ctx, update.storeId);
    if (update.status !== "archived")
      await ctx.db.patch("updates", args.id, {
        status: "archived",
        archivedAt: Date.now(),
      });
    return null;
  },
});

/** Safely brings a manager's original approved facts into the new update log. */
export const migrateLegacyFacts = mutation({
  args: { storeId: v.id("stores") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const store = await ownedStore(ctx, args.storeId);
    const prior = await ctx.db
      .query("updates")
      .withIndex("by_storeId", (q) => q.eq("storeId", args.storeId))
      .first();
    if (prior || !store.facts?.length) return 0;
    const now = Date.now();
    const legacy = store.facts.slice(0, MAX_ACTIVE_UPDATES);
    for (const item of legacy) {
      await ctx.db.insert("updates", {
        storeId: args.storeId,
        question: item.question,
        answer: item.answer,
        scope: item.expiresAt ? "temporary" : "ongoing",
        source: "legacy",
        status: item.approved ? "approved" : "draft",
        effectiveAt: now,
        ...(item.expiresAt !== undefined ? { expiresAt: item.expiresAt } : {}),
        createdBy: store.ownerId,
        ...(item.approved ? { approvedAt: now } : {}),
      });
    }
    return legacy.length;
  },
});

export const liveForStore = internalQuery({
  args: { storeId: v.id("stores"), now: v.number() },
  returns: v.array(
    v.object({
      question: v.string(),
      answer: v.string(),
      scope: updateScope,
      effectiveAt: v.number(),
      expiresAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const approved = await ctx.db
      .query("updates")
      .withIndex("by_storeId_and_status", (q) =>
        q.eq("storeId", args.storeId).eq("status", "approved"),
      )
      .order("desc")
      .take(MAX_ACTIVE_UPDATES);
    return approved
      .filter(
        (update) =>
          update.effectiveAt <= args.now &&
          (update.expiresAt === undefined || update.expiresAt > args.now),
      )
      .map((update) => ({
        question: update.question,
        answer: update.answer,
        scope: update.scope,
        effectiveAt: update.effectiveAt,
        ...(update.expiresAt !== undefined
          ? { expiresAt: update.expiresAt }
          : {}),
      }));
  },
});
