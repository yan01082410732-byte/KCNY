# TASK 017 — isolated environment request

Prepared 2026-10-22 KST. Status: PROPOSED; not authorized or executed by this document.

## Decision update — 2026-10-23 KST

The owner separately approved `KCNY-MAIN-20261023-017-ENV`, conditional on no additional cost. Free organization and USD 0/month creation quote were verified. Independent project `kcny-e2e-017` (`kirvcbkbkvotnsqnbcyf`) was created; test-only schema and synthetic accounts/data are now available. Local configuration points only to it. Preview and Production connections were not changed. The owner also specifically approved temporarily disabling Confirm email for two synthetic registrations; it has been restored and independently checked. See `main-e2e-017-env.md` for actual results, retained failures, cost/usage limits and residual acceptance gates. The original proposal below is preserved as history; it does not negate that later scoped approval or authorize any shared-project change.

## Evidence and necessity

Preview and Production both reference Supabase project `czcyarmramlpmilfhpqo`. Existing Supabase project discovery found no approved independent test project or development branch. Desktop access and Vercel login now work, but neither changes the data-isolation boundary. Existing Preview also lacks the TASK 016 local checkpoint changes.

## Concrete requested scope

1. Use the existing KCNY organization `rjteufghiotdyjhdtfiy` to check the official price for a **separate** Supabase project named `kcny-e2e-017` in `ap-northeast-2`.
2. If any cost or recurring commitment is required, present the exact quoted cost for owner approval before creating the project. This request does not approve a charge.
3. After resource approval, create only the independent test project. Prepare its schema from reviewed local SQL matching the application's supported contract; do not copy Production rows, users, credentials, or authentication sessions.
4. Establish two owner-approved test users through legitimate Supabase Auth flows in the new project. No service-role impersonation, password extraction, or changes to existing accounts.
5. Configure the current local checkpoint with this new project's public client configuration in a Git-ignored local environment file. Do not modify Vercel Preview or Production settings.
6. Run the already authorized browser acceptance with synthetic, disposable test content in isolated browser contexts; restore reversible state and report any remaining disposable records.

## Explicit exclusions

No Production deployment or data writes; no changes to the original KCNY Supabase project, its RLS/Auth settings or migration ledger; no application of the pending reply-integrity migration to the shared database; no AI-module work; no commit or push. A standalone test project is preferred over branching the shared project for a clear ownership boundary.

## Recovery and completion

Keep the original worktree and checkpoint. If setup fails, disconnect only the newly added local test configuration and report the new project's state. Deleting the cloud project or cancelling a billable resource requires a separately confirmed operation. Success requires a verified distinct project ref, legitimate test sessions, and recorded real-browser results; configuration alone is not acceptance.

Owner decision needed: approve the isolated resource/setup scope above, with any cost confirmed separately before creation. The existing TASK 017 prohibition on creating shared infrastructure remains in force until this distinct scope is approved.
