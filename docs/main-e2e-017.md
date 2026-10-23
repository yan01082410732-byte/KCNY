# KCNY-MAIN-20261022-017 — non-production browser acceptance

Date: 2026-10-22 (Asia/Seoul). Main-site checkpoint: `9d75804748137e78ee8b1c6eebe069b209708206` on `fix/stability-security-foundation`.

## Environment readiness

- The existing TASK 016 checkpoint and external bundle at `D:\KCNY-main-site-audit\KCNY-MAIN-20261022-016-backup\baseline.bundle` were present. Eleven historical untracked root reports were preserved.
- No `.env.local`, `.env.development.local`, Vercel project link, or relevant process environment variables were found. The local Supabase `project_id = "KCNY-project"` is not evidence of an approved remote non-production project. No production connection was used.
- Approved test-account credentials, authenticated browser state, and an approved magic-link flow were not available. The two historical account passwords remain unknown. No login attempt, password recovery, reset, or privileged impersonation occurred.
- Existing repository dependencies were left unchanged. A separate Playwright 1.64.1 installation and Chromium headless shell 156.0.8078.4 were placed under `D:\KCNY-main-site-audit\KCNY-MAIN-20261022-017-e2e`. This is standard local Playwright, not Edge/CDP. The native managed-browser inventory was empty; local Chromium nevertheless launched and rendered the localhost app.

## Real browser results

The development server started with `npm run dev -- -H 127.0.0.1 -p 3100` and served `http://127.0.0.1:3100`. The browser checks used real Chromium page navigation and clicks, not mocked page fixtures.

| Scope | Result | Evidence |
|---|---|---|
| Home CN; login CN/KR; signup CN; search interface | PASS | Each route returned HTTP 200 and expected visible heading or form control. |
| Search form navigation | PASS | Entering a synthetic Chinese query and clicking Search preserved the query in the URL. This does **not** verify database search results. |
| Category navigation | PASS | Clicking a visible category link set the category query parameter. Content filtering could not be verified without non-production data. |
| Language switch and reload | PASS | Clicking Korean switched visible text and URL; Korean remained after reload. |
| Home at 390×844 and 820×1180; login at 390×844; search at 390×844; signup at 820×1180 | PASS | Real browser rendering showed no document horizontal overflow. Screenshots were reviewed. |
| Browser page errors | PASS | Zero `pageerror` events during the public matrix. |
| Public post detail and data-backed search/feed | BLOCKED | No verified non-production Supabase endpoint or safe public post ID. Local home showed the expected data-load error state. |
| Registration submission, authenticated flows, two-account interactions, notifications, profile settings | BLOCKED | No verified non-production project or approved authenticated test sessions. |

The first run had a **harness-only** search failure: a selector matched two inputs. The selector was corrected and the full public matrix reran with 13 checks passing. A transient Next development badge appeared in an earlier screenshot; subsequent isolated search load had no browser console warning, console error, or page error, and the badge showed no error. No application defect is established from that badge.

Screenshots and structured results are outside the repository at `D:\KCNY-main-site-audit\KCNY-MAIN-20261022-017-e2e\artifacts\`. Files include `results.json`, `home-cn-desktop.png`, `login-cn.png`, `signup-cn.png`, `search-cn.png`, `home-kr.png`, `mobile_390.png`, `tablet_820.png`, `mobile_login_390.png`, `mobile_search_390.png`, and `tablet_signup_820.png`. No credentials, cookies, tokens, or session storage were recorded.

## Automated checks and retrospective

- Unit suite: 403 passed, 0 failed, 0 skipped. Node's existing module-format warning is non-fatal.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS (Next.js 15.5.27).
- `git diff --check`: PASS.
- No confirmed critical application bug found. Browser rendering is now available, but live data and authenticated acceptance remain blocked by environment/account readiness, not by a demonstrated application defect.
- Reporting persistence, trusted administrator authorization, media upload, and notification-type preferences remain separately blocked product capabilities; this task did not enable them.

## Next gate

Obtain the approved **non-production** Supabase project identity and public client configuration through a secure channel, plus a legitimate test-account authentication method. Confirm the target is not Production before running any data-backed or authenticated browser workflow. Do not place secrets in Git or the report. Then run public data, authenticated, and two-account scenarios with disposable non-production content. No database, migration, Production, or TASK B change is authorized by this report.

## Follow-up: verified shared backend, 2026-10-22 KST

The user completed Vercel sign-in and the provider's email verification personally in the visible Codex browser. No password, OTP, cookie, or session token was deliberately read or exported.

- The branch-specific Preview `NEXT_PUBLIC_SUPABASE_URL`, displayed by the official Vercel environment UI, is `https://czcyarmramlpmilfhpqo.supabase.co`.
- The public Production homepage `https://kcny.vercel.app` returned HTTP 200. Read-only inspection of nine same-origin `/_next/static/` script assets found the same Supabase public origin. API keys were not printed or recorded.
- Vercel deployment metadata identifies Production as `main` / `35a52311c11527968093d10da29c769a9f761509`; the existing stability Preview remains `7556f332fd192206ffe0f722a2a2ca9378b23970`. Neither is the local TASK 016 checkpoint `9d75804748137e78ee8b1c6eebe069b209708206`.
- The Supabase connector lists no development branches under this KCNY project. No approved independent non-production backend was discovered.

Conclusion: the existing Preview is **not database-isolated from Production**. Merely copying its public configuration into localhost would not make authenticated write tests non-production. No publishable key was obtained, no local backend connection was configured, and no test mutation was performed. The previous environment blocker is now confirmed shared-backend risk, rather than only missing local configuration.

See `NON_PRODUCTION_ENVIRONMENT_REQUEST_017.md` for the concrete isolated-environment proposal. Existing Production, shared database policies, unapplied reply-integrity migration, and AI-module boundaries remain unchanged.
