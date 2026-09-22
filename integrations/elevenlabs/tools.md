# Reception connection contract

Holiday Helper has two webhooks: one returns the information a caller may hear; the other saves a concise request only after the caller agrees to email follow-up.

## New location-scoped connection

Each organization or location receives its own route key and one-time tool secret during setup:

```text
GET  https://<deployment>.convex.site/hotline/v1/<routeKey>/knowledge
POST https://<deployment>.convex.site/hotline/v1/<routeKey>/requests
Authorization: Bearer <one-time-tool-secret>
```

The secret goes only in the provider’s hidden request header. Do not put it in a prompt, URL, browser code, or repository. Convex stores a SHA-256 hash, not the secret itself. A valid key can access only its linked location.

`GET /knowledge` returns the location name, manager-approved updates that are currently effective, and whether a person is available. Reception must use only those answers. If it cannot verify a detail, it should follow the saved transfer rule or say that a person can help when available.

`POST /requests` accepts only a caller who has explicitly agreed to receive an email:

| Field          | Meaning                                      |
| -------------- | -------------------------------------------- |
| `requestKey`   | Stable request ID. Reuse it on retry.        |
| `topic`        | What the caller wants checked.               |
| `detail`       | The concise question for the team.           |
| `timing`       | The caller’s stated timing, such as “today.” |
| `callerName`   | The name the caller provides.                |
| `email`        | Email read back and confirmed by the caller. |
| `emailConsent` | Must be `true` only after the caller agrees. |

A successful request only means that the team queue accepted it. It never means that availability, a reservation, a callback, or a transfer is promised.

## Existing DCF demonstration

The existing DCF Reception configuration continues to use the original authenticated `/hotline/knowledge` route while it is being controlled-migrated. That legacy route supports the current demo only. Configure a new location-scoped route before activating any additional organization.

The Reception greeting remains:

> “Holiday Helper! You’ve reached the Desert Community Foundation demo line. How can I help?”

The saved transfer rule should be used when a caller asks for a person, needs help beyond the manager-approved updates, or asks something Holiday Helper cannot verify. Do not transfer routine questions it can answer from the live updates.

## Required live validation

Before offering a line publicly, test one authorized inbound call, one approved update, one unknown question, one completed transfer, one consent refusal, one consented request, and one delivered email. Do not enable payments, booking, client lookup, registration, or automatic data collection for the first pilot.
