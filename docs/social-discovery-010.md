# KCNY social discovery — delivery 010

Date: 2026-10-21 KST. Main-site worktree only; no database or production change.

| Area | Delivered state | Evidence / remaining gate |
|---|---|---|
| Followers and following lists | 20-item server-side pages plus one lookahead row; descending `created_at` and relationship-ID tie-breaker; strict cursor parsing; first/more/retry links | Synthetic multi-page and source-boundary tests; live browser acceptance pending |
| Relationship navigation | Profile count links and list-card profile links retained; post-card author link added | Source tests; live browser acceptance pending |
| Category browsing | Existing validated categories are now URL links with active state; all removes the category while retaining language/feed; category card links added | Source tests; live browser acceptance pending |
| Community discovery | Existing feed keyset pagination retained; category-specific empty state and retry link added | Existing and new tests; live browser acceptance pending |
| Localisation/responsiveness | New text in Simplified Chinese and Korean; scrollable category links on narrow layouts | Static CSS review; real viewport acceptance pending |

Retrospective: no confirmed critical issue in the affected code. The relationship list no longer performs unbounded reads. The pre-existing Following Feed ID scale limit and live-browser acceptance remain in the bug backlog. No shared schema/RLS/Auth change was needed. No independent AI-module code was accessed or changed.
