# Production change request — reporting contract 019

Status: REQUEST ONLY, NOT EXECUTED. Date: 2026-10-23. Production `czcyarmramlpmilfhpqo` remains untouched. No push/deployment in TASK 019.

## Exact requested scope

After separate owner approval, review and apply **only** these ordered source migrations:

1. `supabase/migrations/20261023124108_reports_complaints_review.sql`
2. `supabase/migrations/20261023125936_reporting_review_http_conflict.sql`

The second file is mandatory: do not enable the first file's 40001 conflict implementation alone. Both are transactional, use 5s lock_timeout, and contain no test-user seeds, credential/configuration values or historical-data rewrite. Management-tool test execution versions differ from local filenames; the exact mapping and SHA256 are in `reports-complaints-019.md`. Do not blindly run a full db push or repair any unrelated historical ledger.

Dependencies: existing `auth.uid()`/authenticated and anon roles; current profiles(id,username), posts(id), comments(id,post_id,parent_comment_id); UUID support; current public-read visibility contracts. Review those specific production dependencies read-only before any approval. The reporting migration does not require reapplying the separate reply-integrity migration and does not alter existing Auth/RLS/Storage policies.

Impact: one new public RLS table, four private RLS tables, four guarded RPCs, private append-only function, two protective triggers and three indexes; no content deletion/ban/automatic punishment. No existing post/comment data rewrite or FK/cascade change. Case reporter and target UUIDs are deliberately not cascading FKs. Expected initial data volume small; operational retention remains an owner decision. Risk: MODERATE because this introduces private complaint data and privileged narrow RPC boundaries, despite successful isolated adversarial acceptance.

## Conditions before enablement

- Review migration text, dependency/visibility contract, effective grants and advisor design exceptions.
- Approve a trusted human reviewer-provisioning and revocation process. No synthetic account IDs or user_metadata authority; no public membership writes.
- Approve retention, public-result wording, rate policy (10 new cases/user/hour), human-only decision procedures and incident handling.
- Separately review a source change extending the **exact project allowlist** to Production. Current TASK 019 code allows only the isolated test project; setting a global constant true is prohibited.
- Use existing legitimate production configuration; do not copy test `.env`, user rows, credentials, sessions or fault/pagination fixtures.
- Apply both approved migrations while database flag remains default false. Inspect catalog/grants, then independently approve application/server + DB opt-in and deployment. Authentication policy remains unchanged.
- Plan minimal production read-only smoke and ordinary-user permission verification under separately authorized data rules; keep synthetic write regression on the test project.

## Stop / rollback

If either migration transaction fails, its DDL rolls back; keep feature off and investigate. Never disable account security to work around it. If only the first migration succeeds, leave feature off until the second succeeds.

For runtime privacy, authorization or integrity regression: disable the server opt-in and set database configuration enabled=false through approved management; this blocks new submissions, reviews and case SELECT through RLS. Revoke problematic RPC EXECUTE if separately approved and necessary. Preserve all cases, idempotency records and audit history. Do not DROP tables, DELETE cases or restore the 40001 RPC as a rollback shortcut. Existing unrelated community functions remain available.

No production change is authorized by preparation or by the test-only migration permissions. Next owner action: review this request and explicitly approve or defer the production database/configuration/deployment phases separately.
