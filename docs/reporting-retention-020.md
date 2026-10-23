# TASK 020 — first-release manual retention procedure

Status: DRAFT READY / EXECUTION ACCEPTANCE BLOCKED. Three management attempts returned `Invalid or expired requestState`, not PostgreSQL validation results; none is counted as a passing retention test. Readback confirmed the eligible synthetic fixture and audit guard unchanged. The test feature setting was restored. No UI execution or alternative credential route was used to bypass the problem. Production activation remains gated on genuine maintenance acceptance as well as trusted reviewer binding.

Owner policy, 2026-10-24 KST: unresolved case material is retained only for case handling and reviewed periodically; closed cases with no pending appeal target sensitive-content clearing after 90 days. Extensions require a concrete reason and next review date. No automated cleanup is enabled.

## Human operation, not a web feature

Every 30 days the trusted operator reviews unresolved cases for continuing necessity. Maintain an access-controlled management register (not this repository or public reports) with case ID, review date, necessary/defer/hold/eligible decision, reason, next review date and owner approval reference. An unresolved case cannot be processed by the SQL below, however old it is. Pending appeals, preservation needs or other justified extensions are placed on hold with the reason and next review date. Do not treat status alone as proof that no appeal is pending: the product has no persisted appeals contract.

For a proposed closed-case batch the operator verifies the actual management connection identity, confirms the exact case list has no pending appeal/hold in the register and obtains approval. Inspect only the minimum case metadata necessary; do not export complaint text. Save the approved case manifest securely; it is not a public statistical artifact. Only non-identifying kind/status/closed-month counts are exported as statistics.

## Executable SQL and safeguards

`ops/reporting-retention-020.sql` is a management-only transaction template, NOT a migration or callable API. TASK 020 permits its execution only on synthetic test cases in `kirvcbkbkvotnsqnbcyf`. Running it later on real cases requires separately approved exact targets. No additional persistent schema objects are needed or applied to Production.

Substitute its single placeholder using JSON serialization with SQL string-literal escaping:

```json
{
  "project_ref": "verified-management-target",
  "case_ids": ["approved-case-uuid"],
  "expected_case_count": 1,
  "approval_reference": "owner-approval-reference",
  "no_open_appeal_confirmed": true,
  "simulate_failure": false
}
```

The executor must independently verify the connected project; the JSON field itself is not proof. No service_role/frontend credentials or user-editable metadata grants are involved. Use a trusted authorized management channel only, never expose the script through an app route.

1. Disable the application and database switches under the maintenance approval. Verify `enabled=false`; the transaction locks the configuration row against concurrent re-enablement.
2. Maximum 20 explicit distinct cases. All must exist, be resolved/dismissed, have an old terminal audit, have no audit event within 90 days and have `updated_at` at least 90 days old. Already-redacted, recent and pending cases fail closed; any mismatch aborts the entire batch.
3. Take exclusive locks on the three reporting data tables, with 5s lock timeout and 30s statement timeout. If active requests prevent the locks, abort and retry later; do not increase privileges or disable global guards.
4. Verify the exact expected immutable trigger/function. Temporarily disable **only** the named audit UPDATE/DELETE guard inside that same locked transaction. Clear existing audit actor IDs, free-text reasons and notes. Clear case description/public resolution/reason; replace reporter and non-null target IDs with the nil UUID sentinel, not another real user. Keep case/event IDs and necessary status/timing metadata. These retained IDs do not identify an account by themselves, but old exports/logs/backups require their own retention control.
5. Remove private idempotency records for these cases: this removes duplicated body, original username/target reference and reporter linkage. After approved privacy redaction, the old identity-based idempotency mapping expires; users will no longer find the anonymized case under “my reports”. This is an explicit retention consequence, not a promise of perpetual request replay.
6. Re-enable the exact audit guard before commit and append a non-identifying redaction event. Do not delete cases/audits or disable `reports_no_delete`; do not use `session_replication_role` or global trigger bypass. Any exception, including the synthetic failure control, rolls back both content changes AND trigger changes.
7. Export only returned kind/status/month/count statistics. Verify redacted text/IDs, absence of idempotency payload and enabled immutable guard. Confirm an ordinary user/reviewer still cannot mutate historic audit. Record the approved maintenance completion without copying complaint content; re-enable service only after the normal activation gates remain satisfied.

Deletion from live logical rows is not instantaneous physical erasure from PostgreSQL storage, backups, old logs or operator exports. Before real cleanup, the owner must record applicable platform backup/log lifetimes and approved disposal of controlled exports; no claim of complete erasure is made by this script. Do not purge provider backups or use VACUUM FULL/global operations under TASK 020.

## Acceptance controls

Use synthetic old closed / recent closed / unresolved fixtures and private payload/audit markers. Test: recent denied, unresolved denied, appeal confirmation missing denied, simulated late failure leaves original content and guard intact, eligible case successfully redacts all text/account references/payload copies while preserving case/audit and safe statistics. Restore test DB feature setting afterward. Preserve expected rejection observations separately from failures.

Production current task: no real record deletion, no execution of this maintenance transaction, no automatic scheduler. Application rollback keeps reporting cases and audits; operational disablement is separate from future retention maintenance.
