# Reception setup status

- Workspace: Holiday Hotline — Demo
- Receptionist: Holiday Helper · DCF Demo
- Customer-facing greeting: “Holiday Helper! You’ve reached the Desert Community
  Foundation demo line. How can I help?”
- Scope: clearly labeled product demonstration; not an official Foundation
  information, donor-support, or emergency service
- Model: GPT-5.4 Mini, reasoning effort None
- Voice: Jason stock voice
- Knowledge connection: the Reception instructions use an authenticated Convex
  `get_currently_verified_holiday_updates` webhook for manager-approved live
  updates from the DCF demonstration desk. A text chat verified the full
  request and answer path.
- Privacy and operations: no bookings, registrations, client lookup, messages,
  callbacks, or payments are enabled. A human-transfer rule is configured for
  questions the line cannot verify or callers who ask for a person; its live
  transfer behavior remains untested. Opt-in email follow-up is staged through
  the separate manager desk workflow.
- Procedures: all five inherited booking, registration, change, and callback
  procedures are explicitly disabled and contain no operational steps
- Associate desk: real-time Holiday Helper coverage is deployed with Ready,
  Helping, and Not staffed states; managers use one Live updates card while
  Reception's native overview remains one-time setup only
- Verified: a manager-approved Thanksgiving Day closure was retrieved through
  Convex and answered correctly in Reception text chat.
- Unverified: consented email delivery, completed human transfer, and inbound
  audio call
- Payments: no paid subscription selected

The dedicated number and the knowledge webhook are configured, but the complete
phone-to-associate-to-email workflow has not been demonstrated. The public ChatGPT Site is live; the dedicated phone line remains a clearly
labeled product demonstration.
