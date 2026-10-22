# Community interaction delivery 007

Task: KCNY-MAIN-20261020-007. Date: 2026-10-20 KST. Coordination baseline read: `2026-10-16.009`. Branch: `fix/stability-security-foundation`; unchanged HEAD `7556f332fd192206ffe0f722a2a2ca9378b23970`. Changes are local and uncommitted. Eleven pre-existing untracked audit reports are preserved.

## Targeted reconnaissance

`feature/comment-replies` (7593c66), `feature/notifications` (605e6ce) and `feature/following-feed` (35a5231) are ancestors of the current HEAD. Their implemented features are reused. No branch integration was necessary. Existing database interfaces already provide notification type, recipient, actor, post, comment, timestamp and read state; no schema change is needed for this delivery.

## Feature matrix

| Area | Existing implementation retained | Delivered in this round | Verification / remaining acceptance |
|---|---|---|---|
| A. Comment replies | Single reply level, authenticated author, same-post/top-level parent validation, grouped replies and pending submit | Bilingual safe error feedback from action error codes; comment anchors; post-scoped target lookup loads an older notified reply with its parent context | Existing reply tests plus target/error tests pass; real signed-in browser acceptance pending |
| B. Notification centre | Four notification types, actor, timestamp, empty state | Loading UI; service-error/retry state instead of false empty; explicit read/unread label; 50-row stable cursor pages; comment-specific links including older replies; language preserved in URL | Page data-flow mocks exercise row mapping, recipient filter and service errors |
| C. Unread count | Bell and 99+ cap | Refresh after successful read, pathname change and window focus; newest response wins; unmount ignores late responses; safe unavailable label | Async out-of-order/error/dispose tests pass; realtime push is outside this delivery |
| D. Read management | Single/all actions and existing recipient RLS | Pending/disabled form state, safe failure state, confirmed affected-row count; recipient ID always from session; successful action refreshes UI/badge | Actual action bodies tested with mocked database/framework dependencies, including forged recipient, 0 rows, thrown/returned errors, anonymous user and invalid ID |
| E. Following Feed | Session-derived followed users, category/language filters, sign-in and empty states | 20-row `(created_at,id)` descending keyset pages; next/latest links; language preserves cursor, feed/category changes reset it; self IDs excluded | Existing feed tests and 137-row pagination cases pass |

Post/comment/user IDs and relationships remain unchanged. Comment target lookup is constrained by both post ID and comment ID. Notification queries and mutations explicitly filter the authenticated recipient in addition to existing RLS. Server Actions continue to be the write boundary; no AI or server-to-server API contract is introduced. Single-notification read is idempotent at the business level (a repeated valid request remains read); mark-all only targets currently unread rows. A zero-row single update never reports success.

## Validation

- `node --experimental-strip-types --test tests/*.test.mjs`: **351/351 PASS** (17 new cases; one old source-shape assertion updated for the expanded homepage query type).
- `node_modules/.bin/tsc.cmd --noEmit`: **PASS**.
- `npm run build`: **PASS**, Next.js 15.5.27 production build; no deployment.
- `git diff --check`: **PASS**. Git reports an existing LF/CRLF normalization warning for `lib/comment-pagination.ts`, not a whitespace error.
- CN/KR error, target and pagination behavior tested. React checklist review covered effect cleanup, newest-response handling, typed action state, pending controls, recipient authorization and accessible error/status labels.
- Mobile static review: pagination wraps, notification cards stack below 480px, text wraps; no overflow-hiding workaround. Fresh official browser inventory was `apps: []`, `browsers: []`; actual viewport, layout and authenticated end-to-end acceptance were **NOT RUN** this round. This is a follow-up acceptance task, not a code-delivery blocker.

## Progress and next priorities

**90% of the delivery-and-acceptance checklist: 18/20.** Completed checkpoints: retained reply display; authenticated reply validation; reply pending state; safe reply errors; notification types; related targets; read/unread state; loading/empty/error state; notification pagination; unread badge; read-triggered refresh; stale-response protection; single read; mark-all read; session recipient isolation; following filtering/empty/self exclusion; feed pagination; automated/type/build validation. Pending checkpoints: real authenticated read-to-badge/target navigation acceptance; actual mobile viewport acceptance. This percentage measures this work order only, not total KCNY product completion or release readiness.

Next: run a short local/approved Preview acceptance pass when browser control is available, covering read-one/read-all badge refresh, deep comment link, both pagination paths, CN/KR and 280/390px layouts. No commit, push, remote migration, database operation, deployment, coordination-file change or AI project access occurred. Reply migration remains unapplied and separately gated. Historical ERR_ABORTED observations remain unchanged in the existing records.
