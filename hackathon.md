# Hackathon log

- **Project:** Holiday Hotline
- **Event:** Convex All Gas Hackathon
- **What it does:** Gives local managers one approval workflow to keep a voice hotline current, with associate follow-up when needed.
- **Live app:** not deployed
- **Repo:** private
- **Frontend:** Codex Sites
- **Convex deployment:** https://neighborly-curlew-329.convex.cloud
- **Components:** none
- **Convex features:** schema, tables, indexes, queries, mutations, actions, HTTP actions, scheduled functions, file storage, realtime queries
- **Auth:** Convex Auth
- **AI models:** gpt-4.1-mini (website import and live-update drafts, not live-tested); GPT-5.4 Mini (saved in Reception UI, not call-tested)
- **Started:** 2026-09-20T00:16:24Z
- **Last updated:** 2026-09-22T10:31:00Z

## Log

### 2026-09-20 - working tree
Built the local Holiday Hotline Site and associate desk with evergreen, cranberry
and ivory styling. An authenticated practice store receives sample questions,
saves a reply and optional item photo, and displays an explicitly labeled email
preview. Queries keep the desk current and replies persist across reloads.

Added owner checks for store data, photo registration, fact editing and website
imports. Added approval and expiry for store facts, authenticated HTTP tools for
future phone intake, idempotent request creation and replies, and scheduled
AgentMail delivery with explicit failed/uncertain states. Demo requests never
schedule real email. Firecrawl/OpenAI import code produces unapproved drafts.

Chose Convex's built-in transactions, scheduler and file storage for this small
workflow. No registered components are required yet; ElevenLabs owns the voice
conversation. No separate database was introduced. Convex Auth manages private
practice sessions and invitation-only staff access.

Validation: TypeScript check, ESLint and Sites production build passed. Local
integration checks passed for unauthenticated/cross-store access rejection,
duplicate intake, repeated replies, image upload, image ownership, preview-only
mail behavior, protected imports, and webhook authentication. Browser checks
confirmed the practice flow, saved reply after reload, and the read-only WebMCP
tool's valid-input and invalid-input behavior. Responsive checks found no
horizontal document overflow at the measured preview sizes.

Registered a private Site; no version saved or published. Convex remains local.
OpenAI credentials were configured securely in the local backend without logging
secrets. ElevenLabs Reception onboarding is complete after explicit user approval of its
terms. Activated the no-card free trial and provisioned a dedicated phone number.
Configured Sage with a demo greeting, fictional store information, a strict rule
against unconnected follow-ups or bookings, and revised default procedure triggers.
Aligned weekly hours and the sample Christmas Day closure. Verified that Reception
webhook tools support custom request headers. Convex remains local, so the phone
tools cannot connect yet. AgentMail and Firecrawl also need connections and
end-to-end testing. Reception chat testing confirmed the sample Christmas
closure and truthful refusal of unconnected inventory, reservation, email and
booking requests. The test chat was ended; inbound phone audio remains untested.
Prepared the Sage conversation instructions and phone tool contract in
`integrations/elevenlabs/`. No calls, shopper emails, commits, or pushes were made.

Created a separate private GitHub repository for Holiday Hotline and configured
the project folder with its own Git root and origin. Verified that local
credentials and database state are ignored. No source files have been committed
or pushed. Convex account creation is waiting for approval of its terms.

Created the Holiday Hotline Convex development deployment and linked the local
app to it. Deployed the schema, queries, mutations, actions, HTTP actions,
scheduler, file storage, and Convex Auth configuration. The development backend
now holds its own signing keys and the existing OpenAI configuration. Browser
testing created a private fictional demo store, added an item-check request, and
saved a preview reply; no real shopper email or phone request was sent.

Created the AgentMail organization and the `Holiday Hotline <hotline@agentmail.to>`
inbox. Stored an inbox-scoped, read-and-send-only credential in the Convex
development deployment and configured the existing delivery action to use it.
Sent a single dashboard delivery test to an explicitly approved recipient. This
checks the AgentMail inbox sending path; the Convex-driven reply action still
needs its own end-to-end test with a real pilot store.

Reframed the customer experience as Holiday Helper: a concise, upbeat phone
identity without a personal name or a service checklist. Updated the Site and
voice configuration draft, added five desk quick-move choices that draft a
reviewable shopper note, and deployed a real-time Convex line-status control
for the associate covering Holiday Helper. Live call transfer remains
intentionally unavailable until a retailer pilot and a tested transfer tool exist.

Added a seven-day retention limit for real shopper requests and their attached
photos. Convex schedules the private cleanup when a request is created, while
manager-approved store facts remain available for Holiday Helper. The Sites
production build and the development backend deployment passed again.

Connected Firecrawl through the user's GitHub account and stored its project key
only in the Convex development deployment. Verified Firecrawl's authenticated
CLI status and deleted the one-time local key file. The website-import action is
wired but still awaits a real pilot store and manager review test.

### 2026-09-21 - private nonprofit pilot desk

Prepared an invitation-only, pre-phone manager desk for a confirmed local
nonprofit pilot. Its configured organization name, slug, and public website stay
in the Convex development environment rather than source control. Only the
authenticated manager with the separately shared enrollment code can see the
invitation and create the organization’s non-demo desk; the client supplies no
organization or owner identifier. The desk starts with no approved facts. Its
manager can use the existing Firecrawl/OpenAI import to prepare review drafts,
then approve only public, accurate answers before any phone tool can read them.

Firecrawl was used to assess three public pages from the organization’s website.
The useful general-purpose facts were limited to its public mission and community
programs; no hours, event availability, donation processing, donor, applicant,
or other operational information was treated as approved. Raw scrape files and
temporary source material were deleted after the assessment.

Validation: regenerated Convex bindings; TypeScript, ESLint, and Sites
production build passed; and `npx convex dev --once` deployed the functions to
the existing development environment. The activation/import path awaits the
invited manager’s own sign-in and review. No phone calls or additional email were
sent, no source was committed or pushed, and the public Site remains unpublished.

### 2026-09-22 - voice demonstration connection

Connected the development hotline’s authenticated Convex knowledge route to the
dedicated ElevenLabs Reception receptionist and selected the private nonprofit
pilot slug server-side. Renamed the receptionist to Holiday Helper · DCF Demo,
saved the approved DCF demonstration greeting, and made the instructions explicit
that it is not an official Foundation service. The route only returns manager-
approved, unexpired facts; no facts have been approved yet. A text chat verified
the authenticated call reaches Convex and correctly declines to guess when that
approved-fact list is empty.

Review of the first text-only receptionist check found a leftover generic
callback offer. Replaced all inherited booking, registration, change, and
callback procedures with explicit no-op safeguards. The line now cannot create
records, book, register, collect contacts, promise a callback, email, or transfer
a caller. The next validation is an approved public fact answered through the
webhook, followed by a user-authorized email test and a real phone test once a
transfer destination and consent flow are configured. No audio call, follow-up
email, public launch, commit, or push was made.

### 2026-09-22 - one manager workflow

Reframed the manager experience around one Live updates card. A manager writes a
plain-language holiday brief, and the existing OpenAI connection prepares only
the small set of relevant review drafts. The manager must approve and save them before the Convex
knowledge route exposes it to the Reception line. If drafting is unavailable,
the original note becomes an unapproved review draft rather than blocking the
manager. The same card can use Firecrawl to prepare up to five public-site
starting drafts, which also require manager approval and never automatically
change the line. Reception remains the caller-facing engine with a one-time
configuration; it is no longer a second manager-maintained fact catalog.

The website review was further narrowed to a three-item maximum holiday
operations audit. It deliberately excludes directory-style information such as
missions, staff, contact details, locations, general programs, and evergreen
FAQs. When a public page has no dated holiday operating information, the desk
returns that finding instead of manufacturing generic questions.

The previously approved generic Foundation facts were intentionally cleared
from the private development desk and its knowledge route. The new Holiday
brief guides managers to four caller-driven areas instead of a preset FAQ list:
hours and closures; availability and service; pickup, wrapping, and deadlines;
and returns or other temporary exceptions.

### 2026-09-22 - verified manager-to-voice loop

The manager entered and approved five DCF holiday closure facts through the
single Holiday Brief workflow: Thanksgiving Day, Black Friday, Christmas Day,
New Year’s Eve, and New Year’s Day. Reception was then tested in text chat with
“Is the Desert Community Foundation office open on Thanksgiving Day?” It called
the authenticated Convex live-updates webhook and answered: “No, the DCF office
is closed on Thanksgiving Day.” This verifies the core manager-approved update
path from Convex through the Reception agent. Inbound audio, call transfer, and
consented email remain outside this test.

### 2026-09-22 - manager-reviewed AgentMail handoff

A real, explicitly approved test follow-up was completed through the non-demo
manager desk. Convex queued the manager-reviewed reply, its delivery action
sent it through the configured AgentMail inbox, and the request recorded a
provider message ID with no delivery error. This verifies the Convex-to-AgentMail
handoff. It does not claim guaranteed inbox placement; that remains dependent
on the provider and recipient mailbox.
