# AgentMail setup status

- Organization: Holiday Hotline development workspace
- Inbox: `Holiday Hotline <hotline@agentmail.to>`
- Plan: free tier
- Credentials: an inbox-scoped key is stored only in the Convex development deployment
- Permissions: read and send mail for this inbox; no inbox, domain, webhook, or key management permissions
- Delivery: the Convex reply workflow is configured to use this inbox
- Testing: one dashboard delivery test was submitted to an explicitly approved
  recipient on 2026-09-20. A separate manager-reviewed reply through the live
  Convex workflow reached AgentMail with a provider message ID and no delivery
  error on 2026-09-22. This confirms the inbox send path and Convex-driven
  delivery handoff; final inbox placement remains provider- and recipient-dependent.
- Retention: the app schedules deletion of each real shopper request and its
  attached photo seven days after intake. The provider's sent-mail retention is
  governed separately by its account settings.

Before a live test, use an explicitly approved test recipient and verify the
message is delivered from the Holiday Hotline inbox. Do not enable phone callers'
email collection until consent language and the ElevenLabs request tools are live.
