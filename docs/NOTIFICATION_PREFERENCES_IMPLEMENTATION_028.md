# TASK 028 — notification preferences

Recorded 2026-10-25, Asia/Seoul. Base `43638fcaf459c2797b076d0bd4ecf3a5a44f41d5`, branch `codex/notification-preferences-028`. Separate worktree; released source and historical evidence preserved. No AI/TASK B, Production, push or deployment changes.

## Delivered

| Area | Implementation / acceptance |
|---|---|
| Settings | Four independent CN/KR checkboxes in the existing profile/settings page; actual saved feedback, loading/retry, draft retention on failure and synchronous duplicate-submit guard. |
| Persistence | Authenticated GET/PUT `/api/notification-preferences`; no caller-supplied identity. Private/no-store responses. Current session verified with `getUser`. Strict four-boolean DTO, origin check and 4 KiB request limit. |
| Database | Owner RLS and column grants; invoker save RPC; timestamp maintained by DB. Missing row means all ON, whereas failed reads are errors, not defaults. |
| Future notifications | A private BEFORE INSERT gate on `notifications` reads recipient preferences. Covers the existing comment/reply, like and follow generation functions, without rewriting them. Disabled types are not persisted. |
| Compatibility | Existing notification unique constraints, indexes, read RPCs, pagination and removal-on-unlike/unfollow behavior are unchanged. No email/SMS/push feature. |

### Failure boundary

Preference lookup failure suppresses only that new notification, emits the sanitized SQLSTATE-only tag `KCNY_NOTIFICATION_PREFERENCE_LOOKUP_FAILED`, and does not fail the original comment/reply/like/follow. There is **no replay/outbox** in this minimal change: a notification skipped during a lookup failure is not automatically regenerated. Main operations and their truthful success semantics are preserved. Database fault acceptance proved all four business paths proceed and notifications are absent; the logging statement is statically checked, but ingestion/search of that diagnostic was not confirmed through the unified-log query interface. No complaint text, account ID or SQLERRM is logged by this function.

## Actual acceptance, not a rewritten historical batch

Real local Chromium, isolated contexts, legitimate ordinary-user logins and only `kirvcbkbkvotnsqnbcyf`. Localhost `3128`. Browser executable: Chromium headless shell 1248 from the existing TASK 017 test framework. Passwords were unsealed only into process memory; no storage-state export, cookies, credentials, raw Auth responses or traces were saved. The application had media writes and reporting disabled.

External evidence is archived under `D:\KCNY-main-site-audit\KCNY-MAIN-20261025-028\evidence` and was first recorded in the separate `kcny-notification-preferences-028-evidence` directory.

| Original run (UTC filename) | Actual result |
|---|---|
| `2026-10-25T14-23-50-414Z` | Runner startup only; no acceptance claims. |
| `2026-10-25T14-24-05-696Z` | Stopped at the preexisting relationship guard before mutations; roles reversed to preserve the old relationship. |
| `2026-10-25T14-27-08-219Z` | 11 PASS / 1 FAIL. Comment, reply and like OFF/ON, follow OFF, real logins and defaults passed. Follow ON failed in development rendering. Cleanup passed. |
| `2026-10-25T14-32-09-032Z` | Focused development retry: 5 PASS / 1 FAIL. Browser error `frame.join is not a function`, `/u/kcny017_b`; second follow POST was not observed. Cleanup passed. |
| `2026-10-25T14-43-13-992Z` | Same source, optimized local build using the test project's configuration: 15 PASS / 0 FAIL, pageerrors 0. This is a separate focused batch, not a rewrite of either failed development run. |

The optimized batch verified follow OFF/ON with relation creation and notification counts 0/1; other-account defaults/incoming reply unaffected; actual direct API owner isolation; unauthenticated API/RPC denial; one-save duplicate guard; refresh/CN–KR switching/logout/login persistence; 390/820/1280px controls with no horizontal overflow; existing notifications still visible after all switches OFF; 50 + 7 notification pages without duplicate links; old notification mark-read; bell count exactly matched 56 persisted unread rows at that point. Three preexisting notifications retained their original read state. Screenshots are in that run directory. iPad/Safari hardware acceptance remains **PENDING**.

Two of those browser checks deliberately intercepted the preferences HTTP response/network to verify UI error handling. They are **simulated UI faults**, not evidence of a real database outage. Conversely, the cross-user denial checks used ordinary authenticated Supabase API calls, not a service key. Other-user SELECT/UPDATE affected zero rows, foreign INSERT and identity/timestamp UPDATE returned `42501`; unauthenticated local GET/PUT returned 401 and anonymous save RPC returned `42501`.

The actual database lookup failure was tested separately with `tests/sql/notification-preferences-028.sql`: management-only transactional fault injection, not a claim of ordinary-user privileges. Four notification paths verified, main rows succeeded, no failed-lookup notifications created, ROLLBACK completed and original preference relation restored. No time or credential modification.

All three synthetic posts from the mutated browser batches were removed by their author; associated comments/likes/notifications cascaded through existing contracts. B→A was absent again, the original A→B relationship and original notifications were preserved, both accounts signed out. Preferences were restored to all ON (the first run's absent preference rows now exist as all-ON rows; behavior restored, not a claim of bit-for-bit row absence).

## One targeted security retrospective

- Test project identity verified as `kcny-e2e-017`, PostgreSQL 17, exact ref above before writes. One new migration applied there only.
- RLS enabled, three owner policies. Anonymous SELECT/RPC denied. Authenticated DELETE, identity UPDATE and timestamp UPDATE denied; only four booleans writable. Private schema USAGE and trigger-function EXECUTE denied to clients.
- Save RPC is SECURITY INVOKER. Only the recipient-read trigger is SECURITY DEFINER, fixed empty search_path, fully qualified objects and no exposed execute permission.
- Existing triggers, uniqueness/read/pagination functions and all released media code unchanged.
- Security advisor contains no finding for the new preference objects. Inherited private deny-all RLS notices and existing `set_updated_at`, profile-creation function and Auth password-protection warnings were not silently modified. See Supabase's [function search-path guidance](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable) and [privileged function guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) for separate remediation review.
- No new confirmed security/privacy/data-loss defect. Development-only follow rendering remains a non-critical, reproducible environment issue: internal RSC `frame.join` failure, optimized-build counterpart passes. Exact root cause is **not confirmed**; no speculative dependency upgrade or follow-source rewrite.

## Previous media fixture closeout

Only upload `40d772f1-75e1-4fde-b7e0-7af9f8e618f2` was targeted. Safety time `2026-10-25T13:16:13.951941Z` had passed; no post/slot reference, upload lease, cleanup lease or global lease was live. Existing authenticated v2 maintenance entry used Storage API, run `ced2c681-82b0-426e-92db-4fc5b9fbdba6` completed `14:12:00.539388Z`.

Physical deletion **1**, already absent **0**, acknowledgement **1**, failed **0**. Target objects 0, due tasks 0, expired cleanup leases 0; no other objects deleted. Test media writes OFF, both media schedules paused. Reporting was not activated: local application OFF; the test database's preexisting reporting flag was found ON and left unchanged. Production reporting OFF/OFF remains the accepted baseline, **not freshly inspected or modified in this task**.

## Verification

- Full suite: 533/533 PASS (historical 505 + 28 new), zero failed/skipped/cancelled. Route tests execute transpiled handlers with mock SDK boundaries; SQL/static tests are not represented as live database acceptance.
- TypeScript: PASS. Optimized build: PASS. Diff check: PASS.
- Initial targeted unit run retained a false-positive comment match (32/33); test now excludes SQL comments before asserting executable SQL behavior. Targeted recheck 33/33 and notification-boundary 37/37 passed. Expectations were not weakened to accept incorrect application behavior.
- No package/lockfile, production connection, media source, TASK B or shared coordination edits. External browser runner/configuration is not part of the release payload.

Next: separately approve the exact production migration and application release in `NOTIFICATION_PREFERENCES_PRODUCTION_CHANGE_REQUEST_028.md`; do not deploy this work automatically.
