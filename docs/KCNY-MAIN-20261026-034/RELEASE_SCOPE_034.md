# TASK034 — controlled disabled release scope

Date:2026-10-26, Asia/Seoul. Owner order authorizes **DEPLOYED_DISABLED**, not live reporting submissions. Source is the reviewed RC `d1561be2a4f80a2f9f77c364e9f17ec1659a832c`, descending from current released `102c892115ce11b6c7a65d9c57f44c637bbb950f`.

The release commit adds only this scope record and a branch-specific `vercel.json` guard. All application, tests and migration bytes remain the reviewed RC. Vercel Git automatic deployments are currently enabled, so `git.deploymentEnabled["codex/release-reporting-operations-034"]=false` prevents a push to this dedicated branch from creating an unreviewed automatic deployment. Other branches retain existing defaults. No Preview connection, platform Auth, media or notification setting changes. Official contract: https://vercel.com/docs/project-configuration/git-configuration.

Only two production migrations are authorized, selectively and in order:

1. `20261026082221_reporting_operations_privacy_030.sql` — SHA256 `D5804834710BD83E47DB1E1D039B31E98354B8DF495924A9F2D7BC266383DB67`.
2. `20261026085144_reporting_review_workspace_031.sql` — SHA256 `674013D93721AA958BDE0014DC267B22167CB54D1F1125D5499D335AF6103451`.

Use exact Git payloads; preserve historical test-ledger timestamp/final-LF differences. No full migration push, ledger repair, unrelated SQL, reviewer appointment or real privacy clearing. Migration defaults must remain reportingOFF, operationsOFF and policyFALSE; existing reviewer0. Migration/object conflict stops production progression. If030alone commits, report partial installation and do not promote the application.

Production target: `czcyarmramlpmilfhpqo`; test target: `kirvcbkbkvotnsqnbcyf`. Exact current Vercel project `prj_7Q90QVY7HilMNGKK7wxdgnXNjfIs`, team `team_s5ssiZaSYWtndwapRbti6Dxs`, domain `kcny.vercel.app`. Prior deployment/rollback target `dpl_D13k5Dvwwxt4hkRmG9LRodVetteA`, source102c892 above, must be reverified before staging/promotion.

Create a fresh Production-configured deployment with `--prod --skip-domain`; wait READY, verify source/configuration and read-only route/security checks, then promote only that build. Do not upload local test configuration/state, credentials, original browser evidence, caches, database scripts or test data. No production synthetic business mutations are part of acceptance.

Post-release: verify exact alias/commit, media application+databaseON and existing active Cron preserved, notifications contract accessible, reportingOFF/OFF, no reviewer assigned, no policy approved and AI_NOT_CONNECTED. Run bounded error/fatal/5xx checks and real read-only browser checks. Preserve original11/14+3/3 and0337/10+5/6+3/3 separately. Current local automated checks are642/642, TypeScript/build/diffPASS; final deployed build/acceptance evidence is recorded separately, never inferred from this document.

Rollback preserves all cases, audits, requests, membership records and receipts; close gates and restore prior application if required. No DROP, case deletion, trigger disabling or data clearing. Media/Cron/Storage, notification preferences, TASK B and actual AI services are outside mutation scope.

## Minimum future activation decision

Before any later LIVE_ENABLED authorization, the owner must approve one precise package naming: personally confirmed Production account UUID, independent trusted management grant reference and operator, revoke/audit path, candidate90-day/open-case/exception/privacy rules, secure access/correction/deletion fulfillment and incident responsibility, and exact double-gate enablement/read-only acceptance. A signed self-confirmation is not a role grant; deletion approval is not completed deletion. This034release does not satisfy or execute those activation conditions.
