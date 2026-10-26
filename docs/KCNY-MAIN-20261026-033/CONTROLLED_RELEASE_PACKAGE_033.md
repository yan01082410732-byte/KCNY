# TASK033 — Controlled reporting release package

Date: 2026-10-26, Asia/Seoul. **PREPARATION ONLY — NOT RELEASE AUTHORIZATION.** No production migration, reviewer grant, enablement, push, deployment or promotion is executed by this package. It preserves the currently released media and notification-preference functionality.

## 1. Version and rollback identity

Source ancestry has been verified through TASK030, TASK031 and TASK032 at `1a1713921630f3c72db97dd5cc2cac71deb614f8`, descending from the last released `102c892115ce11b6c7a65d9c57f44c637bbb950f`. TASK033 preparation changes and documents must be included in its final reviewed local checkpoint.

**Exact release candidate: forthcoming TASK033 checkpoint; not assigned in advance.** The final task receipt must record its full commit hash, clean/reviewed worktree state, included files and actual test results. Do not substitute `1a171392`, an old main-branch head, the currently live commit or an uncommitted directory for that final candidate. This document does not invent a future Git hash.

Recorded current production/rollback baseline supplied to this package:

- Domain: `https://kcny.vercel.app`.
- Deployment ID: `dpl_D13k5Dvwwxt4hkRmG9LRodVetteA`.
- Deployment URL: `https://kcny-3mladyjw7-yan-s-projects24.vercel.app`.
- Published commit: `102c892115ce11b6c7a65d9c57f44c637bbb950f`.

Re-inspect the actual domain target and current online commit immediately before any later approved release. If a newer production version exists, stop version selection and reconcile ancestry rather than overwrite it. Keep original worktrees, historical untracked evidence and backups. No force push, reset, clean or history rewrite is required.

## 2. Exact migration payload and order

Only production project `czcyarmramlpmilfhpqo` is a future production target. Independent acceptance remains exclusively `kirvcbkbkvotnsqnbcyf`. Neither project selection nor this report authorizes a production write.

| Order | Git source SQL | SHA256, UTF-8 LF | Test-only ledger mapping |
| --- | --- | --- | --- |
| 1 | `20261026082221_reporting_operations_privacy_030.sql` | `D5804834710BD83E47DB1E1D039B31E98354B8DF495924A9F2D7BC266383DB67` | `20261026084000`, name `reporting_operations_privacy_030` |
| 2 | `20261026085144_reporting_review_workspace_031.sql` | `674013D93721AA958BDE0014DC267B22167CB54D1F1125D5499D335AF6103451` | `20261026085234`, name `reporting_review_workspace_031` |

Each test ledger contains one complete SQL statement-array element, with one terminal LF omitted by the application path. Raw test-payload hashes are respectively `74C7238700CF8DB76829AA81A4569465D780121A0E5BE52B31BF5B71F32DBBDF` (26001 bytes) and `FA5A24D30F53C9BEA9DB3617ED4E9899071C8CB090862651489725DA4F44B3E8` (2340 bytes). Appending exactly one LF yields the Git hashes above (26002/2341 bytes). SQL content is identical apart from that final newline; **raw byte identity is not claimed**.

Do not edit or rename the applied historical SQL, fabricate matching hashes or repair ledger timestamps. A future selective executor must record the exact production name/version mapping and payload hash it actually writes. No full `supabase db push`, migration-folder replay, historical ledger repair, Reply Integrity migration or other pending SQL belongs in this release.

The current read-only production check finds both migrations absent from the ledger **and** their new catalog objects absent; the reports column and original immutable function also confirm unapplied state. See [migration compatibility](MIGRATION_COMPATIBILITY_033.md) for actual definitions, constraints, grants, trigger calls, bytes and limitations. Recheck these narrow preconditions before a later write; object conflicts or unexpected dependencies mean stop disabled, not overwrite.

## 3. Change inventory and impact

### Migration 030

- Adds nullable `public.reports.content_cleared_at` without a default/backfill, one owner/reviewer-scoped exposed data-request table and eight private operations/retention/membership/request/audit-capability/receipt tables.
- Adds gated request, retention, reviewer overview/history RPCs plus management-only audited reviewer grant/revoke and approved single-case clearing functions.
- Reuses the existing reports/review model. It does not delete cases, target content or accounts, and seeds no reviewer or production user.
- Replaces only the old reporting-private immutable trigger helper with an exact-value, management-owned case/backend/transaction-scoped redaction exception. Ordinary updates/deletes remain rejected. Production currently has only two callers of that helper, both reporting protections; no unrelated trigger caller was found.
- New private tables use RLS with no normal-client grants/policies. The exposed table grants only authenticated SELECT under ownership/current-reviewer plus feature gates. New public RPC EXECUTE is authenticated-only with real caller/reviewer checks and fixed empty `search_path`; management functions are invoker/owner-only and require `current_user='postgres'`.

### Migration 031 and application

- Adds the fresh-trusted-reviewer `report_review_summary` RPC, with real scoped counts and oldest-open time; no case-state rewrite.
- Reuses and extends the existing reporting pages: own data requests, retention review, trusted review queue, filters, bounded keysets, exact-ID, version/history, preserved conflict drafts and real authorized next-case navigation.
- Preserves My Reports isolation. AI modules add versioned strict types/validation only; they remain NOT_CONNECTED and are not wired to provider calls or human-decision mutations.
- TASK033 binding/preparation changes, if included in the final candidate, do not authorize self-granting or production reviewer assignment. The final diff/test record governs exactly what is released.

The current source review found no changes to existing media APIs/libraries/Edge maintenance, notification preferences, search, comment/like/follow actions or package lockfiles. New CSS is scoped to reporting/operations/workspace selectors. Preserve the production media write gates, existing media Cron/Storage and notification settings; no new scheduler, Storage policy, Auth setting or AI service is part of this release. Reconfirm these boundaries against the **final** candidate, not this earlier snapshot alone.

### Lock/transaction boundary

Both migrations use explicit transactions and a five-second local lock timeout. The nullable reports-column addition requires a short table DDL lock; new foreign keys/catalog changes also acquire locks. New-table indexes do not rebuild content tables. There is no historical-data rewrite or bulk deletion in these migration bodies. They do not set a separate statement timeout; any later execution-time bound must be set through an approved execution context without modifying the immutable files.

Use a low-traffic window. A lock timeout or any SQL error means roll back that migration and stop with feature gates OFF. If 030 commits and 031 fails, retain the actual 030 result disabled, report the partial state and do not guess a repair. Do not rerun a successful non-idempotent migration. Version checks and report-before-request locks protect runtime review/redaction; they do not remove deployment lock risk.

## 4. Gates and owner decisions before real submission

Production reporting remains **OFF/OFF**. New operations and policy approval remain disabled. Before approval, retain:

| Layer | Required disabled state |
| --- | --- |
| Reporting application | `KCNY_REPORTS_ENABLED=false` |
| Reporting database | `reporting_private.configuration.enabled=false` |
| Operations application | `KCNY_REPORTING_OPERATIONS_ENABLED=false` |
| Operations database, after approved installation | `reporting_private.operations_configuration.enabled=false` |
| Candidate policy, after approved installation | `reporting_private.operations_configuration.policy_approved=false` |

Exact project/environment checks remain enforced: a Production deployment may use the recognized production Supabase URL only; local/Preview acceptance must use the explicitly recognized independent test project. Never remove these checks, globally set `REPORT_PERSISTENCE_AVAILABLE=true`, copy test `.env` values or use Preview writes without verified isolation.

A consolidated owner release decision must explicitly identify:

1. The final candidate commit and the two exact SQL hashes/order above, the selective management execution path and a valid application rollback target.
2. One personally verified existing production owner Auth UUID and approval reference for **case reviewer only**. Do not infer it from a browser login, profile name or similar email, or copy the synthetic reviewer. Confirm trusted binding and management authorization before granting; prove revocation with the real ordinary session.
3. The approved or amended candidate retention policy, 90-day closed-case review target, open-case review cadence, appeal/legal/investigation holds, extension/review records, separate minimal retention for pseudonymous IDs/receipts/membership audits and the narrow audit-redaction exception.
4. The accountable management/review operator, incident and support route, accurate CN/KR notice, secure identity-verified access/correction fulfillment and per-case sensitive-clearing authorization. `approved` does not mean `fulfilled`; access/correction requests remain unresolved until an approved real process completes them. No automatic deletion or export is promised.
5. Exactly which application/database gates may be enabled and when. Policy approval is a separate management decision, not a side effect of applying schema or building the app.

Missing any required enablement condition: a later separately approved application/schema deployment may remain **DEPLOYED_DISABLED** if that is the owner's approved scope, but it must not be described as an operational live reporting service. Current TASK033 permits neither that deployment nor activation.

## 5. Later authorized execution sequence

The commands below are a future runbook, **not commands to execute during TASK033**. Re-read installed CLI help and check actual team/project binding before acting. Stop on missing authentication, `link_required`, SSO/team permission failure or target mismatch; do not auto-link a guessed project or bypass protection.

1. Freeze the exact final reviewed candidate in a clean release directory, inspect its complete diff/staged contents, exclude `.env`, credentials, browser state, caches and synthetic accounts. Review actual Git/Vercel auto-deployment rules before any separately approved dedicated-branch push; the absence of repository CI does not prove pushing is harmless. No merge to main is required.
2. Verify current production identity, unapplied state, hashes/dependencies and gate values. Apply only 030, verify, then only 031, verify; record actual production ledger mappings. Leave reporting/operations/policy disabled.
3. Run final actual unit/type/build/diff and affected permission evidence on the exact candidate. Tests against the isolated project do not authorize production synthetic writes. Resolve owner binding/policy/operator prerequisites or preserve the approved disabled scope.
4. Through the existing legitimate Vercel login and precisely verified project/team, create a fresh **Production-configured build without assigning the production domain**:

   ```text
   vercel deploy --prod --skip-domain
   ```

   Verify the installed CLI supports these flags. Use Production configuration pointing to `czcyarmramlpmilfhpqo`; do not reuse localhost/test/Preview build output or expose environment values. A prebuilt alternative requires a separately verified Production build and exact same artifact, not an incidental local build.

5. Wait for READY and verify that deployment contains the exact approved candidate commit/source and Production environment. A READY old commit, Preview build or unverified metadata is not sufficient. Record the new ID/URL before promotion.
6. On that staged Production build, perform only authorized read-only checks: home, search/category navigation, CN/KR login/registration, public post/assets where present, protected-route unauthenticated handling, reporting disabled boundaries, and current media/notification routes. Check relevant runtime errors. Do not create synthetic production posts, comments, likes, follows or complaints. Protection remains enabled; use legitimate authenticated access or documented authorized tooling, not bypass-secret login replacement.
7. Only after those checks and the owner's separate release approval, promote **that verified staged Production deployment**, not a Preview:

   ```text
   vercel promote <verified-staged-production-id-or-url>
   ```

8. Verify `kcny.vercel.app` resolves to the exact new deployment and approved candidate, repeat necessary read-only core checks and inspect a defined error-log window. Enable only the separately approved gates once all prerequisites are actually satisfied; otherwise explicitly report deployed/disabled. Do not claim “live enabled” from a build, a push, source tests or permission to release.

## 6. Failure containment and rollback

For wrong-database connection, unauthorized data access, privacy leakage or serious core regression: stop new operations, close the approved reporting/operations application and database gates through the authorized incident path, revoke affected reviewer access when authorized, preserve sanitized evidence, and if necessary restore the recorded previous deployment:

```text
vercel rollback dpl_D13k5Dvwwxt4hkRmG9LRodVetteA
```

This is also a future authorized incident command, not an action in TASK033. Revalidate that target immediately before use. Verify restored domain/deployment/core pages and continuing media/notification behavior. A rollback may change platform auto-assignment behavior; inspect it before any subsequent promotion rather than assume the next push will behave identically.

Application rollback **keeps all cases, audit/operation events, data requests, membership records and receipts**. Do not DROP new tables, delete case history, disable immutable triggers, replay clearing or reverse ledger rows to roll back the application. Previously committed sensitive clearing is not undone by application rollback. Preserve valid media and existing notifications. A forward correction or policy change requires its own precise review and authorization.

## 7. Evidence and remaining conditions

- [Migration compatibility](MIGRATION_COMPATIBILITY_033.md): scoped current catalog/ledger, actual hashes/newline mapping, ownership/RLS/grants, unchanged trigger/function dependencies and lock boundary.
- [Source and CI review](SOURCE_AND_CI_REVIEW_033.md): connected routes/imports, ancestry, unchanged product boundaries and the limits of repository-only auto-deploy evidence.
- [Candidate retention/privacy text](RETENTION_PRIVACY_POLICY_CN_KR.md): bilingual operating proposal; owner/privacy approval and responsible-party fields are not fulfilled by the file's existence.
- TASK030/031 actual acceptance and preserved original failures/retests remain in the prior phase records; final TASK033 quality/runtime results belong in the final receipt. This package does not invent pending results, a candidate hash, a production reviewer identity or an approval.

Outstanding production actions remain separate: trusted owner binding, approved policy/operations/notice/secure fulfillment, exact final candidate approval, narrow migrations and controlled deployment/enablement. AI remains **NOT_CONNECTED**, TASK B untouched, MODEL TRAINING: NOT PERFORMED; no external AI service or paid resource is authorized. Real iPad evidence remains PENDING where not actually performed.
