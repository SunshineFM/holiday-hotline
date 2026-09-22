import assert from "node:assert/strict";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Only creates isolated fictional demo data on the local backend. Never sends mail.
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
assert(
  url && ["localhost", "127.0.0.1"].includes(new URL(url).hostname),
  "Local backend required",
);
const guest = new ConvexHttpClient(url, { logger: false });
async function session() {
  const client = new ConvexHttpClient(url, { logger: false });
  const result = await client.action(api.auth.signIn, {
    provider: "anonymous",
  });
  assert(result.tokens?.token, "Authentication returned a token");
  client.setAuth(result.tokens.token);
  return { client, storeId: await client.mutation(api.stores.startDemo, {}) };
}
const a = await session();
const b = await session();
assert.notEqual(a.storeId, b.storeId);
await assert.rejects(guest.query(api.requests.list, { storeId: a.storeId }));
await assert.rejects(b.client.query(api.requests.list, { storeId: a.storeId }));
await assert.rejects(
  b.client.mutation(api.updates.createDrafts, {
    storeId: a.storeId,
    briefText: "Closed this afternoon.",
    scope: "today",
    effectiveAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    source: "manager",
    drafts: [{ question: "Are you open?", answer: "Closed this afternoon." }],
  }),
);
await assert.rejects(
  b.client.mutation(api.requests.generateUploadUrl, { storeId: a.storeId }),
);
const args = {
  storeId: a.storeId,
  example: "special",
  requestKey: crypto.randomUUID(),
};
const id = await a.client.mutation(api.requests.addExample, args);
assert.equal(
  await a.client.mutation(api.requests.addExample, args),
  id,
  "Duplicate intake is idempotent",
);
await assert.rejects(
  b.client.mutation(api.requests.reply, {
    id,
    answer: "Unauthorized",
    responseKind: "answered",
  }),
);
await assert.rejects(
  a.client.mutation(api.requests.reply, {
    id,
    answer: " ",
    responseKind: "answered",
  }),
);

const draftIds = await a.client.mutation(api.updates.createDrafts, {
  storeId: a.storeId,
  briefText: "Today only: the lounge opens at 4.",
  scope: "today",
  effectiveAt: Date.now(),
  expiresAt: Date.now() + 60_000,
  source: "manager",
  drafts: [
    {
      question: "When does the lounge open?",
      answer: "The lounge opens at 4 today.",
    },
  ],
});
assert.equal(draftIds.length, 1);
await assert.rejects(
  b.client.mutation(api.updates.setApproval, {
    id: draftIds[0],
    approved: true,
  }),
);
await a.client.mutation(api.updates.setApproval, {
  id: draftIds[0],
  approved: true,
});
const updates = await a.client.query(api.updates.list, { storeId: a.storeId });
assert.equal(updates[0].status, "approved");
const connection = await a.client.mutation(api.hotlines.provision, {
  storeId: a.storeId,
});
assert.equal(connection.routeKey.length, 32);
assert(connection.toolSecret.length >= 32);
await assert.rejects(
  b.client.mutation(api.hotlines.provision, { storeId: a.storeId }),
);

const uploadUrl = await a.client.mutation(api.requests.generateUploadUrl, {
  storeId: a.storeId,
});
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=",
  "base64",
);
const upload = await fetch(uploadUrl, {
  method: "POST",
  headers: { "Content-Type": "image/png" },
  body: png,
});
assert.equal(upload.ok, true);
const { storageId } = await upload.json();
await a.client.mutation(api.requests.registerPhoto, {
  storeId: a.storeId,
  storageId,
});
await assert.rejects(
  b.client.mutation(api.requests.registerPhoto, {
    storeId: b.storeId,
    storageId,
  }),
);
await a.client.mutation(api.requests.reply, {
  id,
  answer: "Fictional update checked. No reservation.",
  responseKind: "answered",
  photoId: storageId,
});
await a.client.mutation(api.requests.reply, {
  id,
  answer: "Duplicate reply",
  responseKind: "checking",
});
const records = await a.client.query(api.requests.list, { storeId: a.storeId });
assert.equal(records.length, 1);
assert.equal(records[0].status, "preview", "Demo cannot queue real email");
assert.equal(records[0].answer, "Fictional update checked. No reservation.");
assert.equal(records[0].messageId, undefined);
const photoUrl = await a.client.query(api.requests.photo, { id });
assert(photoUrl);
assert.equal((await fetch(photoUrl)).status, 200);
await assert.rejects(b.client.query(api.requests.photo, { id }));
await assert.rejects(
  a.client.action(api.onboarding.importWebsite, {
    storeId: a.storeId,
    url: "https://example.com",
  }),
);
const http = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "http://127.0.0.1:3211";
assert(["localhost", "127.0.0.1"].includes(new URL(http).hostname));
assert.equal((await fetch(`${http}/hotline/knowledge`)).status, 401);
assert.equal(
  (await fetch(`${http}/hotline/requests`, { method: "POST", body: "{}" }))
    .status,
  401,
);
await a.client.action(api.auth.signOut, {});
await b.client.action(api.auth.signOut, {});
console.log(
  "PASS: isolated authentication, organization updates, connection provisioning, request deduplication, reply idempotency, demo email isolation, protected photos/imports, and webhook authentication.",
);
