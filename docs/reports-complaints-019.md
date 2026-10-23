# TASK 019 — 举报、投诉持久化与人工审核

Date: 2026-10-23 (Asia/Seoul). Scope: TASK A only. Base verified by ancestry: `8b746b1cf537da1fd93f6cd702b201f316383560`; branch `codex/reports-complaints-019` in a new independent worktree. The deployed release checkout and original stability checkout were preserved. Shared coordination remains `2026-10-16.009`; it was not edited.

## Delivered

| Section | Implementation / verification |
|---|---|
| Submission | Session-derived reporter, real returned case UUID, actual target lookup, profile username resolved to stable UUID; comment/reply type checked against the row. General complaints may omit a target. |
| Retry / limits | Per-user request UUID + canonical payload; same request returns same case, changed payload conflicts. Actor-scoped transaction lock serializes duplicate retries. Maximum 10 new cases/user/hour; idempotent retry precedes rate/target revalidation. |
| My cases | `/reports`, `/reports/[id]`; explicit safe field selection, reporter filter and database RLS, 20-row keyset pages ordered by `created_at DESC,id DESC`. Empty, unavailable, error and no-access states are distinct. |
| Review | `/reports/review`, `/reports/review/[id]`; private membership, never user metadata; pending → under_review → resolved/dismissed. Expected version + row lock, actor derived from `auth.uid()`. |
| Audit / privacy | Public resolution separate from private append-only audit. State change and audit insertion are one database transaction. No ordinary direct table mutation rights; reviewers cannot rewrite audit. No automatic deletion, bans, penalties or AI decisions. |
| UI | CN/KR forms, status labels, errors and target labels. Controlled submission/review inputs survive recoverable failure; pending lock prevents duplicate clicks. 390px layouts exercised. |
| Target deletion | No target or reporter cascade FK on cases. A disposable synthetic post was deleted by its actual owner; case, audit and request retry still worked. |

## Activation and isolation

Only `kcny-e2e-017` / `kirvcbkbkvotnsqnbcyf` was modified. Management identity was verified before changes. Local UI is `http://localhost:3101`; a separate `localhost:3102` instance provided the server-flag-off control.

`REPORT_PERSISTENCE_AVAILABLE` remains false. Activation requires BOTH `KCNY_REPORTS_ENABLED=true` and the exact allowlisted test-project URL, plus the database configuration row `enabled=true`. Production remains disabled even if the server flag alone is accidentally set. Neither existing Vercel environment nor Production/Preview connection was changed. A future production rollout needs a separately reviewed allowlist change, not a global true constant.

Database additions: `public.reports`; private configuration, reviewers, requests and review_events; four guarded public RPCs; private immutable-audit trigger function; two immutability triggers; three pagination/audit indexes. All five new tables have RLS. Public clients have SELECT only on reports; no grants or schema usage on private tables. RPCs are authenticated-only, SECURITY DEFINER, fully qualified and fixed empty search_path. The definer is required to perform narrow atomic writes while ordinary users have no direct write rights.

One NEW synthetic reviewer was initialized through the authorized test management channel, then genuinely signed in through normal password Auth and the website. The two existing synthetic accounts remained ordinary users. No service_role was used for business/permission proof. Confirm email was never disabled; final public Auth settings check confirmed email confirmation remains required. No account passwords, tokens, cookies or browser storage are in Git or the evidence archive.

## Exact migration chain

| Source file | Test-only remote ledger version / name |
|---|---|
| `20261023124108_reports_complaints_review.sql` | `20261023124728 / reports_complaints_review_019` |
| `20261023125936_reporting_review_http_conflict.sql` | `20261023130001 / reporting_review_http_conflict_019` |

The management tool records execution-time versions; the source mapping is explicit above. No unrelated migration or ledger repair was performed. Source SHA256 respectively: `02F62B303B8F4656B8BBA3FBDC7A440DEB919B545F25442BB6D106F7BFFB0D98`, `5EE463462CC265352B018C2A547E4C43B54425F3944448431E8C83DC3678A4F5`.

Two additional **test-control-only** management migrations introduced and removed a fault trigger (`20261023130249`, `20261023130629`). It affected only one synthetic case to prove rollback. The trigger/function are absent now. They are not production migration files and must never be deployed there.

## Real acceptance, not mocked sessions

Windows, local Chromium 156.0.8078.4 via existing external Playwright installation, Next.js production build. Separate browser contexts and ordinary API sessions for A, B and reviewer; anonymous control separate. Request routing allowed localhost, the test Supabase hostname and fonts only. No Production data or credentials copied. All test browser sessions signed out and contexts closed.

| Required scenario | Latest result / primary evidence run |
|---|---|
| 1. A submission gets real ID and survives refresh | PASS — core |
| 2. Targetless complaint | PASS — core, Korean narrow form |
| 3. Double click / same-request retry / changed-content conflict | PASS — core |
| 4. B cannot read A case or private audit | PASS — core |
| 5. Report target cannot learn reporter identity | PASS — core (B is the profile target) |
| 6. Ordinary direct API status/self-grant denied | PASS — core |
| 7. Forged editable user_metadata does not authorize | PASS — core; synthetic keys cleared afterward |
| 8. Accept then resolve/dismiss; correct public result | PASS — core and final build browser flow |
| 9. No internal note or reviewer identity in reporter UI/RSC response | PASS — core and final build |
| 10. Invalid transition, concurrency and audit failure | PASS — corrected / audit-failure retest / audit-recovered |
| 11. Revoked reviewer denied by RPC/history and page | PASS — revoked; dedicated membership restored afterward |
| 12. Chinese/Korean and narrow-screen flow | PASS — core, final, checkpoint-smoke; no horizontal overflow |
| 13. Server/DB flag off rejects operations | PASS — core server-action replay against flag-off instance; db-off direct API and UI |

Additional PASS: real target existence/type checks, stable profile ID, same target/different reporters remain separate, target deletion retention, direct audit rewrite denied for all three users, rate limit and retry exception, reviewer own empty list, 20+10 own-case pagination with no duplicates, status-preserving reviewer pagination, final localized audit and public result.

Stable safe archive: `D:\KCNY-main-site-audit\KCNY-MAIN-20261023-019\`. It contains original per-run `results.json`, selected PNG screenshots, safe pagination IDs and runner source. Credential vaults, unseal scripts, environment files and session state are excluded. Active runner/credential adapters remain outside the repository under the original visualization sibling `kcny-reports-019-evidence`; rerunning writes requires verifying test identity and accounting for the 10/hour limit first. Pagination used 23 synthetic management-created cases dated two hours earlier with matching initial audits; these fixtures prove pagination, **not** ordinary-user write permission.

### Failure history and corrections (retained)

Do not describe the first batch as fully green. Core: 13 PASS / 2 FAIL. Corrected batch: 6 PASS / 1 FAIL. First audit-failure batch: 1 PASS / 1 FAIL. First final batch: 5 PASS / 1 FAIL.

1. Two core failures were one compatibility defect: business version conflicts raised SQLSTATE 40001, causing PostgREST retry/timeouts. No overwrite was observed. The follow-up migration uses PT409. Real retest returned HTTP 409 in 98ms and exactly one concurrent winner. See [Supabase's documented 40001 retry issue](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b). This was **not an unauthenticated account error**; reviewer login and successful review had independently passed.
2. Audit failure correctly rolled back, but uncontrolled React form fields cleared. Converted all review inputs to controlled state. Same fault retest passed; state/version/audit stayed pending/1/one initial event and inputs remained editable. Fault removal then normal retry passed.
3. One harness selector matched Next's route announcer as well as the form alert. Narrowed it; input-preservation retest passed without changing the application expectation.
4. One harness pagination assertion read the old list before URL transition completed. Explicitly awaited the cursor URL and first-row change; two pages were 20 and 10 with no repeated ID. No pagination source change was needed.

Across stored runs: 44 PASS assertions and 5 historical FAIL assertions, including repeated login/setup checks; these totals are **not** 49 independent business scenarios. All 13 required scenarios have passing final evidence, no known unresolved failing scenario. No pageerror observed. No assertion bypassed to manufacture a pass. Synthetic metadata permission forgery, expected access denials and deliberate audit rejection are expected controls, not user-facing application failures.

## Verification / focused retrospective

Full unit suite: **418/418 PASS**, 0 skipped/cancelled; TypeScript PASS; Next.js 15.5.27 optimized build PASS; `git diff --check` PASS. Browser/API results above are separate from unit/static contract tests. Final read-only smoke: 4/4 PASS after last localization update.

Focused security review: `docs/reporting-security-019.md`. No open confirmed critical issue in this module. The retry-code issue and review-input-loss issue were corrected. Non-blocking retention/operations/large-scale performance work is in Bug Backlog. Existing 28 historical ERR_ABORTED remain UNKNOWN; no reclassification or unrelated audit was undertaken.

Final isolated snapshot: 40 synthetic cases, 49 audit rows, 0 cases missing an audit, 23 pagination fixtures; one dedicated reviewer, zero ordinary-account promotions; test DB feature on, fault object absent. Synthetic cases and evidence retained intentionally. No Production DB schema/data/Auth/Storage/Ledger changes, no deployment, no TASK B modifications, AI calls or model training, no push/merge/rebase.

Local checkpoint is authorized only after reviewed source, migrations, tests and safe documentation pass staged-content checks. Its hash is reported in the final receipt; no secrets, test-account seeds or runtime evidence/fixtures enter that commit. See the separate production change request: **this task does not authorize production rollout**.
