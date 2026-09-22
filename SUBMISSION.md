# Convex All Gas Hackathon submission package

## Entry

**Project name:** Holiday Helper

**One-line description:** A manager-approved, live holiday hotline that gives local businesses one place to update their phone agent—and a fast path to a human when the agent needs help.

**Short submission description:**

Holiday Helper helps local teams stay helpful when holiday questions surge. A manager speaks or types one short Holiday Brief such as “closed Thanksgiving Day, gift wrapping through December 24, ask an associate to check a specific item.” OpenAI turns it into a few review drafts. The manager approves the facts once, and Convex becomes the live source of truth for an ElevenLabs Reception phone agent.

The agent retrieves only approved, unexpired facts while it is talking to the caller. It answers routine questions right away; if it cannot verify an answer or the caller asks for a person, the Reception transfer rule hands off to a human. With the caller’s permission, an associate can also send a manager-reviewed follow-up through AgentMail. Firecrawl provides optional public-site starting drafts for a manager to review, never automatic publishing.

This is designed for independent retailers, local services, and community organizations that need to stay agent-ready without adding another system to maintain. The first demo uses a clearly labeled Desert Community Foundation demonstration line, not an official Foundation service.

## The problem

Holiday information becomes stale fastest when a local team has the least capacity to keep it updated. A single change in hours, availability, or a seasonal exception can live differently across a website, a directory listing, voicemail, and staff memory. Callers then wait for an employee who is already helping someone in person.

Most voice systems create a second content-maintenance job. Holiday Helper avoids that. The manager uses one plain-language update card; their approval controls exactly what the phone agent can say.

## Why Convex

Convex is the runtime backbone rather than just a database:

- it stores facts, associate requests, and manager approval state;
- live queries keep the associate desk current as the helper’s coverage changes;
- an authenticated HTTP action returns the current approved facts to Reception during a conversation;
- scheduled functions remove pilot follow-up requests after seven days;
- an action sends approved responses through AgentMail; and
- server-side organization selection and ownership checks prevent a client from choosing another organization’s facts.

## Sponsor use

| Sponsor | Demonstrable use |
| --- | --- |
| Convex | Live fact state, realtime desk, authenticated voice tool, scheduler, secure follow-up workflow |
| OpenAI | Converts a manager’s Holiday Brief into limited, reviewable update drafts |
| Firecrawl | Finds dated, holiday-specific public website details for manager review |
| AgentMail | Delivers an opt-in, associate-reviewed follow-up email |

ElevenLabs Reception provides the voice layer for the dedicated Holiday Helper number.

## Current proof

The manager-to-voice loop is verified. In the DCF demo desk, a manager approved five seasonal closure facts. In an ElevenLabs Reception text conversation, Holiday Helper fetched the approved facts through the authenticated Convex tool and answered the question “Is the Desert Community Foundation office open on Thanksgiving Day?” with “No, the DCF office is closed on Thanksgiving Day.”

A Reception human-transfer rule is configured. A manager-reviewed AgentMail reply to an explicitly approved test recipient completed with a provider message ID and no delivery error. The live inbound-audio and completed-transfer checks are the next live-demo validation items.

## Three-minute video script

**0:00–0:18 — show the problem**

> “Local teams get their busiest phone calls when their holiday information changes most. Updating hours, exceptions, pickup details, and availability across every channel becomes another job. Holiday Helper gives them one manager-approved source of truth for the phone.”

Show the Holiday Helper landing screen and the live line status.

**0:18–0:55 — show the one-card manager workflow**

> “The manager does not fill out a long FAQ. They give Holiday Helper one short brief—by typing or dictation. OpenAI turns that into a small set of proposed updates. The manager reviews and approves only the statements they want callers to hear.”

Show the Holiday Brief card, the microphone, and new review drafts at the top. Approve one fact.

**0:55–1:27 — show why the facts are live**

> “Once approved, Convex stores the current fact and makes it available instantly. The phone agent does not rely on a static script or copied website content. During the conversation, it fetches the manager-approved, unexpired update from Convex.”

Show the approved facts and ElevenLabs Reception text chat. Ask the Thanksgiving question and show the correct answer.

**1:27–1:52 — show the safe human handoff**

> “When the answer needs a person—an inventory check, a special request, or simply a caller who asks for someone—the Reception transfer rule hands off. Holiday Helper never guesses.”

Show the Reception transfer rule and its plain-English trigger. Do not reveal a phone number.

**1:52–2:21 — show the consented follow-up**

> “If a person needs to check something and the caller opts in, an associate gets one compact request card. They reply after checking, and Convex sends the manager-reviewed answer through AgentMail. Pilot request details are deleted after seven days.”

Show the associate card, reply field, and send status. Use the test email only if its delivery has completed before recording.

**2:21–2:45 — explain Firecrawl and close**

> “Before the season begins, Firecrawl can inspect a public site for dated holiday operations details. It produces starting drafts for the manager to approve—it never puts web content straight on the line. Holiday Helper makes local businesses agent-ready without asking their teams to manage another system.”

Show the site-review action and the “manager approval required” wording. End on the Holiday Helper line status.

## Screenshot list for the entry page

1. Landing page: Holiday Helper promise and available line status.
2. Manager desk: one Holiday Brief plus small review queue.
3. Approved update: a closure fact marked manager-approved.
4. Reception chat: the verified Thanksgiving question and answer.
5. Associate desk: the compact follow-up request and AgentMail delivery state.

## Before submitting

- [ ] Replace the local-site placeholder with a public `chatgpt.site` URL and test it in a signed-out browser.
- [ ] Make the GitHub repository public, push the source, and confirm `hackathon.md` is visible at the root.
- [ ] Perform and record one inbound phone test; record a transfer test only with an authorized destination.
- [ ] Record and trim the video to no more than three minutes.
- [ ] Submit at <https://vibeapps.dev/judging/convex-all-gas-hackathon-openai/submit>.
