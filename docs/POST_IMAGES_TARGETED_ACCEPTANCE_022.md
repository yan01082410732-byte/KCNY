# TASK 022 — targeted corrections and acceptance

2026-10-25 KST. Branch `codex/post-images-022`, based on
`221d9fc3134bc8f91d664bcaa0c90908ca519cd6`. Original TASK 021 worktree and evidence
remain intact. No production query/write/deployment, reporting switch change,
paid resource, TASK B modification, AI call, push or merge.

## Corrections

1. Acknowledged finish/remove is independent from cleanup. Actual image/version
   and `committed=true` survive discovery/claim/ack errors; UI shows saved plus a
   bilingual cleanup warning. Durable lifecycle/lease state is the recovery record.
2. Validation rejection ends before finish. Lost commit responses reconcile by
   upload/removal request ID; unknown returns 503 `outcome_unknown` rather than
   success/reject/replayed mutation. Client retries preserve allocation/version and
   first reconcile a previous unknown result. Foreign outcome lookups return 404.
3. Management discovery includes unqueued expired pending/rejected/processing
   uploads, expired deleting leases, unreferenced images and observed late objects.
   Live processing leases and current references remain protected. No ordinary
   global cleanup endpoint. Existing server authority uses bounded helper/API deletes.
4. App and Edge share exact test/production identity logic. Production requires
   the complete trusted Production combination, writes default off. Preview with
   production URL fails closed. JWT deployment configuration is now declarative;
   real Auth verification/visibility checks remain. No production config applied.

New migration: `20261024182118_post_image_outcomes_maintenance_022.sql`.
Applied **only** to `kcny-e2e-017` / `kirvcbkbkvotnsqnbcyf` as management ledger
`20261024182526 / post_image_outcomes_maintenance_022`. Do not repair historical
ledger entries or run all migrations. Both original TASK 021 SQL files retain
their original content/hashes; fresh worktree checkout line-ending conversion was
removed by copying the original bytes, with no Git content change.

## Actual tests — raw failures are retained

Evidence archived separately from Git. TASK 021 **22/24** and its separate **4/4**
are unchanged and were not rerun or represented as one fully green original batch.

| Batch/control | Actual outcome |
|---|---|
| Main `2026-10-24T18-30-54-355Z` | 12 PASS / 1 FAIL. Five commit/cleanup fault combinations passed. Remove/ack assertion failed because the prior claim held the available due tasks; no ack fault was actually reached. |
| Client recovery `client-recovery-1792867111156` | 4 PASS / 1 FAIL. Independent remove/ack retest passed; both browser response-loss cases passed. Security command used the wrong assertion helper and failed as a test-script error; original output retained. |
| Security diagnostics | First diagnostic failed; next recorded foreign outcome=503 `outcome_unknown`, foreign remove=403 while DB switch off, owner upload=403. No private data was returned. This prompted the explicit PT404 mapping fix; switch-off rejection was not counted as ownership proof. |
| Final ownership recheck | 2/2 PASS with DB enabled: other user outcome=404 `upload_not_found`, remove=404 `post_not_owned`. |
| Final DB-off owner recheck | 1/1 PASS: legitimate owner reserve=403. |
| Late PUT control | Original cleanup deleted 2 tasks; delayed PUT was accepted; next old cleanup deleted 0 while one raw object remained. New migration re-discovered/deleted it. DB timestamps were advanced; real signed token was still valid. |
| Abandoned upload | A separate original was uploaded without finalize, uploader session signed out, zero jobs existed. Management discovery found it; trusted runtime helper removed raw object and completed 2 jobs without uploader reauthentication. |
| Processing lease | Synthetic live processing lease prevented queuing/deletion despite advanced expiry; raw object remained. State was restored for abandoned-upload control. |
| Interrupted ack lease | Actual deletion happened but injected ack failed, leaving `deleting` with object absent. Its two-minute lease was observed naturally expired and management helper completed retry with attempts>=2. That lease was not shortened. |
| Active image protection | Five active final objects existed before and after maintenance. Another ordinary user actually read three current signed images. Remaining fixtures were intentionally deleted only afterward. |

Cleanup faults were temporary test-worker fetch controls: v7 discovery, v8 claim,
v9/v12 ack, v10 lost RPC commit response. SQL/Storage really executed outside the
injected step. v14/v17 temporarily invoked the trusted maintenance helper at
test-only worker initialization through the authorized management deployment;
they exposed no ordinary global maintenance operation and exported no server key.
These controls are not part of the final worker. Final normal version **18** has
bundle SHA256 `2f6003890e21334d5fe1a447b58cec6b4219767ead981cc4932d6f448e41f3db`.

Initial browser startup was blocked by the local server's network sandbox
(`service_unavailable`), not proven bad credentials. Only that test server/browser
was stopped; approved network execution restored localhost login. Initial failure
notes are separate, not silently relabelled PASS.

Browser testing used real website login and two legitimate isolated ordinary
accounts, localhost, Chromium, 820px/390px viewports and synthetic images only.
Screenshots include CN saved/pending warnings and KR mobile response recovery.
No auth state, passwords, cookies, signed URL values or raw image files saved.
Mocks are separate: dependency tests verify acknowledged/unknown/failed commits,
all six fault cases, client identifier recovery and maintenance behavior.

Missing and malformed credentials plus a forged expired-claim JWT were actually
rejected. A naturally expired, correctly signed credential was **not available**;
the forged expired claim is not presented as that test. Real iPad/Safari: PENDING.

## Final verification / restoration

- Unit tests: **459/459 PASS**, 0 failed, 0 skipped (historical baseline 437).
- TypeScript: PASS. Next.js 15.5.28 optimized build: PASS. Diff check: PASS.
- Runtime localhost server started and real UI/API/database checks ran; build-only
  validation is not described as browser acceptance.
- Final test readback: module Storage objects 0, unfinished jobs 0, TASK 022 posts 0,
  DB media switch false. Synthetic lifecycle/idempotency records remain; no raw media.
- Ordinary clients cannot execute new outcome/maintenance RPCs directly. No new
  media advisor privilege warning: six private deny-all RLS INFO notices and the
  inherited intentional actor-bound creation RPC notice remain reviewed exceptions.
  See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .
- Test sessions signed out and localhost server stopped. Original worktrees and
  backups remain. Production/reporting/AI untouched.

One targeted retrospective completed. No unresolved critical defect in the tested
paths. Defer actual iPad, naturally expired signed-credential acceptance, broader
resource benchmarks and the previously recorded native file-picker polish. Production
release/operational approval remains separate; see `POST_IMAGES_RELEASE_CHECKLIST_022.md`.

## Reproduction entry points

`tests/e2e/post-images-022.mjs` and `post-images-recovery-022.mjs` require an approved
repo-external fixture module/output directory (`KCNY_E2E_FIXTURE_MODULE`,
`KCNY_E2E_OUT`). Credentials remain in the existing secure workflow. Interactive
commands let the operator install each isolated fault between phases. Run ack
cases individually with a verified due task (`operation: finalize/remove`), not
back-to-back against the same claimed batch. Set DB enabled for ownership checks;
test switch-off separately. Do not deploy test fault/bootstrap code to production.
