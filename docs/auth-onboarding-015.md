# Authentication and onboarding — delivery 015

Date: 2026-10-22 KST. Source-only development; no database, Production, or AI-module change.

| Area | Current delivery | Browser acceptance |
|---|---|---|
| Login and registration | Existing bilingual Supabase forms retained. Failed submissions, registration, resend and confirmation callback now preserve a validated internal return destination. Auth-page return loops are rejected. Immediate-session signup navigates to the destination; email-confirmation signup shows the existing check-email notice. | Pending |
| Session and logout | Existing SSR session and signout implementation reused; no new auth system or token handling. | Pending refresh, expiry and logout checks |
| Onboarding | Authenticated home now provides compact profile, search, publish and settings links in Chinese/Korean. | Pending mobile/tablet visual check |
| Test accounts | No approved secret-backed credentials, E2E auth fixture, magic-link workflow, or existing controlled browser session was found in this workspace. Passwords for the two prior accounts are unknown and were not accessed or changed. | Blocked pending approved non-production login method and user/admin action |
| Browser capability | Current native computer-use inventory returned `apps: []`, `browsers: []`; no user-visible controlled browser was available. | No real-browser test executed; no screenshots |

The section retrospective found one confirmed auth UX defect: return destinations were dropped on error, signup and email verification paths. That path is corrected and unit-tested. No browser-only behavior is reported as passed. Existing reporting persistence, trusted admin authorization, post-media Storage, and notification preference persistence remain separately blocked.

Next acceptance: provide a legitimate non-production session or approved secure test-account login method, then run account, community, discovery, notifications and settings flows in two isolated browser contexts. User should complete any required provider authentication or MFA; do not request credentials in chat or export session secrets.
