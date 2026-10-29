# KCNY-MAIN-20261029-036-038 — consolidated receipt

Executed in isolated TASK A worktree `kcny-community-036-038`, branch `codex/main-community-improvements-036-038`. Base `2a1217f4b4714a665e516a3f31f8489d2809011a` was verified against the current Production domain/source before editing. Original release checkout remained clean and unchanged. Shared coordination `2026-10-16.009` is a historical record, not a claim that its old commit is the current release; it was not modified.

## Delivered and saved

| Phase | Working implementation | Real evidence | Checkpoint |
|---|---|---|---|
|036|Invoker bounded following query, category/keyset validation, existing count/profile/interaction embedding retained|7/7 API/browser;1005 follows old cap1000,61 posts in4 pages; zero-follow separately SQL-role/rollback|`5ef9bdc374771d7847b1565264c543fed977f72f`|
|037|Atomic user/request receipts, raw-payload binding, same-key lookup/retry, tombstones, no duplicate notification|Original7/8; locator recheck0/1 then1/1; actual response-drop/remount recovered; natural expired signed-session case NOT RUN|`4fc33130c73678dfcb424bd26e3afbb32713d5bd`|
|038|25s visible authenticated polling, bounded request/backoff, auth-change/reset, cross-tab read invalidation|Original bootstrap FAIL; native timer invocation fixed; separate9/9 real browser PASS|This final checkpoint; resolve with `git rev-parse HEAD`|

Final suite **684/684 PASS**, zero skipped/cancelled; TypeScript PASS; Next.js15.5.28 optimized build PASS; diff check PASS. Initial683/684 failure retained and obsolete direct-INSERT source assertion updated to the new authenticated RPC contract, not relaxed business expectations. Build took23,439ms in this run, not a production performance guarantee. Mobile/tablet/desktop Chromium CN/KR checks passed; no actual iPad pass claimed.

## Database/security scope

Exactly two new migrations were applied only to verified `kcny-e2e-017` / `kirvcbkbkvotnsqnbcyf`; production DDL count0. File order/hash and release/rollback requirements are in `PRODUCTION_CHANGE_REQUEST.md`. Five function-body hashes (whitespace normalized) matched test definitions. Catalog confirmed invoker public RPCs authenticated-only, private helper EXECUTE denied, journal RLS on and authenticated SELECT-own only. Real A/B calls confirmed isolation and no unauthorized ownership UPDATE. New objects had no matching security-advisor finding; unrelated preexisting warnings were not expanded into an audit or silently fixed.

Production read-only baseline: reporting databaseFALSE and applicationFALSE; media databaseTRUE with one active media Cron. No Production config/data/deployment changed. Local acceptance process disabled reporting/media writes without changing test database reporting state (previouslyTRUE) or any Production switch. No managed Realtime schema/publication was modified. Two existing ordinary test accounts were reused via original protected state; no password, session, trace, browser storage or secret was committed.

## Evidence and restore

External sibling folder `KCNY-MAIN-20261029-036-038-evidence` preserves runners, synthetic seed script, original per-run results, screenshots, failure diagnostics and final unit/type/build logs. It contains no exported browser storage or decrypted credential material. Protected account state remains in its original preexisting location and was not copied into this repository.

Synthetic fixtures (including1005 non-login fixture authors and61 posts) remain in the isolated test project for reproducibility; do not delete unrelated fixtures or active media to obtain zero counts. Temporary B follow relationships were restored, and notification preference values restored in test cleanup. Only this batch's recorded localhost server process tree was stopped; no Windows setting/service/task/reboot was changed.

Resume from this branch's final HEAD. Never reset/clean old worktrees. For the two unexecuted acceptance edges, reuse protected test credentials and test-only transport instrumentation; do not weaken Auth or take the production DB offline. This package is **PARTIAL acceptance**, not a Production deployment claim: naturally expired signed-session UI and actual following-DB failure/recovery were not exercised. Tested HTTP/browser fault and unit error handling are separately identified. Code delivery, phase checkpoints and the remaining requested real flows are complete.

TASK B AI branch/dirty worktree,15search files and models were not modified.065R remains DEFERRED / NOT SUPERSEDED. No push, merge, deployment, paid AI/network inference or paid resource purchase. See the single targeted retrospective in `bug-backlog.md`; do not reopen unrelated historical infrastructure issues.

Next: close the specifically unexecuted acceptance edges, then request separate approval for exact two migrations plus application rollout and polling load; keep reporting OFF/OFF and media unchanged. Do not start another feature batch implicitly.
