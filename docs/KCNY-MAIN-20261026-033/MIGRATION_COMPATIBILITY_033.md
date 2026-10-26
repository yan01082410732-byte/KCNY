# TASK033 — Reporting migration compatibility

Read-only metadata snapshot: 2026-10-26, approximately 19:03 KST (10:03 UTC). Source base: `1a1713921630f3c72db97dd5cc2cac71deb614f8`. Scope: the two immutable TASK030/031 migrations and their actual reporting/public-content dependencies, not a whole-database audit. No database write, migration, ledger repair, production deployment, Auth change or secret retrieval was performed.

## Targets and exact source

Management metadata confirms:

| Role | Ref | Project | Region | PostgreSQL |
| --- | --- | --- | --- | --- |
| Independent test | `kirvcbkbkvotnsqnbcyf` | `kcny-e2e-017` | Seoul | 17.11 |
| Production — read only | `czcyarmramlpmilfhpqo` | `KCNY` | Seoul | 17.6 |

Both are ACTIVE_HEALTHY. These checks used explicitly selected project refs, never an implicit linked-project fallback. No user records, complaint text, credentials, sessions or API keys were returned or used.

| Order | Exact Git migration | Bytes, UTF-8 LF | SHA256 |
| --- | --- | --- | --- |
| 1 | `20261026082221_reporting_operations_privacy_030.sql` | 26002 | `D5804834710BD83E47DB1E1D039B31E98354B8DF495924A9F2D7BC266383DB67` |
| 2 | `20261026085144_reporting_review_workspace_031.sql` | 2341 | `674013D93721AA958BDE0014DC267B22167CB54D1F1125D5499D335AF6103451` |

Hashes were calculated from the immutable Git blobs at the source base, not a pasted copy. The working tree has no diff for either migration. Neither file was edited during TASK033.

## Test ledger payload comparison — explicit final-newline distinction

Each actual test ledger entry has a one-element `statements` array:

| Source version | Test ledger version / name | Stored bytes | Raw stored-payload SHA256 |
| --- | --- | --- | --- |
| `20261026082221` | `20261026084000` / `reporting_operations_privacy_030` | 26001 | `74C7238700CF8DB76829AA81A4569465D780121A0E5BE52B31BF5B71F32DBBDF` |
| `20261026085144` | `20261026085234` / `reporting_review_workspace_031` | 2340 | `FA5A24D30F53C9BEA9DB3617ED4E9899071C8CB090862651489725DA4F44B3E8` |

The stored payload ends with `commit;`, while the Git source ends with `commit;` followed by one LF. Appending exactly one terminal LF to each stored payload produces its corresponding Git SHA256 above. Thus the SQL content matches exactly apart from the single omitted terminal newline; the **raw bytes/hashes are not identical**. No whitespace within statements, source SQL or ledger record was changed to force a match. The earlier “same content after normalization” shorthand should be read with this explicit newline rule, not as a raw-byte claim.

Keep these source-to-remote timestamp mappings in the future execution record. Do not rename applied files, add duplicate ledger entries, repair old history or run a full `db push` to make version strings look equal.

## Current production unapplied state

The narrowly filtered production ledger has neither migration name nor any source/test mapped version above. Independent catalog checks also confirm:

- `public.reports` has its original 13 columns and **no** `content_cleared_at`.
- `public.report_data_requests`, the new operations/retention/capability/receipt tables and all new TASK030/031 public RPCs are absent.
- The production `reporting_private.append_only()` is still the original unconditional `report_audit_immutable` rejection function.
- Production reporting database configuration is FALSE; aggregate reviewer count is 0 and aggregate case count is 0. No identities or case rows were read. Application configuration/actual deployment is covered by the parent release-readiness check, not inferred from this database observation.

This supports **030/031 not applied in production**, not merely “ledger row missing.” Recheck these exact objects immediately before any future authorized execution because this is a point-in-time observation.

## Actual dependency compatibility

### Existing reports contract

Production has `public.reports`, `reporting_private.configuration`, `reviewers`, `requests` and `review_events`, all owned by `postgres` with RLS enabled. All 21 fetched original reporting constraints match their test counterparts, including:

- Stable report ID, supported kind/reason/status/target-type and version/length checks.
- Target type/ID presence consistency and minimum complaint length.
- No target/reporter foreign key that could cascade target deletion into cases.
- Request idempotency primary key `(reporter_id,request_id)` and case references.
- Private audit-to-case reference and reviewer-to-existing-Auth-user reference.

Production Auth catalog contains the required `id`, `confirmed_at`, `deleted_at` and non-null boolean `is_anonymous` columns. Only column metadata was read; no Auth user identities or personal fields were retrieved.

The actual production definitions of these four existing public functions match test exactly, including argument signatures, owner `postgres`, fixed empty search path and current authorization/version checks:

1. `reporting_access()`.
2. `submit_report(p_request_id uuid,p_kind text,p_target_type text,p_target_ref text,p_reason text,p_description text)`.
3. `review_report(p_report_id uuid,p_expected_version integer,p_next_status text,p_public_resolution text,p_decision_reason text,p_internal_note text)`.
4. `report_review_history(p_report_id uuid)`.

The explicit parameter spelling above prevents a preparation document from becoming a guessed execution interface. No overload or compatibility shim is required. Existing function ACLs retain their historical service-role entries; this review does not use those privileges as ordinary-user acceptance evidence or authorize broadening them.

### Public target visibility and notifications

Production `posts`, `comments` and `profiles` have SELECT policies `USING(true)` and corresponding `anon`/`authenticated` SELECT grants, matching the existing public-content prerequisite used by reporting target validation. This is a current schema observation, not permission to expand profile fields or search private Auth data. Notification SELECT/UPDATE policies remain recipient-scoped.

Eleven actual triggers on posts/comments/profiles/notifications/likes/follows match the test definitions exactly, including media deletion/identity guards, normal updated-at triggers, notification creation/removal and `notifications_apply_preferences`. The five notification creator/remover function definitions also match production/test exactly. Neither new migration changes these tables, their triggers, notification uniqueness/read state, media functions, Storage or Cron. No data-backed business mutation was run in production to prove this.

## Exact new objects, permissions and bounded audit impact

TASK030 adds the nullable reports metadata column, one exposed data-request table and eight private operations/membership/retention/key/review/event/capability/receipt tables. Existing reporting tables are reused rather than copied. The isolated actual catalog shows all these private tables owned by `postgres`, RLS enabled, and **no non-owner table grants**. `anon`, `authenticated` and `service_role` all lack `reporting_private` schema USAGE.

`public.report_data_requests` has RLS, only authenticated SELECT for normal clients, and a gate requiring operations enabled plus current ownership or trusted reviewer membership. No authenticated direct INSERT/UPDATE/DELETE grant or policy exists. Public new RPCs are `postgres`-owned SECURITY DEFINER with empty `search_path` and EXECUTE limited to `authenticated` (plus owner); each checks real caller/access and reviewer membership when appropriate. Management `set_reviewer(uuid,boolean,text)` and `redact_case(uuid,integer,text)` are SECURITY INVOKER, owner-only EXECUTE and explicitly require `current_user='postgres'`.

The scope-wide private-table/function revocations affect only reporting-private objects. The inspected production schema currently contains the four original tables and the one immutable helper; existing client/private access is already absent. Future preflight must stop if unrelated objects or unexpected grants appear in this schema rather than silently revoking new unrelated consumers.

The only existing function replaced is `reporting_private.append_only()`:

- Production has exactly two trigger callers: `reports_no_delete` and `report_events_immutable`; no unrelated table uses it.
- Test has those two plus four new immutable/no-delete callers for membership events, operation events, receipts and privacy requests.
- All DELETE and ordinary UPDATE attempts still reject. The exception permits only approved exact-value redaction of the allowed audit actor/text fields for one case, backend and transaction under management-owned scope. Audit ID, case reference, state transition, order and original timestamp remain protected.
- No trigger is disabled, case/audit row deleted, automatic punishment introduced or target content modified. The altered audit contract still needs explicit production privacy/operations approval; technical compatibility is not approval.

## Locks, transactions and concurrency

Both source files are explicit `BEGIN`/`COMMIT` transactions with `lock_timeout='5s'`. Failure inside a migration must roll that transaction back; do not continue activation after partial two-migration success. The source does not define a separate `statement_timeout`; any future bounded execution limit must be set through the approved execution context without editing these already-applied historical files.

The nullable, no-default `reports.content_cleared_at` column requires a brief table DDL lock; it does not request a backfill or historical data rewrite. New foreign keys and catalog changes also need locks. A low-traffic window and immediate lock-timeout failure handling remain necessary; the currently zero production cases are not a promise of future zero lock contention. Indexes are created on new tables, not a large existing-content index rebuild.

At runtime, case `FOR UPDATE` precedes request locks for review/redaction. Data-request submission takes a case KEY SHARE lock before ownership checks and inserting sensitive text, excluding simultaneous redaction. Expected versions and transaction-scoped redaction capability prevent silent overwrite and partial audit clearing. Scope cleanup/error rollback and original immutable metadata preservation were previously accepted in isolated TASK030 testing; this read-only pass did not rerun or relabel those tests.

## Future selective deployment and containment — not executed

1. Obtain the final exact application commit and explicit owner/privacy/operations/reviewer-binding release approval. Keep production reporting OFF/OFF and operations/policy gates OFF/FALSE.
2. Reconfirm the exact production ref, these hashes, unapplied ledger/catalog state, existing dependencies/grants and prior deployment rollback target.
3. Apply only source migration 030, verify its actual objects/permissions and ledger mapping; then only source migration 031 and verify its RPC/grants/mapping. No full migration push, historical ledger repair or unrelated migration is part of the plan. Object conflict or unexpected dependency means stop disabled and preserve the actual outcome.
4. Bind only the personally verified existing owner account through the separately approved management path, never a synthetic reviewer; verify fresh revocation behavior and required policy/operator/notice conditions before opting in.
5. Build/release only the approved main-site commit with production configuration, preserve existing media/notification settings, perform approved staged read-only checks and enable only the approved application/database layers.

Failure containment prioritizes disabling application and database gates, and if needed application rollback to a recorded prior deployment. Preserve cases, review/operation events, privacy requests, membership events and receipts. Do not DROP new tables, DELETE case history, disable immutable protections or claim application rollback restores already-cleared sensitive text. No production retention schedule, AI call or reviewer assignment is authorized by this compatibility report.

## Result and evidence limits

**Migration compatibility: VERIFIED for the inspected current dependencies, with the one terminal-LF ledger distinction explicitly reconciled. Production execution: NOT PERFORMED. Production authorization: still required.**

Evidence sources: exact Git blobs; two filtered migration ledgers; read-only `pg_catalog`/`information_schema` definitions, ACLs, RLS/policies and trigger-call metadata; management project identity; configuration boolean and aggregate counts only. No complaint bodies, raw users, sessions or secrets are included. Official guidance checked: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Data API security](https://supabase.com/docs/guides/api/securing-your-api). Changelog markdown fetch was attempted once but rejected by the web reader's content-type handling; current documentation search succeeded. This limitation does not replace the direct installed-database evidence.
