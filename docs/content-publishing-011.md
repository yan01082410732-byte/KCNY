# KCNY content publishing — delivery 011

Date: 2026-10-21 KST. Main-site source changes only; no DB, Storage, Production, or AI-module changes.

| Area | Delivered | Evidence / remaining gate |
|---|---|---|
| Create | Existing validated title/body/category/language form retained; bilingual failure feedback; pending submit; redirect to new post with success notice | Automated tests; authenticated browser acceptance pending |
| Edit | Existing server ownership check retained; controlled prefilled fields, recoverable drafts, zero-row result detection, success notice | Automated tests; authenticated browser acceptance pending |
| Delete | Existing owner-scoped action retained; zero-row result detection, explicit cascade warning, disabled pending button, profile success notice | Automated tests; authenticated browser acceptance pending |
| Drafts | Session-storage draft per user and create/edit identity, shape validation, mounted-state fallback, clear only on confirmed successful post route | Automated source/logic tests; browser storage acceptance pending |
| Media | No existing post-media column, Storage bucket or approved policy. UI truthfully remains text-only; upload not introduced | Separate shared-infrastructure decision required |
| User post management | Existing profile posts and pagination retained; post detail owner edit/delete controls and return-to-profile flow improved | Automated tests; browser acceptance pending |

Targeted retrospective: server actions previously treated zero affected rows as success; this was a critical correctness issue and is now guarded by selecting the affected ID. Existing post foreign keys cascade comments, likes, bookmarks and notifications, so delete confirmation now states that related interactions are removed. No source path was added for unapproved media upload. Remaining non-critical and acceptance items are in `docs/bug-backlog.md`.
