# TASK 022 — targeted media corrections / production checklist

Date: 2026-10-25 KST. Base: `221d9fc3134bc8f91d664bcaa0c90908ca519cd6`.
This is preparation plus isolated test implementation, **not production authority**.
Original TASK 021 migrations, 22/24 batch and 4/4 recheck remain unchanged.
Production `czcyarmramlpmilfhpqo`, reporting OFF/OFF, TASK B and AI are untouched.

## Changed behavior

- `lib/media-commit.ts` separates acknowledged commits from cleanup. A successful
  finish/remove returns its real image/version, `committed=true`, and independent
  cleanup state (`checked` is not a claim that all future jobs are complete).
  Discovery/claim/ack failure yields `cleanup.state=pending`; durable lifecycle
  and leased job rows remain recoverable. Explicit business rejection still fails.
- Finish is outside the validation/reject catch. A lost commit response is checked
  by upload/removal request identity. Unknown results return `outcome_unknown`,
  never fabricated success or blind rejection. Browser retries retain original
  allocation/version/request identity; already-unknown requests reconcile first.
- Management discovery includes abandoned expired uploads, expired deleting leases,
  unreferenced ready images and exact observed late objects. Live processing leases
  and currently referenced display images remain protected. Only existing server
  authority may use the helper/RPC; no ordinary global maintenance route or cron.
- A controlled late PUT after a completed cleanup did reproduce a leftover object.
  A follow-up migration reopens completed jobs only for observed eligible objects.
  This control advanced DB timestamps while its real upload capability was still
  valid; it does not prove a request completed after natural token expiration.

## Exact production sequence — separate approval still required

1. Approve production budget/quotas, operational cleanup owner and iPad/Safari
   acceptance disposition. Current test cost does not guarantee perpetual free use.
2. Verify project identity and module name/dependency conflicts only. Preserve
   posts/Auth/Storage contracts; no unrelated migration/ledger/reporting work.
3. Apply TASK 021 lifecycle migration, TASK 021 cleanup guards, then
   `20261024182118_post_image_outcomes_maintenance_022.sql`, in this order and only
   when not already applied. The new migration adds outcome/discovery RPCs, replaces
   orphan discovery and adds two indexes; it does not rewrite old migration files.
   Use bounded lock/statement timeouts. Keep DB `configuration.enabled=false`.
4. Deploy reviewed `kcny-post-media` with its complete relative import closure.
   `supabase/config.toml` now declares `verify_jwt=false`, entrypoint and import map.
   Real Auth `getUser` on writes and real caller post visibility on reads remain
   mandatory. Do not deploy test fault/bootstrap code. No credential export.
5. Prepare a fresh production app build with writes OFF and the exact combination
   below, inspect before domain promotion, record the prior application rollback.
6. Verify schema/grants/private buckets/function, read/disabled behavior and cleanup
   duty. Only separately authorized release may enable BOTH new-upload switches.

| Configuration | Production only | Isolated test / Preview |
|---|---|---|
| app `NEXT_PUBLIC_SUPABASE_URL` / Edge `SUPABASE_URL` | exact production project URL | exact test project URL |
| `KCNY_MEDIA_ENVIRONMENT` | `production` | `test` |
| `KCNY_MEDIA_DEPLOYMENT_ENV` | `production` | `development` or `preview` |
| app `VERCEL_ENV` | must equal `production` and the explicit deployment value | must match the test deployment value |
| app `KCNY_POST_IMAGES_ENABLED` | default false until approved | explicit test value |
| DB `media_private.configuration.enabled` | default false until approved | explicit test value |

Missing/mismatched production configuration fails closed. Preview + production URL
is rejected even if a write flag is true. Edge uses provider-held environment
configuration, not a caller-supplied environment header. Production adaptation is
code/unit-tested only in this task; no production function/config was deployed.

## Maintenance / rollback

Use the existing authorized management channel and `docs/POST_IMAGES_CLEANUP_021.md`,
or `lib/media-maintenance.ts` inside a trusted existing server runtime. Do not
export a service key to make a laptop script work. At most 20 owners/page and 20
claims/owner; iterate keyset pages, restart a later sweep from NULL. Physical
deletion is exclusively Storage API, followed by true lease acknowledgement.
An absent object is a safe repeat deletion. Failure/expired lease is not erased.
Production scheduling/credentials/resources are not created by these materials.

Stop new uploads by closing BOTH flags. Keep validated images/references/worker
and cleanup available. Signed reads last 60 seconds; the component retries or
navigation refreshes them, not a periodic auto-renew timer. Pre-media app rollback
does not render attachments, so prefer flag-off/fix-forward. Never DROP buckets,
delete cases/posts or erase lifecycle data as a default rollback.

## Acceptance and remaining limits

See `POST_IMAGES_TARGETED_ACCEPTANCE_022.md` for separate raw batches/rechecks,
injection details and actual results. Mocks do not substitute for real browser/API
checks. Real signed-credential natural-expiry and actual iPad hardware acceptance
are not claimed; fake expired-claim rejection is explicitly distinguished.
