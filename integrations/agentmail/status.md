# AgentMail setup status

- Organization: Holiday Hotline development workspace
- Inbox: `Holiday Hotline <hotline@agentmail.to>`
- Plan: free tier
- Credentials: an inbox-scoped key is stored only in the Convex deployment
- Permissions: read and send mail for this inbox; no inbox, domain, webhook, or key-management permissions
- Delivery: the Convex team-response workflow uses this inbox
- Testing: one dashboard test was sent to an explicitly approved recipient on 2026-09-20. A separate manager-reviewed response through the live Convex workflow reached AgentMail with a provider message ID and no delivery error on 2026-09-22. This confirms provider acceptance; inbox placement remains recipient- and provider-dependent.
- Retention: the app schedules deletion of each real caller request and optional photo seven days after intake. Provider sent-mail retention is controlled separately in its account settings.

Before activating a public line, test the live Reception consent wording, save one request, send one approved response, and verify it arrives at an explicitly approved recipient. Do not collect caller email until the consented Reception request tool is configured.
