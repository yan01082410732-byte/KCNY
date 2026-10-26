# TASK030–032 — Future production approval gate

Date: 2026-10-26 (Asia/Seoul). **This is an approval request, not deployment, account-binding or data-clearing authorization.** The batch changes only the isolated project `kirvcbkbkvotnsqnbcyf`. Production is `czcyarmramlpmilfhpqo`.

The batch's read-only production snapshot reports application/database reporting **OFF/OFF**, zero trusted reviewers and zero cases. No reliable, explicitly approved owner-to-production-Auth-UUID binding was found. Do not infer identity from the active browser, username, email similarity or registration order. Existing production media and notification preferences are outside this release scope and must remain unchanged.

## Exact migration scope and sequence

| Order | Immutable source migration | SHA256 of LF source | Isolated-project MCP ledger version |
| --- | --- | --- | --- |
| 1 | `20261026082221_reporting_operations_privacy_030.sql` | `D5804834710BD83E47DB1E1D039B31E98354B8DF495924A9F2D7BC266383DB67` | `20261026084000` (`reporting_operations_privacy_030`) |
| 2 | `20261026085144_reporting_review_workspace_031.sql` | `674013D93721AA958BDE0014DC267B22167CB54D1F1125D5499D335AF6103451` | `20261026085234` (`reporting_review_workspace_031`) |

The batch executor compared the complete stored test-ledger statements with each source after LF normalization: both match. The differing timestamp is a recorded MCP application mapping, not permission to rename applied source files, repair historical ledger rows or push the entire pending migration directory. A future release must state its precise selective execution interface and resulting production ledger mapping, check the exact file hashes and verify unapplied status before execution. A conflict or unexpected dependency requires stopping, not `CREATE OR REPLACE` improvisation.

Dependencies: the already-reviewed reports/review contract (`20261023124108_reports_complaints_review.sql` and the `20261023125936_reporting_review_http_conflict.sql` function correction), existing `public.reports`, `reporting_private` tables, `reporting_access()` and the original immutable audit protections. Verify only these actual dependencies and current production definitions; no unrelated ledger repair, Reply Integrity migration or full historical schema audit is required.

Migration 030 adds `reports.content_cleared_at`, owner-scoped data-request tracking, private retention/operation records, management membership history and case-scoped redaction capability/receipts. It replaces the immutable trigger function with a strictly bounded management redaction exception; ordinary edits/deletes remain rejected. New operations and policy approval default OFF/FALSE. It does not seed users or install a retention schedule. Migration 031 adds a fresh-reviewer-gated scoped-count RPC; it does not rewrite cases or existing review states.

## One consolidated owner decision, with explicit sub-boundaries

A single future approval response can cover the following together; it must not be reduced to “the browser is logged in”:

1. **Trusted identity binding:** confirm the owner personally controls one exact existing production Auth UUID through an approved official account-binding process, and authorize that UUID only as a case reviewer. Record the approval reference privately. Never copy synthetic accounts or UUIDs. An authorized management operator verifies the target and confirmed/non-deleted/non-anonymous Auth identity, calls `reporting_private.set_reviewer`, records the result, and verifies revocation with a real unprivileged session.
2. **Privacy/operations decision:** approve or amend the candidate closed-case 90-day review/clearing goal, the open-case review cadence, appeal/legal/investigation holds, documented extensions and next-review dates. Identify the accountable operator, support/escalation route and approval evidence. Stable case/event IDs, management membership audits and receipt references remain pseudonymous records, not a promise of irreversible anonymization; their minimum retention and authorized access also need approval.
3. **Sensitive clearing exception:** explicitly approve the narrow audit de-identification contract, management-only operator and per-case authorization process. A retention review saying `eligible_for_clear` is not itself permission to erase production text. Each actual production clearing still requires eligible state/age, no hold, expected versions, policy approval and its own valid case authorization. No automatic deletion task is included.
4. **Data-request fulfillment and notice:** approve accurate user-facing privacy/complaint explanations and a secure, identity-verified access/correction process. This code records and reviews requests; `approved` is not `fulfilled`. There is no generic automated export/correction/fulfillment endpoint. Approved access/correction requests continue blocking clearing until an approved follow-up process genuinely resolves them. Only successful scoped redaction fulfills an approved deletion request. Do not directly flip status to fabricate completion.
5. **Precise release:** approve the final reviewed application commit, the two exact migrations above, selective application order, permission checks, rollback target and explicit application/database opt-ins. This decision does not authorize changes to Auth, media Storage/Cron, AI services or unrelated schemas.

Until every prerequisite is satisfied, keep production reporting **OFF/OFF**, new operations opt-ins OFF and policy approval FALSE. Source completion and isolated acceptance do not change this gate.

## Future controlled execution, only after approval

1. Record current production deployment/commit, exact project identity and reporting/operations gate values. Verify the production version contains all currently released changes; preserve existing worktrees and backups.
2. Keep submission and operations disabled. Apply only migration 030 and then 031 through the specifically approved interface. Verify ledger entries, expected function definitions, RLS, grants and denial paths after each; stop disabled on partial failure.
3. Bind only the verified production owner UUID through the audited management function. Verify ordinary users cannot self-authorize; reviewer reads/actions must fail immediately on new requests after revocation. Do not seed synthetic cases in production.
4. Complete operator/policy/notice conditions and final exact-version tests. Build with Production configuration, exclude test credentials/sessions/project URLs, perform staged read-only checks and verify a rollback target before any domain promotion.
5. Enable only the explicitly approved layers: existing reporting application/database gates, then the separate operations application/database gates as approved. Policy approval is a distinct management value; it must not silently become TRUE because a deployment succeeds. Verify current state read-only and document who owns ongoing review and incident handling.

## Permissions and advisor interpretation

Private tables intentionally have RLS with no client policies and no client table grants; they are deny-by-default storage, not missing public access functionality. New public definer RPCs have fixed empty `search_path`, restricted EXECUTE and fresh authenticated/reviewer checks as appropriate. Do not “fix” deny-by-default findings by granting broad access or adding service-role bypasses. Targeted isolated tests and actual definitions, rather than the advisor label alone, establish the intended access boundary.

The batch's advisor output also contains pre-existing `set_updated_at`/profile-trigger and leaked-password-protection warnings outside this scope. They were not changed or claimed fixed. They do not authorize unrelated Auth or function changes; retain them as separate existing findings.

Official advisory references: [RLS with no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [authenticated definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [mutable search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [anonymous definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No broad grants or unrelated Auth changes were made to silence these labels.

## Failure containment and rollback

For permission leakage, privacy failure, wrong-project connection or serious core regression: first disable the separately controlled operations and reporting application/database gates through an authorized path; revoke the affected reviewer if authorized; roll back the application to the recorded prior deployment if necessary. Do not automatically re-enable after a retry.

**Preserve all cases, original/new audit events, data requests, membership history and receipts.** Do not DROP tables, delete cases, disable immutable triggers, run the historical trigger-disable retention script, repair unrelated ledgers or reverse committed redaction. Application rollback does not restore cleared sensitive content. Existing media and notification settings remain intact. There is no production retention scheduler installed by this batch.

## TASK032 boundary

AI interfaces remain **NOT_CONNECTED**. Contract fixtures are not inference results. This package grants no TASK B repository changes, model training, external AI calls, production complaint transfer or inference-resource spending. Any later real integration needs its own approved service, privacy, credentials and permissions contract; suggestions never become automatic penalties or human audit decisions.

## Evidence interpretation

Use `TASK030_OPERATIONS.md`, `TASK031_WORKSPACE.md` and the final batch results for actual test counts and raw-failure/retest distinctions. This gate does not upgrade pending device/runtime checks into PASS and does not claim a production migration, production reviewer binding, enabled reporting workflow or AI connection has occurred.
