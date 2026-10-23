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
