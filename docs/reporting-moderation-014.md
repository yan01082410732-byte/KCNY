# KCNY reporting and moderation — delivery 014

Date: 2026-10-21 KST. Main-site source only. No database or TASK B change.

| Area | Delivered in source | Current limit |
|---|---|---|
| User reporting | Post, comment, reply and profile links; authenticated bilingual form; bounded reason/text validation and duplicate-submit guard | Submission disabled because there is no approved persistence contract |
| General complaint | User-menu entry and standalone bilingual form with category, description and optional related target | Submission disabled; no success claim or data storage |
| Status | Authenticated status route states records are unavailable | No reporter-scoped backend query can be implemented yet |
| Administrative review | No admin route or client-side privilege guess added | Trusted role, policy and audit contract absent |
| TASK B boundary | Separate typed AI suggestion and human decision structures | No AI call, output or automated enforcement |
| Privacy | No complaint text stored locally; no unapproved remote write; no other-user report query | Future evidence retention policy requires approval |
| Language/responsive | CN/KR labels, notices, accessible fields, compact form CSS and tap-sized links | Real browser acceptance pending |

Targeted retrospective: the critical risk was falsely claiming a report persisted or exposing report data before authorization exists. The UI now states that submission is unavailable and disables the submit button; the action also denies direct invocation. No confirmed main-site security defect remains in this new boundary. See `REPORTING_CHANGE_REQUEST_014.md` and `bug-backlog.md` for gates.
