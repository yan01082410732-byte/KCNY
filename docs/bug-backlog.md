# KCNY bug and acceptance backlog

## Isolated real acceptance update — 2026-10-23 (017-ENV)

See `main-e2e-017-env.md`. E2E-017-01/02 are resolved for the independent project `kirvcbkbkvotnsqnbcyf`, not the shared Preview/Production backend. Both ordinary synthetic accounts logged in; confirmed core interaction flows and screenshots now exist. Earlier historical rows below remain for traceability, not as current blanket browser blockers. Report persistence/admin authority/media/preferences contracts remain blocked.

| ID | Status | Evidence / follow-up |
|---|---|---|
| E2E-ENV-01 | Local configuration caveat | Do not mix 127.0.0.1 and localhost: language redirect changes local hostname and host-only session cookies do not follow. Canonical localhost passed authenticated language navigation/reload. |
| E2E-ENV-02 | Non-critical acceptance instability / deferred | One new reply notification was absent during the complete browser batch despite correct persisted recipient/row; fresh legitimate login rendered it and deep link passed. Bound a future freshness/cache investigation; do not claim all runs passed. |
| E2E-ENV-03 | Test harness corrected | Wait for edit-route URL and heading before filling content; the prior selector could match the detail comment field during navigation. Actual edit/save passed targeted recheck. |
| E2E-ENV-04 | Acceptance pending | Confirm email restored after explicitly approved synthetic signup exception. Actual mail delivery/verification and naturally expired sessions remain untested. |
| E2E-ENV-05 | Non-critical advisory follow-up | Existing set_updated_at search_path / trigger-function execute advisor warnings retained. No confirmed privilege escalation; no shared schema changed. |
| E2E-ENV-06 | Environment evidence / deferred | Restricted Node-REPL browser network failed; approved terminal browser succeeded. Dev-mode Event exceptions not reproduced in optimized build. Preserve diagnostics without inferring an application cause. |
| E2E-ENV-07 | Partial acceptance | Create/edit/profile save, comments/replies, notification types/read badge, like/follow, data-backed search, language persistence and 390/820px authenticated views passed in real browser. Large pagination, all mutation failure modes and actual iPad hardware remain pending. |

No confirmed critical source defect was found. Test-only reply integrity is installed; Production migration authorization remains separate. Historical 28 ERR_ABORTED remain UNKNOWN.

Like integration delivery 2026-10-21 (KCNY-MAIN-20261021-012): no confirmed new critical defect remains in the affected source. Post-like totals now come from relation aggregates rather than potentially truncated like-row lists; current-user state is fetched separately. Existing notification triggers remain unchanged.

| ID | Priority / status | Finding and planned follow-up |
|---|---|---|
| LIKE-012-01 | Acceptance / pending | Verify embedded `post_likes(count)` support and like/unlike count/state across general feed, Following Feed, search, profile, detail and bookmarks against the intended non-production Supabase project. Automated tests/build do not establish live query compatibility. |
| LIKE-012-02 | Acceptance / pending | Confirm notification arrival, de-duplication, self-like exclusion and unread badge refresh with two ordinary accounts in non-production. Existing trigger definitions and focus/visibility refresh are reviewed, not newly deployed. |
| LIKE-012-03 | Non-critical / deferred | Unread notification count refreshes on route/focus/visibility/read actions, not realtime while an idle tab stays visible. Realtime delivery remains separately deferred. |
| LIKE-012-04 | Non-critical / deferred | A network failure can leave mutation outcome ambiguous. The UI now asks users to refresh before retrying; cross-retry idempotency beyond the existing unique key needs a separate product decision. |


Content publishing delivery 2026-10-21 (KCNY-MAIN-20261021-011): no confirmed new critical defect remains in the affected source. The false-success path for zero-row post update/delete was corrected. Drafts now survive recoverable redirects within the browser tab, scoped by user and create/edit post identity.

| ID | Priority / status | Finding and planned follow-up |
|---|---|---|
| POST-011-01 | Acceptance / pending | Exercise create/edit failure recovery, success-only draft clearing, duplicate-submit controls, deletion confirmation and profile return in a real authenticated non-production browser. Automated checks do not substitute for this. |
| POST-011-02 | Feature blocker / separate infrastructure decision | No approved post-media field, storage bucket or Storage policy exists. Publishing remains explicitly text-only. Propose a media contract separately before upload or attachment support. |
| POST-011-03 | Non-critical / deferred | Session storage may be unavailable or cleared; the mounted in-memory draft remains, but remount recovery then cannot be guaranteed. Do not persist post drafts to the server without a privacy decision. |
| POST-011-04 | Non-critical / deferred | Network ambiguity after a completed create request may still lead to duplicate posts if the user manually retries. The pending button blocks rapid same-form submits; cross-retry idempotency requires a separately approved contract. |


Social discovery delivery 2026-10-21 (KCNY-MAIN-20261020-010): relationship lists now use bounded keyset pagination, so UX-009-03 below is addressed in source. No new critical defect was confirmed in the affected paths.

| ID | Priority / status | Finding and planned follow-up |
|---|---|---|
| SOCIAL-010-01 | Acceptance / pending | Exercise follower/following next-page links, category filters, author/category card links, CN/KR labels, and 280–1280px overflow in a real non-production browser. Static tests and build are not browser acceptance. |
| SOCIAL-010-02 | Scale / deferred | Following Feed still fetches all followed IDs before a bounded post query (CI-007-03). This can hit row limits for very large social graphs; a separately reviewed server-side approach may be needed. |
| SOCIAL-010-03 | Pagination / deferred | Keyset pagination is stable for a fixed relation set, but concurrent follow/unfollow changes can move entries between pages. Snapshot-consistent pagination would need a product requirement and a separate design. |


Community experience delivery 2026-10-20 (KCNY-MAIN-20261020-009): no confirmed new critical defect. The following acceptance and scale items remain; earlier items below are preserved.

| ID | Priority / status | Finding and planned follow-up |
|---|---|---|
| UX-009-01 | Acceptance / pending | Exercise failed comment/reply submissions, page remount, user switching, success-only draft clearing, profile pagination and navigation in an authenticated non-production browser. Local tests/build do not replace this acceptance. |
| UX-009-02 | Residual data integrity / pending separate DB gate | UI blocks same-form rapid duplicates, but an ambiguous network response after a successful insert may still lead to a duplicate on manual retry. The UI tells users to check before retrying. Strong cross-tab/retry idempotency would need a separately approved server/database key. |
| UX-009-03 | Non-critical scale / deferred | Follower/following lists use existing unbounded reads. Add bounded cursor pagination if community size warrants it; current work only distinguishes list-load failure from true empty state. |
| UX-009-04 | Non-critical browser/storage / deferred | Session storage may be disabled or cleared; the mounted in-memory draft still works, but remount persistence then cannot be guaranteed. Do not persist draft text to a server without a separate privacy decision. |


Search delivery 2026-10-20 (KCNY-MAIN-20261020-008): no confirmed critical defect. Prior community items below remain open.

| ID | Priority / status | Finding and planned follow-up |
|---|---|---|
| SEARCH-008-01 | Acceptance / pending | Confirm title/body/user search, cursor transitions, CN/KR filters and 280–1280px layout in a real browser backed by a non-production dataset. Automated pagination coverage is synthetic; live acceptance was not available this round. |
| SEARCH-008-02 | Scale / deferred | `%term%` title/body and profile ILIKE searches may become slow on a large dataset. Review query plans and separately approve indexing/full-text search only when scale warrants it. No DB change authorized. |
| SEARCH-008-03 | UX / deferred | Popularity sorting is not offered because existing engagement tables have no approved, queryable aggregate order. Current choices are recent and title-first relevance. |
| SEARCH-008-04 | Product / deferred | Username search result cards use initials, since the existing public profile contract exposes no avatar field. Avoid exposing auth metadata or inventing a schema field. |


Updated 2026-10-20 KST for KCNY-MAIN-20261020-007. No confirmed new critical bug remains from this delivery.

| ID | Priority / status | Finding and planned follow-up |
|---|---|---|
| CI-007-01 | Non-critical acceptance / pending | Browser inventory currently empty. Verify read-one/read-all → badge/list refresh, older-comment target, and both cursor pagers in one authenticated session when available. Never substitute mock results for real-browser acceptance. |
| CI-007-02 | Non-critical acceptance / pending | New notification/pagination CSS statically reviewed only. Measure actual 280/390px viewport overflow and CN/KR label wrapping later. |
| CI-007-03 | Non-critical scale / deferred | Following IDs still use the existing single `user_follows` query, bounded by server row limits. Very large follow lists need paged ID retrieval or a separately reviewed server-side query. Current feed post pagination does not remove this inherited scale ceiling. |
| CI-007-04 | Non-critical UX / deferred | Comment/reply errors use the existing redirect workflow, which does not preserve unsent draft content. A future action-state composer can preserve drafts without schema changes. |
| CI-007-05 | Non-critical notification UX / deferred | Realtime badge delivery and automatically marking read on target click remain deferred; this round uses explicit single/all read controls and navigation/focus refresh. |
| CI-007-06 | Non-critical test tooling / deferred | Node emits the existing MODULE_TYPELESS_PACKAGE_JSON warning for TS imports. Do not change package module format during community feature work. |
| FOUNDATION-DB | Existing separate security gate | Reply-integrity migration is prepared but unapplied. App validation remains active; direct database enforcement awaits its separately approved isolation/migration workflow. Feature work does not authorize DB/RLS changes. |
| FOUNDATION-RUNTIME | Existing accepted residual risk | Historical 28 ERR_ABORTED causes remain unresolved under coordination `.009`; no event reclassification or new browser telemetry investigation in this delivery. |

Next development priority after acceptance: improve draft-preserving comment composition, then address large-follow-list retrieval when justified by product usage. No independent AI-module change is requested.
# Settings/profile delivery 2026-10-21 (KCNY-MAIN-20261021-013)

No confirmed critical issue remains from this section. Pending non-critical items:

| ID | Status | Finding and follow-up |
|---|---|---|
| SETTINGS-013-01 | Acceptance pending | Exercise profile save/failure recovery, language cookie navigation/reload, and 280–1280px settings layout in an authenticated non-production browser. Automated tests and build do not establish browser acceptance. |
| SETTINGS-013-02 | Product contract pending | Per-type notification preferences have no approved persistence field or delivery-suppression contract. Do not offer a toggle until schema/policy and notification behaviour are separately approved. |
| SETTINGS-013-03 | Non-critical | Session storage may be disabled or cleared; mounted edits remain available, but remount restoration cannot then be guaranteed. |

# Reporting/moderation delivery 2026-10-21 (KCNY-MAIN-20261021-014)

No confirmed critical defect remains in the affected code. Submission is intentionally unavailable until a separately approved persistence and permissions contract exists.

| ID | Status | Finding and follow-up |
|---|---|---|
| REPORT-014-01 | Infrastructure gate | No approved reports table, RLS/grants, admin authority or status audit contract. See `REPORTING_CHANGE_REQUEST_014.md`; never enable the button without verified persistence and privacy tests. |
| REPORT-014-02 | Acceptance pending | Exercise report links, login return, CN/KR form and mobile layout in a non-production browser. Static tests/build are not browser acceptance. |
| REPORT-014-03 | Product decision | Define evidence retention, deleted-content handling, duplicate/rate-limit rules and safe reporter-visible status before implementation. |

# Authentication/onboarding delivery 2026-10-22 (KCNY-MAIN-20261022-015)

No confirmed critical defect remains after the return-destination correction. The following acceptance is pending, not passed:

| ID | Status | Finding and follow-up |
|---|---|---|
| AUTH-015-01 | Browser acceptance blocked | Current controlled-browser inventory is empty. Test login, signup confirmation, session restore/expiry, logout, bilingual navigation and responsive layouts once an authorized visible browser is available. |
| AUTH-015-02 | Test-account access blocked | Two historical work/test passwords are unknown. No approved E2E secret, auth fixture or magic-link path was identified. Obtain an approved non-production login method or user/admin-assisted account access without extracting credentials or changing passwords implicitly. |
| AUTH-015-03 | Non-critical integration risk | Signup email redirects that carry a destination require that URL to be permitted by the non-production Supabase Auth redirect allowlist; verify during browser acceptance without changing remote Auth configuration in this task. |

# Consolidation 2026-10-22 (KCNY-MAIN-20261022-016)

One consolidated retrospective found no confirmed critical source regression. Automated and HTTP acceptance are separated in `main-consolidation-016.md`; neither substitutes for authenticated browser acceptance.

| ID | Class / status | Finding and next action |
|---|---|---|
| CONSOL-016-01 | Environment / browser acceptance blocked | No project Playwright/E2E framework is installed and the previously attempted local Edge/CDP path was policy-blocked. Obtain a permitted browser runtime; do not bypass tool policy or mark UI tests passed. |
| CONSOL-016-02 | Environment / data acceptance blocked | No local Supabase environment variables or `.env` were available. Local 200 responses establish route rendering only, not database-backed content correctness. Use a separately approved non-production configuration. |
| CONSOL-016-03 | Product / test account blocker | Two historical test-account passwords are unknown. Obtain approved non-production user authentication without guessing, password extraction, privileged impersonation or unapproved reset. |
| CONSOL-016-04 | Non-critical tooling | Both npm and pnpm lockfiles exist, while README and current test command use npm. Avoid dependency changes until the team chooses one canonical lockfile under a separate review. |

# Non-production browser acceptance 2026-10-22 (KCNY-MAIN-20261022-017)

Local Chromium browser automation now works outside the repository. Thirteen public-route, interaction, language and responsive checks passed; no browser page error was observed. See `main-e2e-017.md`. This closes the browser-runtime portion of CONSOL-016-01 and AUTH-015-01, **not** authenticated acceptance.

| ID | Class / status | Finding and next action |
|---|---|---|
| E2E-017-01 | Environment / blocked | No verified non-production Supabase project or public client configuration was available. Home visibly showed the data-load error state. Verify the project is non-production before testing data-backed search, feed, post detail or mutations. |
| E2E-017-02 | Authentication / blocked | No approved two-account login method or existing authenticated session was available. Do not guess/reset passwords or use privileged impersonation; obtain a legitimate non-production test login route. |
| E2E-017-03 | Acceptance / pending | After the two gates above, test registration, session restoration, post/comment/reply, like, follow, notifications and profile settings in two isolated browser contexts. Public-page passes do not establish these outcomes. |
| E2E-017-04 | Confirmed environment isolation blocker | On 2026-10-22, the Vercel Preview URL and Production's public static scripts both identified Supabase project `czcyarmramlpmilfhpqo`. Preview mutations would reach the shared Production backend. Do not connect localhost to it for write acceptance. Request a separate test project as specified in `NON_PRODUCTION_ENVIRONMENT_REQUEST_017.md`. No application defect is inferred from this configuration. |

# Reporting persistence / human review 2026-10-23 (TASK 019)

One targeted retrospective completed. The isolated reporting module is runnable; Production reporting remains disabled. Original entries above are historical and are not rewritten as if earlier acceptance had happened. Full evidence and failed-run/retest separation: `reports-complaints-019.md`.

| ID | Class / status | Finding and follow-up |
|---|---|---|
| REPORT-019-01 | Critical development blocker — FIXED | Business version conflicts used SQLSTATE 40001, triggering PostgREST retries/timeouts. Follow-up migration uses PT409; stale version and one-winner concurrency real retests pass. Initial failure records retained. |
| REPORT-019-02 | Input-loss defect — FIXED | Audit rejection rolled back correctly but reset uncontrolled review inputs. All review inputs are now controlled; identical fault retest preserves edits and database state. Temporary fault trigger removed. |
| REPORT-019-03 | Product / Production approval gate | Reporting persistence/reviewer permissions are implemented and validated only in `kcny-e2e-017`. Production remains disabled pending `REPORTING_PRODUCTION_CHANGE_REQUEST_019.md`. This does not enable the old REPORT-014 infrastructure gate in Production. |
| REPORT-019-04 | Non-critical operations decision | Approve retention/appeals/reviewer management before production enablement. Cases/audits intentionally survive target deletion; no auto-purge, bans or content deletion. |
| REPORT-019-05 | Non-critical future scaling | Current 20-row indexed pages and 10/hour actor limit cover bounded access, not full anti-abuse or large-scale performance acceptance. Revisit only when product volume requires it. |
| REPORT-019-06 | Future visibility contract | Target checks match today's public-read post/comment/profile contracts. New hidden/private content requires a specific access-validation review before reporting those targets. |
| REPORT-019-07 | Reviewed security exceptions | Four private deny-all RLS tables and four narrow authenticated definer RPCs produce expected advisor notices. Effective grants, fixed search_path and real denial tests verified; see `reporting-security-019.md`. Inherited unrelated warnings remain documented, not silently changed. |

The existing media/Storage and notification-type preference gates remain separate. AI assistance is not connected; human review does not imply automated punishment. The 28 historical ERR_ABORTED remain UNKNOWN.

# Controlled reporting release 2026-10-24 (TASK 020)

| ID | Status | Finding |
|---|---|---|
| REPORT-020-01 | Activation gate | No trustworthy binding of the owner's real Production Auth UUID. Do not infer it from dashboard login, similar email/name or account order. Membership remains empty and dual switches off. |
| REPORT-020-02 | Maintenance acceptance blocked | Manual 90-day sensitive-content clearing draft exists, but management calls returned requestState errors, not actual execution results. Synthetic fixture/guard remained unchanged; no passing result invented. Complete genuine acceptance before enabling. See reporting-retention-020.md. |
| REPORT-020-03 | Security patch completed | Owner approved minimal Next 15.5.28 patch after advisory discovery; both lockfiles synchronized, audit zero, unit/build and changed-path browser controls passed. No unrelated upgrade. |
| REPORT-020-04 | Non-critical | Backup/log/export lifetimes and disposal need an operational decision before real retention clearing; logical row redaction is not immediate physical erasure. No automated purge or real record deletion enabled. |

TASK 019 isolated acceptance remains accepted; these are Production activation/operations gates, not a reason to restart form development. Next feature area remains image upload, separately scoped.

# Single-image posts 2026-10-25 (TASK 021)

One module retrospective, no unrelated audit. Implemented and accepted only in the isolated test project; Production media remains disabled and reporting unchanged.

| ID | Class / status | Finding |
|---|---|---|
| MEDIA-021-01 | Core development blocker — FIXED | ImageMagick listLength=1 also rejected internal working images. Bounded value 8 plus independent animation/pixel/memory checks; actual format tests pass. |
| MEDIA-021-02 | Core development blocker — FIXED | PL/pgSQL read aliases collided with local records (42702). Separate immutable follow-up migration fixes aliases; real UI refresh/list/detail passes. |
| MEDIA-021-03 | Lifecycle safeguards delivered | Stable post identity and bounded expired/orphan sweep prevent path loss/starvation. CAS, actual delete race and protected-object cleanup tests pass. |
| MEDIA-021-04 | Non-critical acceptance | Actual iPad/Safari hardware PENDING. Chromium 390px/820px viewport operations pass; not represented as real device acceptance. |
| MEDIA-021-05 | Non-critical scale/operations | Cold WASM fetch/compile and larger-volume/egress performance not broadly benchmarked. Manual bounded cleanup exists, no automatic/global maintenance endpoint. Decide production budget/duty separately. |
| MEDIA-021-06 | Non-critical UX follow-up | Review native file-picker filename clearing/same-file reselection after a successful upload. Preview/state is cleared; reload is available. Do not confuse the native displayed filename with an unsaved attachment. |
| MEDIA-021-07 | Test harness — FIXED | Main run retained 22/24: exact error locator and explicit navigation timeout corrected; both scenarios passed targeted recheck. Original failures remain separate. |

No unresolved critical issue observed in the exercised module. See POST_IMAGES_IMPLEMENTATION_021.md, POST_IMAGES_CLEANUP_021.md and separate Production Change Request. Temporary Storage failure shim removed; original bundle restored, synthetic objects cleaned. No changes to reporting retention, AI or historical UNKNOWN events.

# Targeted media consistency 2026-10-25 (TASK 022)

| ID | Class / status | Finding |
|---|---|---|
| MEDIA-022-01 | Core consistency — FIXED | Acknowledged finish/remove could be reported failed when subsequent cleanup RPC failed. Commit result, cleanup warning and unknown reconciliation are now separate; six real fault combinations have passing evidence, retaining initial setup failure and recheck. |
| MEDIA-022-02 | Cleanup omission — FIXED | Controlled delayed PUT after a completed cleanup left an object. Follow-up migration discovers exact eligible Storage paths and reopens done jobs; current references/live leases remain protected. Time advancement is explicitly distinguished from real capability expiration. |
| MEDIA-022-03 | Error semantics — FIXED | Foreign outcome lookup was denied but mislabelled 503 unknown; it now returns 404, with genuine ordinary-user retest. |
| MEDIA-022-04 | Acceptance limits / deferred | Real iPad/Safari and naturally expired correctly signed JWT remain pending. Forged expired claims and Chromium viewport results are not substitutes. Existing native picker/volume benchmarks remain deferred, not reopened. |
| MEDIA-022-05 | Production authorization / operations gate | Production allowlist and declarative auth configuration are prepared, not deployed. Separate approval, cleanup operator/budget and real-device disposition remain; no cron/resource/key export or reporting enablement. |

One targeted retrospective only. See POST_IMAGES_TARGETED_ACCEPTANCE_022.md and
POST_IMAGES_RELEASE_CHECKLIST_022.md. No new feature scope or unrelated repairs.

# Scheduled media maintenance 2026-10-25 (TASK 024)

| ID | Class / status | Finding |
|---|---|---|
| MEDIA-024-01 | Handoff correction — FIXED | Chat diff expanded a hunk-header word by one ASCII `n`. Exact single-byte reconstruction matches the supplied pasted hash; fresh Git export still matches the original A871500 hash. No source altered for hash matching. |
| MEDIA-024-02 | Isolated operations implemented | Actual hourly pg_cron → pg_net → authenticated Edge → Storage cleanup executed with uploads off. Run/transport outcomes, durable cursors, global/job leases, backlog and failure history are separate. Test schedule is paused after acceptance, not installed in Production. |
| MEDIA-024-03 | Acceptance pending | TASK 023 natural expiry remains gated by real 2026-10-25 17:33:15 KST eligibility. Credentials/time were not altered; originals remain in private encrypted state until the genuine probe and fixture cleanup. |
| MEDIA-024-04 | Non-critical / deferred | iPad hardware acceptance and larger-volume runtime/egress assessment remain pending. No broad retest or infrastructure audit was added. |
| MEDIA-024-05 | Production release gate | Test-only maintenance allowlist, production installation/credentials/operations and current billing headroom require separate approval. No production scheduler, resource purchase, upload or reporting enablement. |

# TASK 025 closeout / TASK 026 production adaptation — 2026-10-25

Historical rows above retain their original observation dates; the updates below supersede pending status without rewriting evidence.

| ID | Class / status | Finding |
|---|---|---|
| MEDIA-025-01 | Acceptance CLOSED | Original credential had one real PUT, HTTP400; correlated Storage log explicitly reported exp-claim timestamp failure. Physical3 / already-absent3 / ack6, synthetic posts0, old encrypted capability state removed. Original proof and previous failures remain external; not rerun in026. |
| MEDIA-026-01 | Adaptation delivered / not production-deployed | Shared exact fail-closed environment policy, v2 project/environment/source-bound HMAC, private production installer and separate per-run physical/absent/ack counters. Five historical migrations untouched; new sixth migration applied only to test. |
| MEDIA-026-02 | Acceptance records retained | Full unit505/505, SQL worker-contract16/16; real batch15PASS/2FAIL retained. Configuration recheck and separate KR tablet1/1PASS, not rewritten as an all-green original batch. First KR control failure has insufficient detailed error to assert a product root cause. |
| MEDIA-026-03 | Non-critical / deferred | Real iPad/Safari still PENDING. Initial image query latency/cold WASM and larger-volume/egress behavior remain scale follow-up; native file-picker polish unchanged. |
| MEDIA-026-04 | Test fixture lifecycle / NOT DUE | One151-byte synthetic raw object intentionally remains until2026-10-25 22:16:13.951941KST safety gate, then recheck lease and use bounded maintenance. No due/failed/expired-lease tasks. Test writesOFF and both schedulespaused; no automatic follow-up promised. |
| MEDIA-026-05 | Release gate, not a code defect | Production authority still needed for six migrations, Storage/Edge/Vault/Cron/application and conditional activation. Vercel fresh deployment/usage query403 needs legitimate team access. Last accepted020 deployment must be reverified before release. Reporting remainsOFF/OFF; no TASK B or paid upgrade. |

One targeted retrospective complete. No confirmed unresolved security/data-loss/core-flow defect in exercised paths. See POST_IMAGES_ACCEPTANCE_026.md and POST_IMAGES_PRODUCTION_RELEASE_PLAN_026.md.

# Notification preferences — 2026-10-25 (TASK 028)

| ID | Class / status | Finding |
|---|---|---|
| NOTIFY-028-01 | Feature delivered / test accepted | Four persisted owner-scoped switches filter future notification INSERTs at DB level. Missing row defaults ON; existing notifications/read/pagination unchanged. Production migration/application release need separate approval. |
| NOTIFY-028-02 | Non-critical development-runtime issue | Follow OFF passes; subsequent ON fails in two development-browser batches with `frame.join is not a function` from internal RSC code. No subsequent follow request observed. Same-source optimized local batch passes 15/15 with zero pageerrors, including both follow states. Exact framework root cause remains unconfirmed; original failures retained, no speculative dependency changes. |
| NOTIFY-028-03 | Explicit failure boundary | Lookup failure skips only that notification and logs sanitized SQLSTATE; main mutation survives (four-path transactional fault probe passed). No outbox/replay is included. Diagnostic ingestion through the unified logs query interface was not independently confirmed. |
| NOTIFY-028-04 | Non-critical acceptance | Real iPad/Safari PENDING. Actual Chromium 390/820/1280px settings, CN/KR switching, reload and relogin pass; viewport simulation is not device acceptance. |
| NOTIFY-028-05 | Test/ledger record | Initial SQL unit assertion matched a comment, corrected to inspect executable SQL. Live test migration payload is recorded as 20261025141820 while source filename remains 20261025141205; no historical repair/rename performed. |
| MEDIA-028-01 | Prior fixture CLOSED | Exact MEDIA-026-04 fixture passed its safety gate and lease/reference checks; existing v2 Storage maintenance physically deleted1, already-absent0, ack1, failure0. Due tasks/expired leases0, other images preserved, writesOFF and schedulespaused. |

One affected-boundary retrospective only. No confirmed new critical authorization/privacy/data-loss defect; no production, media-source, reporting activation, AI or shared coordination changes. See NOTIFICATION_PREFERENCES_IMPLEMENTATION_028.md and NOTIFICATION_PREFERENCES_PRODUCTION_CHANGE_REQUEST_028.md.

# Reporting operations — 2026-10-26 (TASK030)

| ID | Class / status | Finding |
|---|---|---|
| OPS-030-01 | New-flow regression — FIXED | Real retention save succeeded but version-key revalidation remounted the form and erased acknowledgement. Stable entity keys and original-version snapshots preserve truthful confirmation/drafts and optimistic conflicts. Original browser 5/6 plus separate targeted1/1 retained. |
| OPS-030-02 | Environment limitation — resolved | First restricted local server could not reach test Auth; ordinary SDK worked. Same localhost source under authorized normal-network identity passed actual login. No Auth policy or credentials changed. |
| OPS-030-03 | Production gate | Real owner reviewer binding, candidate policy/hold/appeal approval, secure access/correction fulfillment process, user notice and release approval absent. Production remains OFF/OFF; not a fake-enabled completed service. |
| OPS-030-04 | Non-critical / deferred | Operations due/request overview is intentionally bounded to20; own requests have keyset paging. Older reviewer request-history expansion and real iPad acceptance are future work; no automated retention job installed. |

One scoped retrospective completed. No confirmed remaining critical issue in exercised030 paths. Scoped sensitive redaction changes the immutable-audit contract and needs explicit future production approval; the historical020 trigger-disable template must not be executed.

# Human review workspace — 2026-10-26 (TASK031)

| ID | Class / status | Finding |
|---|---|---|
| REVIEW-031-01 | Concurrent editing safety — delivered | Draft expected-version snapshots prevent silent overwrites. Explicit refresh adopts current status/version without losing private/public text; actual409→refresh→v3 save passed. |
| REVIEW-031-02 | Test harness — corrected | Initial browser6/8 retained; generic alert locator included route announcer and two expected strings did not match existing honest UI text. Scoped actual-message assertions passed separate2/2. No business assertion weakened or failed history replaced. |
| REVIEW-031-03 | Non-critical / deferred | A manually supplied pre-2000 snapshot parses locally but the DB rejects it, showing unavailable rather than zero. Align validation in later consolidated polish; no authorization bypass. |
| REVIEW-031-04 | Non-critical / deferred | FrozenasOf is not MVCC historical state: legitimate status changes can remove cases from a filter while paging. Real iPad remains PENDING; count-query scale assessment awaits operational volume. |

One scoped retrospective completed. No confirmed unresolved authorization/privacy/core-flow defect in exercised031 paths; no production or AI integration enabled.

# AI contract preparation — 2026-10-26 (TASK032)

| ID | Class / status | Finding |
|---|---|---|
| AI-032-01 | Development compilation — FIXED | Initial TypeScript union narrowing could not safely access output on an error response. Explicit error discriminant fixed it; targeted and final TypeScript checks PASS. No runtime/provider failure asserted. |
| AI-032-02 | Contract hardening — delivered | Strict keys, bounded dense search arrays, duplicate/rank/UUID/language checks, fail-closed hostile unknown objects and fresh trusted visibility callbacks;40 synthetic tests pass. |
| AI-032-03 | Deliberate integration gate | Four domains are NOT_CONNECTED; actual session/database adapters, TASKB service compatibility, consent/privacy/retention and cost authorization require later integration approval. Mock validation is not live model or production permission evidence. |

One scoped retrospective completed. No external AI, training, TASKB or production changes. Field minimization does not promise arbitrary complaint prose is PII-free.

# Release readiness and reviewer binding — 2026-10-26 (TASK033)

One read-only affected-boundary/React retrospective; no unrelated repair loop. Binding confirms the actual authenticated account only, not reviewer membership or owner approval. Production reporting remains OFF/OFF and operations/binding opt-ins remain default OFF.

| ID | Class / status | Finding |
|---|---|---|
| READY-033-01 | Non-critical acceptance / PENDING | Actual iPad/Safari hardware acceptance is still PENDING. Desktop Chromium and mobile/tablet viewport results must be reported as browser/viewport evidence, never as real iPad acceptance. |
| READY-033-02 | Non-critical source edge case / deferred | The binding page/action currently classify every Auth error with a positive status below500 as login-required. A provider429 would therefore suggest login rather than temporary retry. No actual429 was observed in this review; refine the bounded error classification during later consolidated polish, not by changing Auth policies. |
| READY-033-03 | Non-critical account-context edge case / unverified | The page displays its server-rendered UUID while the action always signs the freshly verified session UUID. An account change in another tab before confirmation could make those differ. No role is granted and independent owner binding remains mandatory. Reproduce narrowly before a future context-change UX improvement; do not treat a client-supplied UUID as identity authority. |
| READY-033-04 | Test harness history / closed by separate rechecks | Original TASK033 browser run retained7PASS/3FAIL: terminal form selector, guessed `/following` URL instead of actual `/?feed=following`, and desktop focus race. First targeted5PASS/1FAIL retained (remaining exact-text locator omitted the public-response label); final public-result3/3PASS. Revocation, real self-confirmation without grant, independent test-only restoration and replay rejection passed separately. No source fix or rewritten all-green original run. |
| READY-033-05 | Production approval gate — NOT an ordinary bug | A signed self-confirmation receipt is not a role grant or verified ownership approval. Real production owner UUID binding, approved policy/hold rules, responsible management operator, secure access/correction fulfillment and separate migration/application/enablement authorization remain explicit gates. A completed policy draft does not satisfy those decisions; no fake fulfillment, guessed account grant or automatic clearing. |

Source review found no confirmed new critical authorization, privacy, data-loss or core-flow defect in the binding boundary. Fresh confirmed non-anonymous identity, default-off exact environment gating, controlled consent, duplicate guard, timer cleanup, escaped output, readonly receipt and no client secret/browser persistence were checked. Final browser batch status belongs to its actual evidence, not this source review. No DB write, grant, production enablement or AI call was performed by this retrospective.

# Community batch036–038 — 2026-10-29

One targeted retrospective only; historical reports/failures remain unchanged.

| ID | Class / status | Finding |
|---|---|---|
| COMMUNITY-036-01 | Core correctness — FIXED | Old relationship query returned1000 of1005 follows. Authenticated invoker keyset RPC returns all61 matching synthetic posts in4 pages, no duplicate and no caller-selected follower. |
| COMMUNITY-037-01 | Retry integrity — delivered | Atomic user/request journal, original payload hash, confirmed lookup and deletion tombstones prevent duplicate comment/notification or accidental resurrection. No weakened comments RLS. |
| COMMUNITY-037-02 | Non-critical UX / deferred | Deleted/conflicting request preserves original text and avoids blind fresh-ID submission. An explicit new-draft workflow after terminal outcomes could be clearer. Naturally expired signed-session real test and following-database outage/recovery remain unexecuted acceptance cases, not PASS. |
| COMMUNITY-038-01 | Core runtime blocker — FIXED | Native Window timer functions used as clock-object methods threw Illegal invocation. Lexical wrappers fixed actual Chromium initialization; separate9/9 real browser run passes. Original failure retained. |
| COMMUNITY-038-02 | Bounded scale tradeoff / deferred | Polling is per visible authenticated tab, not one leader per browser.25s baseline,10s timeout,120s max backoff. No Realtime or guaranteed instant delivery; future high-volume load review needed. |
| COMMUNITY-038-03 | Non-critical / deferred | Real iPad/Safari PENDING; webpack cache serialization and existing Node module-type warnings do not fail final build/tests. New receipt metadata retention needs a future reviewed policy, not blind tombstone deletion. |
| COMMUNITY-TEST-01 | Evidence preserved | 037 original7/8, first locator recheck0/1, final1/1;038 failed bootstrap then9/9; first full suite683/684 obsolete assertion, final684/684. No failed history rewritten. |
