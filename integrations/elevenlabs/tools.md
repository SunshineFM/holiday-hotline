# Phone connection contract

Two server tools connect the receptionist to Convex. This is the app's contract,
not an ElevenLabs API provisioning payload. Set the tools up in the selected
ElevenLabs interface and verify the actual supported configuration.

Both require `Authorization: Bearer <ELEVENLABS_TOOL_SECRET>` as a secret header.
The same random secret (at least 32 characters) must exist in Convex. Do not put
the secret in URLs, prompts, browser code, or this file. Configure Reception
with the bare secret after `Bearer `; it must not include the environment-variable
name. The development endpoint also accepts Convex's exact
`ELEVENLABS_TOOL_SECRET=<secret>` export form for a controlled setup path, but
the standard bearer form is the saved production-like configuration. Never remove
backend authentication to make a demo work.

Use the selected cloud deployment's `https://<deployment>.convex.site` HTTP
origin. Local ports cannot receive calls from ElevenLabs. Each deployed pilot
currently serves one store selected by `HOTLINE_STORE_SLUG`; callers cannot
choose another store ID. A multi-store service needs separate authenticated
routing before launch.

## get_store_answers

- Method: GET
- Path: `/hotline/knowledge`
- Inputs: none
- Purpose: Retrieve approved, unexpired store answers before answering a caller.
- Result: store name, approved question/answer pairs, and the current
  `helperStatus` (`ready`, `with-shopper`, or `off`).
- Failure: 401 for missing/wrong secret; 503 when no real pilot is configured.

## ask_store_associate

- Method: POST
- Path: `/hotline/requests`
- Content type: application/json
- Purpose: Save a shopper's request only after confirming their email and consent.

Required body fields:

| Field | Type | Meaning |
| --- | --- | --- |
| requestKey | string | Stable ID for this request; reuse on retry, maximum 200 characters |
| item | string | Item, color and size, maximum 200 characters |
| detail | string | What the associate should check, maximum 2,000 characters |
| timeframe | string | Shopper's stated timing, maximum 200 characters |
| shopper | string | First name, maximum 200 characters |
| email | string | Read back and confirmed, maximum 254 characters |
| emailConsent | boolean | Must be true after the shopper agrees to the email follow-up |

Success returns a requestId and status `waiting`. It does not mean inventory is
available, email has been sent, or a live call has been transferred. Retrying
with the same requestKey returns the existing request. Configure a short server
timeout and test tool failure language.

## Current setup and remaining checks

1. `get_store_answers` is configured as an authenticated GET webhook for the
   DCF demonstration receptionist. A text chat check verified that ElevenLabs
   reaches the route with a valid header. Its route selects the configured pilot
   slug and returns only approved, unexpired facts.
2. The manager must review and approve a public fact, then test that fact in
   Reception. No organization facts are currently approved, so the verified
   chat correctly declined to guess.
3. `ask_store_associate` is implemented in Convex but intentionally not enabled
   in Reception. It needs a consent-specific conversation, parameter mapping,
   retention test, and a user-authorized test email.
4. Human transfer is not configured. It needs a designated destination number
   and a live test before it can be offered to callers.
5. Test an approved FAQ, an unknown detail, the tool's unauthorized response,
   consent refusal, wrong email, duplicate request, image reply, failed email
   send, and an inbound phone call before an open pilot.

## Sources checked

- [Reception webhook tools](https://elevenlabs.io/docs/reception-ai/integrations/webhooks)
  support active calls to endpoints; the documentation specifies Basic plan or higher.
- [Reception phone numbers](https://elevenlabs.io/docs/reception-ai/features/phone-numbers)
  describes a dedicated US number and an area-code preference during onboarding.
- [AgentMail sending](https://docs.agentmail.to/api-reference/inboxes/messages/send)
- [Firecrawl scrape](https://docs.firecrawl.dev/api-reference/endpoint/scrape)

The full phone/email/provider path remains unverified. The browser demo is the
validated part of the product so far. Before an open public pilot, add usage
limits and retention cleanup and test real provider failure modes.
