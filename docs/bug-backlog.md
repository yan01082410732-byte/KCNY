# KCNY bug and acceptance backlog

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
