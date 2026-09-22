import { env } from "./_generated/server";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
const http = httpRouter();
auth.addHttpRoutes(http);
function authorized(req: Request) {
  const key = env.ELEVENLABS_TOOL_SECRET;
  const copiedName = "ELEVENLABS_TOOL_SECRET";
  const authorization = req.headers.get("authorization") ?? "";
  const presented = authorization
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
  const accepted = [
    key,
    `${copiedName}=${key}`,
    `${copiedName}="${key}"`,
    `${copiedName}='${key}'`,
  ];
  return !!key && key.length >= 32 && accepted.includes(presented);
}

http.route({
  path: "/hotline/knowledge",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!authorized(req)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const s = await ctx.runQuery(internal.stores.bySlug, {
      slug: env.HOTLINE_STORE_SLUG ?? "",
    });
    if (!s || s.isDemo)
      return Response.json({ error: "Store unavailable" }, { status: 503 });
    const helper = await ctx.runQuery(internal.presence.forStore, {
      storeId: s._id,
    });
    const now = Date.now();
    return Response.json({
      store: s.name,
      facts: s.facts
        .filter((f) => f.approved && (!f.expiresAt || f.expiresAt > now))
        .map((f) => ({ question: f.question, answer: f.answer })),
      helperStatus: helper?.status ?? "off",
      instruction:
        "Only use these manager-approved live updates. Do not confirm unapproved details, collect information, or promise a transfer or callback.",
    });
  }),
});
http.route({
  path: "/hotline/requests",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    if (!authorized(req))
      return new Response("Unauthorized", { status: 401 });
    const text = await req.text();
    if (text.length > 8000)
      return new Response("Request too large", { status: 413 });
    let b: unknown;
    try {
      b = JSON.parse(text);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    if (!b || typeof b !== "object")
      return new Response("Invalid request", { status: 400 });
    const x = b as Record<string, unknown>;
    for (const k of [
      "requestKey",
      "item",
      "detail",
      "timeframe",
      "shopper",
      "email",
    ])
      if (typeof x[k] !== "string")
        return new Response("Missing request details", { status: 400 });
    if (x.emailConsent !== true)
      return new Response("Email permission required", { status: 400 });
    const s = await ctx.runQuery(internal.stores.bySlug, {
      slug: env.HOTLINE_STORE_SLUG ?? "",
    });
    if (!s || s.isDemo)
      return new Response("Store unavailable", { status: 503 });
    try {
      const id = await ctx.runMutation(internal.requests.createFromCall, {
        storeId: s._id,
        requestKey: x.requestKey as string,
        item: x.item as string,
        detail: x.detail as string,
        timeframe: x.timeframe as string,
        shopper: x.shopper as string,
        email: x.email as string,
        emailConsent: true,
      });
      return Response.json({
        requestId: id,
        status: "waiting",
        message:
          "The request is saved. An associate will check when available. Do not promise a response time or that the item is reserved.",
      });
    } catch {
      return Response.json(
        { error: "Please check the request details and email address." },
        { status: 400 },
      );
    }
  }),
});
export default http;
