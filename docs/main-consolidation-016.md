# TASK 007–015 consolidated local acceptance

Date: 2026-10-22 KST. Branch `fix/stability-security-foundation`; original HEAD `7556f332fd192206ffe0f722a2a2ca9378b23970`. This report describes a local, uncommitted development state, not a Preview or Production release.

## Recovery and environment

Before testing or staging, 101 modified/untracked files were copied to `D:\KCNY-main-site-audit\KCNY-MAIN-20261022-016-backup\worktree-changes`, individually SHA-256 verified (0 mismatches). `baseline.bundle` passed `git bundle verify` and preserves the original HEAD history. No `.env`, credential file, `node_modules` or `.next` cache was included. The separate TASK B AI workspace was not accessed or modified.

Node `v24.18.0`, npm `11.16.0`, Next.js `15.5.27`; `npm ls --depth=0` passed. README prescribes npm; `package-lock.json` and `pnpm-lock.yaml` both exist. No dependency installation or lockfile change was needed. No local `.env` or matching Supabase/Preview environment-variable names were found. The required application names are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` (the last has a localhost fallback). This limits local data-backed acceptance.

## Nine-round implementation matrix

| Task | Source / route evidence | Automated and local reachability | Outstanding acceptance or blocker |
|---|---|---|---|
| 007 Community | `app/notifications`, `components/NotificationsPageClient.tsx`, `components/CommentDraftForm.tsx`, following feed and comment actions | Build imports resolve; `/notifications` responds; community tests included in 403 passing tests | Authenticated notification/comment/reply flow requires approved non-production account and configured backend |
| 008 Search | `app/search/page.tsx`, `components/SearchPageClient.tsx`, `lib/search.ts` | CN/KR search routes both 200; tests/build pass | Data results, filters and pagination still require browser + backend acceptance |
| 009 Profile/comments | `app/u/[username]`, `components/ProfilePageClient.tsx`, comment composer | Example profile route 200; tests/build pass | Real profile and submission flow not exercised locally |
| 010 Social/category | `app/u/[username]/following`, `followers`, `lib/community-pagination.ts`, home category links | Routes present in production build; category home query 200; tests pass | Two-account relationship cycle and browser pagination pending |
| 011 Publishing | `app/posts/new`, edit/detail routes, composer/editor and draft hook | `/posts/new` returns 307 to login when signed out; tests/build pass | Authenticated create/edit/delete and media upload not accepted; Storage contract blocked |
| 012 Likes | `components/LikeButton.tsx`, `app/posts/like-actions.ts`, notification migration definitions | Tests/build pass; no runtime mutation performed | Cross-view counts and like notification need two approved accounts; no production writes |
| 013 Settings | `app/settings/profile`, `components/ProfileSettingsClient.tsx`, language preference proxy | Signed-out settings route returns 307 to login; tests/build pass | Browser persistence and profile-save acceptance pending; notification-type preference contract absent |
| 014 Reports | `app/reports`, `components/ReportForm.tsx`, `lib/reporting.ts` | Signed-out report listing and valid complaint route return 307; malformed report URL returns 404 | Persistence and trusted admin authority absent; submit stays disabled, no fictional success |
| 015 Auth/onboarding | `app/auth`, `lib/auth.ts`, `components/HomePageClient.tsx` | CN login and KR signup routes 200; return-path unit tests/build pass | Real login, email callback, session refresh/logout and responsive acceptance pending |

No merge conflict markers were found under `app`, `components`, `lib`, `tests`, or `docs`. The production build resolves the connected routes/components, but its success is not evidence that data-backed functions work without Supabase configuration. No duplicate implementation or cross-round contradiction was confirmed in this targeted review.

## Actual verification

Full `npm test`: 403 executed, 403 passed, 0 failed, 0 skipped, about 0.84 seconds. `npx tsc --noEmit`: PASS. `npm run build`: PASS. `git diff --check`: PASS (only line-ending notices). No test expectations were changed.

Development server: `npm run dev -- -H 127.0.0.1 -p 3100` started and reported Ready. Actual HTTP checks at `http://127.0.0.1:3100`:

| URL / category | Actual result |
|---|---|
| `/`, `/search?lang=CN`, `/search?lang=KR`, `/auth/login?lang=CN`, `/auth/signup?lang=KR`, `/u/example?lang=CN` | 200 |
| `/_next/static/css/app/layout.css` | 200 |
| `/posts/new?lang=CN` | 307 to `/auth/login?lang=CN&returnTo=/posts/new` |
| `/settings/profile?lang=CN` | 307 to login with return target |
| `/reports?lang=CN` and `/reports/new?lang=CN&kind=complaint` | 307 to login |
| `/reports/new?lang=CN` without a valid report target | 404 by input validation |
| `/notifications?lang=CN` | 200 HTML containing framework redirect markers; no authenticated content accepted |

Server output showed route compilation and HTTP results without a fatal exception. The 200 on an unconfigured feed/search/profile is only transport-level reachability, not verified Supabase data loading. No client hydration or interaction checks were possible by HTTP alone.

## Browser and product blockers

Current project has no `playwright`, `playwright-core`, `@playwright/test` or `puppeteer` dependency or E2E configuration. System Edge and Chrome executables are present, but prior local Edge/CDP launch was blocked by execution-tool policy; this task did not bypass or retry that blocked path. No browser session, screenshot, real login or two-account test was produced. The two historical work/test passwords remain unknown; no guessing, reset, privileged impersonation or credential extraction was performed.

Separate product blockers remain: reporting/complaint persistence, trusted administrator authorization, post-media Storage contract and notification-type preference persistence. Historical 28 `ERR_ABORTED` events remain an accepted observability gap under coordination `.009`, not reclassified as passing. Reply-integrity migration and Ledger repair were not performed.

## One consolidated retrospective

No confirmed critical regression was found by automated tests, production build or local HTTP checks. The critical acceptance gap is environmental: no configured local Supabase test target, approved test-account authentication or permitted browser automation. This is not proof that the application has no browser/runtime defects. No source fix was justified by the observed HTTP results. Non-critical acceptance and product-contract items remain in `docs/bug-backlog.md`.

Recommended next step: obtain an authorized non-production Supabase configuration and test-account login method plus permitted browser runtime, then perform the public/authenticated/two-account acceptance matrix. Do not merge or deploy the checkpoint until that acceptance and separate migration/release gates are handled.
