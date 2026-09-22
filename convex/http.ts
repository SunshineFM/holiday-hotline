import { httpRouter } from "convex/server";
import { env, httpAction, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

type CallRequest = {
  requestKey: string;
  topic: string;
  detail: string;
  timing: string;
  callerName: string;
  email: string;
};

function presentedSecret(req: Request) {
  return (req.headers.get("authorization") ?? "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function legacyAuthorized(req: Request) {
  const key = env.ELEVENLABS_TOOL_SECRET;
  const copiedName = "ELEVENLABS_TOOL_SECRET";
  const presented = presentedSecret(req);
  return (
    !!key &&
    key.length >= 32 &&
    [
      key,
      `${copiedName}=${key}`,
      `${copiedName}="${key}"`,
      `${copiedName}='${key}'`,
    ].includes(presented)
  );
}

async function secretHash(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function requestBody(req: Request): Promise<CallRequest | Response> {
  const text = await req.text();
  if (text.length > 8000)
    return new Response("Request too large", { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!body || typeof body !== "object")
    return new Response("Invalid request", { status: 400 });
  const value = body as Record<string, unknown>;
  // The older item/shopper names are accepted during the one-pilot migration.
  const fields = {
    requestKey: value.requestKey,
    topic: value.topic ?? value.item,
    detail: value.detail,
    timing: value.timing ?? value.timeframe,
    callerName: value.callerName ?? value.shopper,
    email: value.email,
  };
  for (const field of Object.values(fields))
    if (typeof field !== "string" || !field.trim())
      return new Response("Missing request details", { status: 400 });
  if (value.emailConsent !== true)
    return new Response("Email permission required", { status: 400 });
  return fields as CallRequest;
}

async function respondWithKnowledge(
  ctx: ActionCtx,
  storeId: import("./_generated/dataModel").Id<"stores">,
  storeName: string,
  legacyFacts:
    | Array<{
        question: string;
        answer: string;
        approved: boolean;
        expiresAt?: number;
      }>
    | undefined,
) {
  const now = Date.now();
  const [updates, helper] = await Promise.all([
    ctx.runQuery(internal.updates.liveForStore, { storeId, now }),
    ctx.runQuery(internal.presence.forStore, { storeId }),
  ]);
  const facts = updates.length
    ? updates.map(({ question, answer }) => ({ question, answer }))
    : (legacyFacts ?? [])
        .filter(
          (fact) => fact.approved && (!fact.expiresAt || fact.expiresAt > now),
        )
        .map(({ question, answer }) => ({ question, answer }));
  return Response.json({
    store: storeName,
    facts,
    helperStatus:
      helper?.status === "with-shopper" ? "busy" : (helper?.status ?? "off"),
    instruction:
      "Use only these manager-approved, currently effective updates. If the answer is not here, say a person can help when available. Do not invent details, collect information, promise a callback, or offer a transfer unless Reception has a configured transfer rule.",
  });
}

async function saveCallRequest(
  ctx: ActionCtx,
  storeId: import("./_generated/dataModel").Id<"stores">,
  req: Request,
) {
  const body = await requestBody(req);
  if (body instanceof Response) return body;
  try {
    const id = await ctx.runMutation(internal.requests.createFromCall, {
      storeId,
      ...body,
      emailConsent: true,
    });
    return Response.json({
      requestId: id,
      status: "waiting",
      message:
        "The request is saved for the team. Do not promise a response time or confirm a reservation, booking, or availability.",
    });
  } catch {
    return Response.json(
      {
        error: "Please check the request details and confirmed email address.",
      },
      { status: 400 },
    );
  }
}

/** Existing single-pilot route. Retained while its Reception tool is migrated. */
http.route({
  path: "/hotline/knowledge",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!legacyAuthorized(req))
      return new Response("Unauthorized", { status: 401 });
    const store = await ctx.runQuery(internal.stores.bySlug, {
      slug: env.HOTLINE_STORE_SLUG ?? "",
    });
    if (!store || store.isDemo)
      return Response.json({ error: "Location unavailable" }, { status: 503 });
    return await respondWithKnowledge(ctx, store._id, store.name, store.facts);
  }),
});

http.route({
  path: "/hotline/requests",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!legacyAuthorized(req))
      return new Response("Unauthorized", { status: 401 });
    const store = await ctx.runQuery(internal.stores.bySlug, {
      slug: env.HOTLINE_STORE_SLUG ?? "",
    });
    if (!store || store.isDemo)
      return Response.json({ error: "Location unavailable" }, { status: 503 });
    return await saveCallRequest(ctx, store._id, req);
  }),
});

/**
 * Organization-scoped routes for each new number / Reception agent.
 * Example: /hotline/v1/<routeKey>/knowledge
 */
http.route({
  pathPrefix: "/hotline/v1/",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const pathname = new URL(req.url).pathname;
    const match = pathname.match(/^\/hotline\/v1\/([a-f0-9]{32})\/knowledge$/);
    if (!match) return new Response("Not found", { status: 404 });
    const storeId = await ctx.runQuery(internal.hotlines.secretMatches, {
      routeKey: match[1],
      secretHash: await secretHash(presentedSecret(req)),
    });
    if (!storeId) return new Response("Unauthorized", { status: 401 });
    const store = await ctx.runQuery(internal.stores.byId, { id: storeId });
    if (!store || store.isDemo)
      return Response.json({ error: "Location unavailable" }, { status: 503 });
    return await respondWithKnowledge(ctx, store._id, store.name, store.facts);
  }),
});

http.route({
  pathPrefix: "/hotline/v1/",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const pathname = new URL(req.url).pathname;
    const match = pathname.match(/^\/hotline\/v1\/([a-f0-9]{32})\/requests$/);
    if (!match) return new Response("Not found", { status: 404 });
    const storeId = await ctx.runQuery(internal.hotlines.secretMatches, {
      routeKey: match[1],
      secretHash: await secretHash(presentedSecret(req)),
    });
    if (!storeId) return new Response("Unauthorized", { status: 401 });
    const store = await ctx.runQuery(internal.stores.byId, { id: storeId });
    if (!store || store.isDemo)
      return Response.json({ error: "Location unavailable" }, { status: 503 });
    return await saveCallRequest(ctx, store._id, req);
  }),
});

export default http;
