# KCNY-MAIN-20261023-017-ENV — isolated environment and real acceptance

Recorded 2026-10-23 KST. Artifact directories use UTC timestamps (2026-10-22 UTC = 2026-10-23 KST). Coordination baseline remains 2026-10-16.009; this document does not change it.

## Scope and preservation

- Main-site worktree: `C:/Users/Administrator/.codex/visualizations/2026/07/28/019fa686-81ad-74d1-b323-3ed7ac667895/kcny-stability`.
- Branch `fix/stability-security-foundation`; HEAD unchanged at `9d75804748137e78ee8b1c6eebe069b209708206`.
- All 11 historical root reports and prior uncommitted documentation preserved. No application source, migrations, dependencies, TASK B files, shared coordination, Vercel settings or Production data changed. No commit/push/merge/deploy.
- This task DID create schema, Auth accounts and synthetic data in the explicitly approved independent test database. It must not be described as “no database writes.”

## Resource, cost and isolation

| Item | Verified result |
|---|---|
| Project | `kcny-e2e-017` |
| Independent project ref | `kirvcbkbkvotnsqnbcyf` |
| Organization | `rjteufghiotdyjhdtfiy` |
| Region / database | ap-northeast-2 / PostgreSQL 17 |
| Cost gate | Provider creation quote USD 0/month; organization `plan=free`, `tier=tier_free` confirmed again after execution |
| Added paid plan/add-on | None |
| Shared Production/Preview ref | `czcyarmramlpmilfhpqo` — not used by test clients, not modified |
| App configuration | Git-ignored local `.env.local` only; exact test URL guard in runners; no Vercel env changes |
| Browser/server | Windows, Chromium 156.0.8078.4, local optimized Next.js build on port 3100; not a Production deployment |
| Canonical browser URL | `http://localhost:3100` — do not mix with `127.0.0.1` within an authenticated session |

Free-plan information: https://supabase.com/docs/guides/platform/billing-faq and https://supabase.com/docs/guides/platform/cost-control . Free quotas can limit service; no paid upgrade or overage purchase was authorized. This report does not claim a full invoice/egress/MAU audit. Final database allocation measured 11,572,915 bytes (about 11 MiB); 2 synthetic accounts. Recheck plan/quotas before a future expanded workload.

## Schema and authentication

All 10 existing local migration files were applied only to the isolated project, including notification migration `202608110001` and reply-integrity migration `20261013173533`. Original SQL files were not edited. Seven public tables have RLS enabled; 20 policies and 9 public application triggers were checked. Source SHA256 manifest retained outside repo. Supabase recorded generated execution versions with original version/name in migration names; this was not a repair of the shared project's ledger.

After specific owner approval, Confirm email was temporarily disabled ONLY in this test project. Two synthetic users were registered through actual KCNY signup forms. Confirm email was immediately restored; final public Auth settings check returned `emailConfirmationRequired=true`. This does NOT validate email delivery/confirmation, MFA or password recovery.

Both accounts subsequently signed in with ordinary passwords in separate Chromium contexts. No service-role impersonation, production user copying, cookie export or browser-session transfer. Random synthetic credentials are encrypted outside the repository using Windows CurrentUser DPAPI plus encrypted fixture storage; no plaintext credentials in reports or source. The decrypt helper is called only by the runner with captured in-memory output; do not execute it interactively or print its output. It is tied to this Windows user, not a portable credential backup. Browser accounts were signed out and contexts closed at completion.

## Real acceptance evidence (do not conflate with unit tests)

Artifact root: `C:/Users/Administrator/.codex/visualizations/2026/07/28/019fa686-81ad-74d1-b323-3ed7ac667895/kcny-e2e-017-env`.

| Run | Actual result | Evidence relative to artifact root |
|---|---|---|
| Synthetic registration | 2 actual form registrations succeeded while authorized email confirmation exception was active | `authenticated/results.json` and test Auth user count |
| Public configured browser | 17 functional checks passed; separate pageerror control passed (0 errors) | `artifacts/2026-10-22T15-51-27-042Z/results.json` |
| First shell authenticated suite | 28/30 checks passed, 2 failed | `authenticated/2026-10-22T16-08-05-581Z/results.json` |
| Final complete shell batch | 28/30 checks passed, 2 failed, 0 blocked, 0 pageerrors | `authenticated/2026-10-22T16-16-00-028Z/results.json` |
| Final targeted recheck | 5/5 passed | `targeted-recheck/2026-10-22T16-18-15-136Z/results.json` |

The 30-check suite includes 26 browser workflow checks, 3 ordinary-user direct API permission/integrity checks and 1 runtime pageerror control. Repeated runs are not additional unique product coverage. No claim that the complete suite ran 30/30 green. The final runner additionally waits for edit-route arrival; that correction was exercised by the targeted recheck, not another complete run.

Verified actual flows: separate password logins, correct account identity after refresh, profile save/refresh, post draft reload/publish, post edit/save, B comment/like/follow, Following Feed and like-state consistency, A comment/like/follow notifications, A reply and B reply notification/deep link, single/all read and badge count, post/user search, category/language filter, profile navigation, CN/KR persistence, owner-only edit route, deliberately disabled report submission, authenticated 390px settings/post and 820px notifications, unlike and logout/protected-route denial.

API checks used ordinary authenticated users: B could not update A's post (0 affected rows plus unchanged title); B could not read A's notifications; nonexistent reply parent was rejected with SQLSTATE 23514. These checks do not establish exhaustive RLS coverage or UPDATE-trigger execution; the separate production migration approval gate remains unchanged.

## Failures and one targeted retrospective

1. **Local hostname mismatch, reproduced and understood:** language-cookie redirect from `127.0.0.1:3100/settings/profile` returned `http://localhost:3100/settings/profile?lang=KR`. Host-scoped auth cookies do not transfer across those names. Explicit-language refresh worked; no-language navigation reached login. Canonical localhost testing passed switching, refresh and no-language navigation without any source change. This is a local acceptance configuration caveat, not proof of production session failure.
2. **Post-edit automation ordering:** full-run code filled `[name=content]` immediately after clicking the edit link, without waiting for the new route. The detail page also has a content field. Waiting for `/edit`, the edit heading and persisted synthetic draft yields a successful actual save. Preserve original failure evidence; corrected runner now waits. No application defect confirmed from that failure.
3. **Intermittent reply-notification display:** the final complete batch did not find B's newly created reply notification within its wait. The database confirmed the correct recipient and comment; a fresh legitimate B login displayed it and its deep link correctly (screenshot retained). Initial visibility timing/cache cause remains unconfirmed. Record a non-critical stability investigation; do not erase or label the initial failure PASS.
4. **Restricted execution environment:** earlier Node-REPL Chromium reported `net::ERR_NETWORK_ACCESS_DENIED` for browser Supabase calls; server operations still succeeded. Standard terminal Playwright with approved network permissions succeeded. Earlier dev-mode `Event` pageerrors were not reproduced in optimized-build acceptance; no speculative source fix applied.
5. Existing database advisor warnings (`set_updated_at` search_path and trigger-function execute privileges) recorded as advisory hardening follow-up, not proof of a callable privilege-escalation exploit. No shared schema change performed.

No confirmed critical application defect identified. Historical 28 ERR_ABORTED remain UNKNOWN under the accepted observability limitation; these browser results do not retroactively classify them.

## Automated validation

- Full unit suite: 403/403 passed, 0 failed/skipped, final duration 950.6877 ms.
- TypeScript: `npx tsc --noEmit` passed.
- Next.js optimized build: passed using isolated project configuration; this build was actually served for browser acceptance.
- `git diff --check`: passed (existing CRLF conversion warning only).
- No application source changes required in this task.

## Retention and remaining gates

Retained synthetic dataset: 2 users, 3 posts, 6 comments/replies, 1 like, 1 follow, 8 notifications. Earlier synthetic interaction records remain intentionally in the independent project, per the retention instruction. No real user data. Two complete-run new-post likes were undone; one earlier synthetic like/follow remains. Environment is not automatically deleted or upgraded.

Screenshots include `targeted-recheck/2026-10-22T16-18-15-136Z/B-reply-notification.png` and `authenticated-mobile-settings.png`. Raw safe event/result files and all failed runs remain available; no credentials, cookies, private headers or request bodies intentionally recorded.

Still unaccepted: real email verification/delivery, naturally expired-session recovery, large multi-page datasets, comprehensive failure/duplicate-submit recovery, notification immediate-visibility reliability, exhaustive authorization tests, actual iPad hardware (viewport emulation only). Report persistence, trusted administrator review, media Storage contract and notification-type preference persistence remain blocked product contracts, not completed features.

Next action: keep this test environment and use canonical localhost for future acceptance. Do a bounded notification freshness investigation and separately plan email-flow verification. Prioritize the next approved product contract without treating ordinary deferred issues as a reason for another broad audit. No production migration/release authority is implied.
