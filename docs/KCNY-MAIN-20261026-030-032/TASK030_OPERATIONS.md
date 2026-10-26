# TASK 030 — 举报运营、资料请求与留存操作

Date: 2026-10-26 (Asia/Seoul). Scope: main site only. This is an operating guide and a **production approval request**, not production execution authority. Production reporting stays **OFF/OFF**, and the new operations opt-in stays OFF. No account seeds, automated deletion, AI calls or production schedule are included.

Source contract: `supabase/migrations/20261026082221_reporting_operations_privacy_030.sql`. Management template: `ops/reporting-operations-030.sql` (commented placeholders only; do not execute as a script).

## Boundaries and gates

- Application: both `KCNY_REPORTS_ENABLED=true` and `KCNY_REPORTING_OPERATIONS_ENABLED=true`, together with the existing exact project/environment allowlist. Production project recognition is not permission to enable it.
- Database: existing `reporting_private.configuration.enabled` plus new `reporting_private.operations_configuration.enabled`; both are checked independently of UI visibility. The new table defaults `enabled=false`, `policy_approved=false`, `policy_version='candidate-90d-v1'`.
- Real authenticated identity is verified server-side with `getUser()`. Reviewer RPCs also check current private reviewer membership. Neither `user_metadata`, client-supplied actor IDs nor a hidden button grants permission.
- Only the independently verified test project `kirvcbkbkvotnsqnbcyf` may be changed during this batch. Never fall back to production `czcyarmramlpmilfhpqo`. Do not copy synthetic reviewers or test IDs into production.
- The 90-day closed-case rule and 30-day open-case review queue are internal **candidate-review rules**, not statements of legal compliance. Policy approval, a reviewer decision and actual sensitive-content clearing are three separate events.

## Reviewer binding: explicit owner UUID and management approval

Before any production reviewer grant, obtain a trusted, explicit binding between the project owner and an existing production Auth UUID, plus a recorded approval reference. An authenticated browser alone, a matching nickname/email, registration order or a synthetic test account is not sufficient evidence. Keep identity evidence out of public source and complaint text.

The authorized management connection must independently verify its project identity and run as PostgreSQL `postgres`. `reporting_private.set_reviewer(p_user_id uuid, p_enabled boolean, p_approval_reference text) → jsonb` is SECURITY INVOKER and management-only. It requires an existing confirmed, non-deleted, non-anonymous Auth user and an approval reference of 5–120 permitted ASCII characters (`A–Z`, `a–z`, digits, `. _ : / -`, with an alphanumeric first character).

- Grant: exact verified UUID, `p_enabled=true`, exact approved reference.
- Revoke: the same verified UUID, `p_enabled=false`, a recorded revocation reference.
- Result: `{granted, changed}`. Granting an already-present member or revoking an absent member does not create a second membership, but every invocation appends a management event with actor, time, reference and whether membership changed.
- After revocation, use that user's real ordinary session to verify reviewer RPC rejection; do not prove authorization with a privileged management session. Do not grant general administrator privileges or frontend membership writes.

## User and reviewer RPCs

All public RPCs below use the real caller session; no service-role credential is required or supplied to the client.

| RPC signature | Caller and effect |
| --- | --- |
| `report_operations_access() → boolean` | Authenticated access gate; combines reporting and operations database opt-ins. |
| `submit_report_data_request(p_report_id uuid, p_request_id uuid, p_kind text, p_details text) → uuid` | Own, uncleared case only. Kind `access`, `correction` or `deletion`; trimmed details 10–1000 characters. Same caller/request ID and payload return the same persisted ID; different payload yields PT409. At most 5 new requests per caller per rolling day. |
| `report_operations_overview(p_case_id uuid default null) → jsonb` | Fresh trusted reviewer only. At most 20 metadata-only due candidates, an optional exact selected case, at most 20 recent requests and current policy approval. Load errors are not an empty queue. Use an exact selected ID to verify a saved decision after it leaves the due queue. |
| `record_report_retention(p_report_id uuid, p_expected_case_version integer, p_expected_review_version integer, p_decision text, p_hold text, p_reason text, p_next_review_at timestamptz) → jsonb` | Fresh reviewer; expected versions prevent lost updates. Decision `retain` or `eligible_for_clear`; hold `none`, `appeal`, `legal` or `investigation`; reason 5–1000 characters; future next review within 366 days. Returns the new review version, decision and next review time. **Never clears text.** |
| `review_report_data_request(p_request_id uuid, p_expected_version integer, p_next_status text, p_public_response text, p_internal_reason text, p_approval_reference text) → integer` | Fresh reviewer; `pending → under_review → approved/rejected` only. Internal reason 5–1000 characters, public response at most 2000 and nonempty for final review. Approval requires a valid reference. Status and review event commit atomically; the returned incremented version is required before reporting success. |
| `report_operations_history(p_report_id uuid) → jsonb` | Fresh reviewer; at most 100 operation metadata events, ordered by time and ID. No free-text internal note is returned by this history RPC. |

The user's `/reports/privacy` list uses owner-scoped, deterministic `(created_at DESC, id DESC)` keyset pagination, 20+1 rows per page. Its explicit DTO excludes requester UUID, internal reason and approval reference. The reviewer operations page is `/reports/operations`; complaint text is absent from the due-candidate list. Sensitive input drafts remain only in component memory, not browser storage. Failed saves preserve drafts and do not show success.

### Approval is not fulfillment

An `approved` access, correction or deletion request means **review approved, not executed**. This module does not automatically export records, correct original text or mark arbitrary requests fulfilled. Access/correction need a separately approved secure process, owner identity verification, minimum-data delivery/correction and evidence of actual completion before any future fulfillment transition. No such general fulfillment endpoint is included; do not directly update status or invent an export result. An approved access/correction request blocks retention clearing until genuinely resolved under an approved follow-up contract.

Only a successful management `redact_case` can fulfill an already-approved deletion request in this implementation. Existing pending/under-review requests block clearing. Other approved non-deletion requests also block clearing.

## Actual sensitive clearing: management-only and case-scoped

`reporting_private.redact_case(p_report_id uuid, p_expected_version integer, p_approval_reference text) → jsonb` is SECURITY INVOKER and executable only through the authorized `postgres` management path. It requires separately approved policy, an exact case authorization reference, current case version, a resolved/dismissed case closed at least 90 days according to the case's `updated_at`, and a saved `eligible_for_clear` review with `hold='none'`. An eligible decision alone does not authorize a production execution.

The function locks the case and review, creates a case/backend/transaction-scoped capability in the inaccessible private table, performs the bounded single-case operation and removes that capability before commit. It never disables triggers. Ordinary users and reviewers cannot manufacture this capability, directly change/delete audit records or execute this private function.

Cleared material includes:

- Case reporter and target identity references, reason, description and public resolution. UUID references are replaced by the fixed non-user sentinel; the case is not deleted and `content_cleared_at` records completion.
- Duplicated original request payloads in `reporting_private.requests` and privacy-request idempotency keys. Their previous mappings expire; this deliberately removes the payload/identity copy rather than keeping a hidden indefinite duplicate. A cleared case cannot accept a fresh data request.
- Review-event actor identity, decision reason and internal note; operation-event actor identity.
- Privacy-request requester identity, details and public response; reviewer identity, internal reason and approval-reference text in the current private request review.
- Retention-review reason and reviewer identity. Its decision becomes `cleared` and next review is removed.

Preserved: case ID/kind/status, original case chronology, audit/event IDs, event order, from/to states, original event timestamps and operation actions. The function appends a separate clearing event and a receipt with counts and month-level case summary. It does not delete cases, historical events, target posts/comments or accounts. Existing reviewer membership records are a separate security audit, not cleared as part of complaint-content retention.

Preserved stable identifiers are pseudonymous operational records, not a guarantee of irreversible anonymization. Their retention, approval references and security membership audit require a separately approved minimal retention/access policy; do not describe this operation as erasing every possible re-identification source or external backup.

The immutable trigger permits only the exact, scoped de-identification fields/values while the private capability exists. Unapproved edits/deletes still raise an error. Do not insert the capability manually or weaken the trigger. Transaction failure rolls the operation back. A retry of the same case and same authorization reference returns the existing receipt with `already_cleared=true`; a different reference conflicts. After a committed irreversible clearing, rolling back the application does not restore removed sensitive text; never claim that it does.

**Historical danger:** `ops/reporting-retention-020.sql` is preserved history, **DO NOT EXECUTE**. It contains an old trigger-disable approach and does not cover the new request data. Use only the new scoped management function after separate target/policy/case authorization; do not repair the old script in place.

## Production approval and failure plan

Production remains OFF/OFF; no migration, binding, data clearing or release is authorized by this guide. A future approval must explicitly cover: the exact new migration and checksum; current dependencies; the scoped exception to audit de-identification; candidate policy and hold/appeal handling; a real owner UUID binding; the management operator and case-approval process; access/correction secure fulfillment; privacy notice and support process; then separate application and database enablement.

Deployment order if separately approved: retain existing reporting OFF/OFF; apply only the approved migration; verify RLS, grants and blocked direct writes; bind the verified reviewer through management; perform approved non-production verification and minimal production read-only checks; enable only approved gates. Never seed production with test accounts or make `REPORT_PERSISTENCE_AVAILABLE` globally true.

On authorization/privacy/integrity failure: turn operations and reporting application/database gates OFF through the separately authorized process; preserve cases, original and new events, requests and receipts; revoke the affected reviewer if authorized; roll back the application if necessary. Do not DROP tables, DELETE cases, disable immutable triggers or auto-replay clearing. No scheduled retention job is installed by this task.

## Verification record

- 2026-10-26 KST: local helper/action regressions 28/28 PASS; TypeScript and diff check PASS. These are distinct from real acceptance.
- Migration applied ONLY to `kirvcbkbkvotnsqnbcyf`. MCP recorded version `20261026084000`, name `reporting_operations_privacy_030`; source stays `20261026082221_reporting_operations_privacy_030.sql`. Content is the same reviewed migration. This timestamp mapping must be considered in future selective deployment; no ledger repair or filename rewrite performed.
- Real authenticated SDK acceptance: 8/8 PASS (persistence/idempotency/conflict, cross-user/internal isolation, direct writes/self-grant denial, reviewer retention/hold and private/public response separation). Revoked reviewer read/history/write: 1/1 PASS; original test-only reviewer restored with an audited management call.
- Management acceptance: policy OFF, all three holds, immutable case/event/request/receipt guards, exact rollback of every sensitive category, scoped clearing, receipt counts and idempotent retry PASS. `tests/sql/reporting-operations-030.sql` ran in a rollback-only transaction with explicitly verified synthetic identities; no original case selected by it. A separate generated synthetic fixture demonstrated committed clearing while preserving its audit row; no real data used. Policy approval restored FALSE; capability table empty.
- Real localhost Chromium: initial setup BLOCKED by restricted server network (preserved separately); normal-network recheck 5/6 PASS, with one genuine saved-feedback remount defect. Stable form keys and snapshotted expected versions fixed it; targeted recheck 1/1 PASS. The original 5/6 was not rewritten. A/B/reviewer sessions were genuine logins; browser request persistence, permission failure/draft retention and KR 390/820/1280px layouts passed, no pageerror. Real iPad remains PENDING.
- Evidence folder outside Git: `KCNY-MAIN-20261026-030-032-evidence/runs/`; no passwords, sessions, cookies or traces committed. Test reporting and operations remain enabled for continued batch acceptance; policy remains unapproved. Production unchanged.
- Production implementation, production reviewer binding, policy approval and actual production clearing: **NOT AUTHORIZED / NOT EXECUTED**.

Batch closeout: new test-only operations gate restored OFF and policy approval FALSE after acceptance. Original test reporting configuration and the original single test reviewer are preserved; A/B are not reviewers. Test media writes OFF and activeCron0 are unchanged. Local development server stopped; no background service or automatic follow-up is promised. Reproduction requires explicitly opting in only the verified isolated operations configuration again.
