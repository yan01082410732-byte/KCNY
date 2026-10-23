# KCNY-MAIN-20261024-020 — controlled reporting release

Date: 2026-10-24 KST. Base `e894db3d824e87a9650a7a0d31cbe5371141300f`, includes live `8b746b1cf537da1fd93f6cd702b201f316383560`. Independent branch `codex/release-reporting-20261024-020`; prior worktrees, backups and historical files preserved. Shared coordination file is unchanged (historical version 2026-10-16.009); current owner work order provides this release authority.

## Production database: only the two approved files

Identity readback: project KCNY / `czcyarmramlpmilfhpqo`. Before change no reporting schema/table/RPC existed and neither migration was in the ledger. Required columns and public SELECT policies on profiles/posts/comments matched the reviewed contract. Both approved original files were checked byte-for-byte; the new Windows checkout's CRLF conversion was replaced with unchanged approved LF bytes before execution, with no SQL content/Git blob change.

| Approved source | SHA256 | Actual production management ledger entry |
|---|---|---|
| 20261023124108_reports_complaints_review.sql | 02F62B303B8F4656B8BBA3FBDC7A440DEB919B545F25442BB6D106F7BFFB0D98 | 20261023162515 / 20261023124108_reports_complaints_review |
| 20261023125936_reporting_review_http_conflict.sql | 5EE463462CC265352B018C2A547E4C43B54425F3944448431E8C83DC3678A4F5 | 20261023162519 / 20261023125936_reporting_review_http_conflict |

The authenticated management API assigns execution-time ledger versions. This explicit source mapping is not historical ledger repair; the pre-existing eight ledger entries were not modified. Do not later run a blind CLI migration push against mismatched historical/local version lists. No Reply Integrity, notification history repair or other migration was run.

Post-apply readback: five RLS tables; no anonymous reports SELECT; no authenticated direct write grants; private schema not usable by authenticated clients; all four new definer RPCs have fixed empty search_path and no anon EXECUTE; review function contains PT409. Database enabled=false, membership count=0, cases=0. No real case, test account or test data was inserted into Production. Runtime rollback must preserve these tables, cases and audit.

## Application changes and security patch

Project/environment allowlist now supports the exact Production ref only in `VERCEL_ENV=production`, and the exact isolated test ref only outside Production. Explicit flag true is still required; unknown projects, Preview-to-production connection and Production-to-test connection are rejected. Database opt-in is independent. The runtime checker exposes only a reporting-enabled boolean, not credentials or case data. Production KCNY_REPORTS_ENABLED is explicitly false; existing sensitive client/site configuration is neither exported nor replaced. Preview config is unchanged.

Dependency installation reported current advisories. The owner separately approved ONLY Next.js 15.5.27 → 15.5.28 and corresponding lockfiles. Sharp 0.35.5 overrides already covered the image-library workaround, but the Server Actions DoS required the Next patch. npm/pnpm lockfiles were synchronized; no major version upgrade or unrelated feature dependency upgrade. npm audit after the patch: 0 vulnerabilities.

Primary sources: [Next Server Actions advisory](https://github.com/advisories/GHSA-p3m5-59mp-jv5r), [image optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw).

Verification: 422/422 unit tests, 0 failed/skipped; TypeScript PASS; Next 15.5.28 optimized local build PASS; diff check PASS. Five real changed-path checks passed using three legitimate isolated test sessions: updated build/test activation; post-patch submission and human review; cross-user privacy and Korean 390px refresh; same-build flag-off direct Server Action denial, plus genuine session setup. No pageerror observed. This is targeted acceptance, not a rewrite of earlier TASK 017 28/30 + 5/5 or TASK 019 failed-run history.

Local test config was injected into a child process only; no .env was copied into this release worktree. Deployment uses a fresh remote Production build with the platform's existing Production values, not the local test build. `.vercelignore` excludes .env, session/fixture artifacts, SQL and ops drafts, tests/docs and caches.

## Activation gates and retention

No reliable owner-to-production-Auth-UUID binding was provided/found in the authorized records. No production Auth users/emails were enumerated or guessed. The current dashboard/platform login is not evidence of a KCNY owner account. No production reviewer was granted; test members were not copied.

Owner retention policy is documented in `reporting-retention-020.md`: periodic unresolved-case review, 90-day closed/no-appeal target, coverage of all text/payload copies, non-identifying statistics, reason and next date for extensions. `ops/reporting-retention-020.sql` is a management-only transaction DRAFT, not a migration or public API. It uses bounded explicit cases, exclusive locks, a transaction-scoped named trigger exception, identity/text redaction, private payload removal, guard restoration and anonymous statistics; cases/audit are retained. It is excluded from runtime upload.

Synthetic acceptance is **BLOCKED**, not passed: three management attempts returned `Invalid or expired requestState`, including one that catches expected database rejections internally. These are interface errors, not proof that SQL guards worked. Readback confirmed the eligible fixture unchanged and immutable guard still enabled; test DB enabled was restored. The official browser showed the test SQL editor, but no query or weakening action was executed there and no credential/tool-policy workaround was used. No additional persistent migration was needed/applied. Real-data maintenance remains forbidden under this task.

Therefore live submission MUST stay disabled. Reviewer binding alone is not sufficient: genuine retention procedure execution acceptance is also still required. Do not claim automatic deletion, complete physical erasure from backups, or production readiness of the maintenance draft. Any future real cleanup needs exact-case authorization and backup/log/export disposition.

## Controlled deployment / rollback

Before release the exact domain resolved to READY deployment `dpl_7SVQnLoNGT4YcgA9yiiKLSHwHQGV`, URL `kcny-6in3jhhqi-yan-s-projects24.vercel.app`, source 8b746b1. No intervening live change. The existing project is `prj_7Q90QVY7HilMNGKK7wxdgnXNjfIs`, team `team_s5ssiZaSYWtndwapRbti6Dxs`; production Git branch main, no deploy hooks or workflow files. A dedicated branch push does not promote Production. Recheck target immediately before promotion.

Stage a fresh Production build using CLI 65.2.0 `deploy --prod --skip-domain`, verify exact commit, live configuration booleans, disabled reporting, public routes/assets and protected route behavior, then promote the same READY deployment. Do not merge main. Exact new deployment ID, release SHA and post-release checks are recorded externally to avoid a self-referential commit hash.

Rollback target: the recorded previous production deployment above. In a severe connection/privacy/core-route regression, retain both switches off and use official `vercel rollback` to that deployment, then verify the alias, public routes and correct backend. No DROP, case/audit deletion or database rollback. The previous application remains compatible with the new disabled schema. Note that rollback to 8b746b1 would also restore the older Next version; prefer fix-forward with the patch when safely possible rather than leaving the security patch reverted.

Final expected operating state: DEPLOYED_DISABLED, NOT enabled. Remaining activation work: trustworthy owner account binding AND actual manual-retention execution acceptance. No AI/TASK B/media/preferences expansion. Next product module: image upload.
