# KCNY like interaction — delivery 012

Date: 2026-10-21 KST. Main-site source only; no database, Production, or AI-module modification.

| Area | Delivered state | Remaining gate |
|---|---|---|
| Like/unlike | Existing authenticated owner-scoped server actions and idempotent insert/delete retained; missing-post/query failures now return a safe action error | Real non-production browser acceptance |
| Counts | Server-side `post_likes(count)` aggregate on post queries; no longer count from a potentially truncated list of like rows | Confirm aggregate relationship on intended non-production Supabase project |
| Current-user state | One bounded viewer-scoped like lookup per post page; same mapping in all feed, search, profile, detail and bookmarks views | Real cross-view acceptance |
| Failure UX | Bilingual action feedback on return page; no optimistic false-success; detail button disabled if current-user state query fails | Browser acceptance |
| Notifications | Existing `post_like` trigger/unique index handles author notifications, self-exclusion and deduplication; existing list links to post; bell refreshes on route, focus and tab visibility | Two-account browser acceptance; idle-tab realtime not included |
| Accessibility/mobile | Pressed state, accessible label, pending/disabled state retained; existing mobile tap-target CSS retained | Real viewport acceptance |

Targeted retrospective: the former client-side like-count calculation could undercount when a post had more likes than a row-response limit. The source now requests an aggregate count and only the current user's relation rows. No critical security issue was confirmed; RLS/notification definitions were read but not changed. See `docs/bug-backlog.md` for residual acceptance items.
