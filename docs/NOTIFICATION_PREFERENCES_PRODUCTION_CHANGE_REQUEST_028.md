# TASK 028 — production change request (NOT EXECUTED)

Prepared 2026-10-25 KST. Scope only in-app notification preferences. Test project `kirvcbkbkvotnsqnbcyf` accepted; production `czcyarmramlpmilfhpqo` untouched. Application source is on `codex/notification-preferences-028`, descended from release base `43638fcaf459c2797b076d0bd4ecf3a5a44f41d5`; select its reviewed final checkpoint, not an older branch tip.

## Exact migration, one file only

1. `supabase/migrations/20261025141205_notification_preferences_028.sql`
   SHA256 `E00C4EA657BDC3F18CF4E9AC5311C330600E06BC66D7E61A3260E6AC571F9BF3`.

The management migration tool recorded this payload in the test ledger as version **20261025141820**, name `notification_preferences_028`. The repository filename keeps its original CLI-generated version **20261025141205**. This difference is documented, not repaired, renamed or concealed. A release operator must explicitly select the reviewed single payload and verify its resulting production ledger entry. Do not run an unrestricted `db push` that could pick up unrelated historical pending migrations. This task authorizes **no production apply, ledger repair or deployment**.

## Dependencies / effects

- Existing Auth users and `public.notifications` with recipient_id and the four current types; existing comment/reply, like and follow notification creation paths. Verify these narrow prerequisites and absence of conflicting new objects at release time, not an unrelated full-schema audit.
- Creates one auth-user-owned preference table, three owner policies, column grants, invoker save RPC, private schema/timestamp trigger and private recipient-read filter function, plus BEFORE INSERT trigger on notifications.
- No old notification/data rewrite or delete. No change to notification uniqueness, existing read/read-all APIs, pagination/indexes, original generation functions or post/comment/follow permissions. No media, reporting, Auth policy, Storage or Cron changes.
- Small transactional DDL; BEFORE INSERT trigger takes a short metadata lock on notifications. Use bounded lock/statement timeouts (test used 5s/30s), retry in a quiet window only after checking actual result. Object/name conflicts or unexpected prior application: stop, do not overwrite/reapply blindly.

## Release sequence requested for separate approval

1. Verify current live application ancestry and exact production project/configuration. Preserve current deployment rollback target; no test key, account, state, `.env.local` or external evidence in the release.
2. Confirm application release and **this single migration** are explicitly approved. Apply transactionally with bounded timeouts through the authorized management channel, preserving payload/hash; verify ledger, RLS, grants, private search_paths and trigger wiring.
3. Deploy reviewed application code using actual Production configuration, initially staged without domain promotion. Verify authenticated own-preference GET/PUT and absent-row defaults, public routes and disabled reporting. Never use synthetic production comments/likes/follows as a bulk test. Dual-account write acceptance remains isolated.
4. Promote only after checks pass. Monitor preference API failures and the sanitized lookup-failure diagnostic. Existing media settings stay unchanged; reporting remains OFF/OFF. No new paid resource or scheduler is requested.

There is no new global application flag: before schema is present the preferences API returns an explicit failure and the settings controls cannot report successful saves. Old clients continue generating notifications subject to the DB recipient gate once installed. Therefore apply the DB contract before publishing the new settings UI. Do not fake defaults on a missing-table error.

## Failure / rollback preserving user decisions

- Any migration failure: stop and inspect transaction/ledger; do not run later unrelated migrations. No destructive cleanup.
- Application regression: restore the previous application deployment. Keep preference rows, notification history and recipient-filter trigger: old application behavior respects stored opt-outs even if its settings UI is unavailable temporarily.
- Preference lookup outage: primary business commits; that notification is omitted and diagnostic emitted. **No automatic catch-up**. Restore the query path promptly; do not claim omitted notifications were sent.
- Emergency bypass/removal of the database filter would resume notifications users disabled. It is not the default rollback and needs a separate privacy/product decision. Do not DROP the table/schema, reset preferences, delete notifications or change RLS merely to make a rollback appear clean.

## Remaining conditions / known limitations

Production authorization and controlled deployment are outstanding. Real iPad hardware is PENDING; Chromium tablet/mobile/desktop viewports pass. The existing development RSC follow-switch error (`frame.join is not a function`) remains separately recorded; same-source optimized acceptance passed, no unconfirmed framework root cause asserted. Existing unrelated security-advisor notices are deferred. No email, SMS, mobile push, notification backfill or provider preference integration is included.

See `NOTIFICATION_PREFERENCES_IMPLEMENTATION_028.md` for original failed batches, separate successful focused batch, real RLS tests and transactional DB failure acceptance. Supabase skill guidance influenced the use of explicit grants, owner RLS, invoker RPC and a non-exposed, fixed-search-path recipient trigger.
