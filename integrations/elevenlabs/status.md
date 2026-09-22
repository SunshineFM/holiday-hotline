# Reception setup status

- Workspace: Holiday Hotline — Demo
- Receptionist: Holiday Helper · DCF Demo
- Customer-facing greeting: “Holiday Helper! You’ve reached the Desert Community Foundation demo line. How can I help?”
- Scope: clearly labeled product demonstration; not an official Foundation information, donor-support, or emergency service
- Model: GPT-5.4 Mini, reasoning effort None
- Voice: Jason stock voice
- Knowledge connection: the current DCF demonstration uses an authenticated Convex webhook for manager-approved live updates. A Reception text chat verified the request and answer path for an approved Thanksgiving closure.
- Manager workflow: the updated desk uses one operating brief, a review queue, and individual approval. Reception’s native overview is one-time setup only; managers do not update the same facts in two places.
- Human exception: a Reception transfer rule is saved for requests to speak with a person, questions that go beyond approved information, or facts Holiday Helper cannot verify.
- Email follow-up: the separate manager desk supports a caller-consented request and a manager-reviewed AgentMail response. Its provider handoff has been tested; live Reception request-tool mapping remains to be configured and tested.
- Payments and sensitive workflows: no payments, bookings, client lookup, registrations, messages, callbacks, or data collection are enabled.

## Migration state

The existing DCF tool still uses the original single-pilot `/hotline/knowledge` endpoint. New location-scoped endpoints are now available for every new organization, with a distinct route key and secret hash. Move the DCF demo to that route only during an authorized live test, so the existing demonstration remains stable.

## Remaining live checks

- Place and listen to an inbound call on the dedicated number.
- Confirm the saved human-transfer rule reaches an authorized destination.
- Enable and test the explicit-consent request tool in Reception.
- Confirm the AgentMail message reaches an approved inbox recipient.
- Migrate the DCF tool to its new scoped connection before adding a second location.
