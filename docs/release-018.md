# KCNY-MAIN-20261023-018-RELEASE

Owner-authorized Production release of TASK 007–015, 2026-10-23 KST.

Application source baseline: `9d75804748137e78ee8b1c6eebe069b209708206` (TASK 016 checkpoint). TASK 017 changed local environment and acceptance documentation, not application source. This release preserves that tested source. Release commit and deployed IDs are recorded in the external execution receipt after deployment, avoiding a self-referential commit hash in this file.

Target: GitHub `yan01082410732-byte/KCNY`; dedicated branch `codex/release-main-20261023-018`; Vercel project `kcny` / `prj_7Q90QVY7HilMNGKK7wxdgnXNjfIs`; team `team_s5ssiZaSYWtndwapRbti6Dxs`; domain `kcny.vercel.app`.

Production backend: `czcyarmramlpmilfhpqo`. Independent acceptance backend `kirvcbkbkvotnsqnbcyf` is excluded from the deployment. Deployment source comes from this clean release checkout, without local `.env` files, browser state, credentials, test fixture data or build caches. `.vercelignore` additionally excludes SQL, test runners, documentation and local reports from the uploaded runtime package. `.vercel/` is Git-ignored.

Read-only compatibility review confirmed the 7 existing public tables/required columns, RLS policies and notification triggers. The pending reply-integrity migration remains absent from Production. Application-level reply validation remains active; this release does not depend on that migration being installed. No database, ledger, RLS/Auth/Storage change is authorized by this release.

Still disabled/unavailable: report/complaint persistence, trusted administrator review, image upload, per-type notification preferences. No AI integration.

Acceptance evidence is preserved in `main-e2e-017-env.md`: complete real interaction batch 28/30, followed by targeted 5/5. Do not rewrite it as a complete 30/30 pass. Reply notification initial-display fluctuation is a documented non-blocking risk. Historical 28 ERR_ABORTED remain unresolved under accepted observability limits. Real email delivery/verification, natural session expiry and actual iPad hardware remain outside completed acceptance.

Execution gates: inspect Git/auto-deployment rules, record previous live deployment and rollback target, validate exact commit with full unit suite/TypeScript/build, build Production with `--skip-domain`, verify staged Production read-only, then promote that same deployment and verify alias/backend/logs. Use existing Production configuration; never upload the test `.env.local`. No synthetic writes are performed on Production.

Rollback: if backend isolation, privacy or persistent core-route checks fail, restore the recorded previous Production deployment via the platform's official rollback/promote flow. Do not roll back or rewrite database state. Ordinary UI issues and known notification timing remain in the backlog.
