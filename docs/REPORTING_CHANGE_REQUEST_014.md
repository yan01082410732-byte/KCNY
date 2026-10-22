# Change Request — report/complaint persistence and human review

Date: 2026-10-21 KST. Proposal only. No migration, RLS, Auth configuration, or Production change is authorized by Feature Delivery 014.

## Existing-contract finding

The current main-site migrations define profiles, posts, comments, social interactions and notifications, but no report/complaint table, reporting policy, or trusted administrator role. Notification types are fixed to community activity. An application-only form cannot honestly acknowledge a report or show its status. The new UI therefore disables submission and shows a bilingual unavailable notice; the server action also rejects forged requests without writing.

## Requested separately authorized design

1. Approve a `reports` data contract with an opaque ID, reporter ID, target type and identifier, reason, optional description, status, creation/review timestamps and a human decision audit trail. Decide whether general complaints can omit a target and whether deleted content requires an evidence snapshot. Minimize and retain complaint text according to an approved privacy schedule.
2. Define authenticated INSERT for the reporter; reporter-scoped SELECT of safe status fields only; deny reporter UPDATE/DELETE. Do not expose another reporter's identity, complaint text or evidence. Define a separate reviewer view/access path with explicit trusted server-side authorization. Never infer admin status from user-editable metadata.
3. Approve exact reviewer authority and status transitions, reviewer attribution, immutable audit entries and dispute handling. Test anon, reporter A, reporter B and reviewer allow/deny paths under RLS and database grants.
4. Define duplicate-report policy and idempotency key or uniqueness rule. Rate-limit submissions without losing legitimate safety reports. Decide permitted categories, target existence checks and cross-target consistency.
5. If AI assistance is later authorized, integrate only through a reviewed contract. AI classification, risk, summary and translation remain suggestions; human decisions are separate records. Minimize evidence sent to TASK B and never send credentials, tokens or unrelated personal data.

## Authorization and rollout gates

- Independent schema/privacy/security review and explicit DB migration authorization.
- Isolated database tests for grants, RLS, status transitions and reporter confidentiality before any remote application.
- Separate Preview deployment and two-account plus reviewer acceptance. No service-role key in client code.
- Explicit approval before Production deployment or AI integration. Feature Delivery 014 does not authorize any of these steps.

Rollback must disable new submission/review paths, preserve submitted records for audit rather than deleting them, and reverse only approved schema objects after retention and data-export decisions. Exact SQL and rollback cannot be finalized before the data contract, admin authority and retention policy are chosen.
