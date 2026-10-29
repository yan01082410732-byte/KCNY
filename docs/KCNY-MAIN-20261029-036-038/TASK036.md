# TASK 036 — authenticated bounded following feed

Baseline: `2a1217f4b4714a665e516a3f31f8489d2809011a`, verified against live Production deployment `dpl_8w3YX5j44qQe9yvP6587CMcyDGCd` by existing authenticated CLI read on 2026-10-29 KST. Separate development worktree; historical release and AI workspaces unchanged.

The `following_feed_page` invoker RPC derives identity from `auth.uid()`, validates category/paired cursor/limit, applies membership and filters before descending `(created_at,id)` limit (maximum 51). UI requests 21 for 20 visible posts. Embedded author and counts, viewer likes/bookmarks and all-feed behavior remain. One author/keyset index added; existing RLS unchanged. Existing follow relationships are publicly readable: this change does not invent a private-social-graph contract. A user cannot choose another viewer for the personalized RPC.

Only `kirvcbkbkvotnsqnbcyf` received migration `20261029122609_following_feed_bounded_036.sql`. Production received none.

Real API + Chromium acceptance: **7/7 PASS**, external immutable run `2026-10-29T12-53-18-744Z-036-following`. A had 1,005 synthetic follows; old API returned only 1,000 IDs. New RPC returned all 61 matching synthetic posts in four page calls, 21-row lookahead, no duplicates, including author 1,005. Observed initial page timings 141/67/85/56 ms (single run, not a load benchmark). Category, B's own feed, one/multiple new follows and restored temporary relationships, anonymous/invalid/spoofed calls all passed. Existing B relationship was not deleted. Zero-follow case separately verified under authenticated database role with synthetic claims inside ROLLBACK; it is **not** an actual third-user login test.

Real browser checks: CN390, KR820, CN1280; twenty cards, category-preserving next page and no horizontal overflow. Screenshots kept outside Git. Focused tests 21/21; TypeScript and diff check passed before subsequent phase integration. Synthetic data only. No real iPad acceptance claimed.

Release requires separate authorization to apply this migration before deploying the app. Application rollback leaves the additive read RPC/index harmless; do not drop user data. No push or deployment authorized.
