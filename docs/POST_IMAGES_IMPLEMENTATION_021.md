# TASK 021 — single post image implementation

Date: 2026-10-25 KST. Base `e54588d5b5d9ff9ddae64a004ab2b9bc3f0c52ba`; isolated branch `codex/post-images-021`. Historical coordination record 2026-10-16.009 was read, not rewritten. Current owner work order authorizes this test-only implementation. Prior worktrees/backups remain unchanged. No push, Production deployment, Production connection/write, reporting enablement, AI/TASK B or paid upgrade.

## Working flow

Selection/local preview → small authenticated Next route → DB-generated upload allocation → direct browser upload to private staging → authenticated Edge worker downloads the actual object → signature/size/header/full decode checks → re-encoded metadata-free WebP in private display bucket → ownership/post/version/lease rechecked under locks → atomic single-image association → delayed, retryable Storage API cleanup.

- One nullable attachment in private `media_private.slots`, not a writable `posts.image_path`. Existing text columns/contracts remain unchanged. Current text-only Server Actions still work when media is absent/off.
- Input JPEG/PNG/WebP only, 1–5,242,880 bytes. Signature must match the declared MIME; unsupported/animated/corrupt input rejected. PNG/WebP container structure is checked before decoding. No arbitrary path, filename, URL fetch or upsert.
- Maximum 4,194,304 input pixels and 8192 per dimension; output fits 2048×2048. Pinned `@imagemagick/magick-wasm` 0.0.45, bounded native memory/profile/list/time resources, no disk spill. Actual decode + re-encode; orientation applied before EXIF/GPS/ICC/XMP stripping. Output WebP only. No image goes to an external service.
- The worker lazily fetches the pinned WASM dependency from a fixed CDN path and verifies its SHA256. It uses Supabase's existing built-in server credential only inside the worker. No key export/new privileged credential, frontend key or privileged impersonated-user test. Existing CLI auth was invalid and was not retried/bypassed.
- Worker `verify_jwt=false` is intentional: every write explicitly calls Auth `getUser(token)` and rejects missing/invalid/anonymous users. The gateway's legacy-key check is not used as authorization. Public display reads first filter requested IDs through the real caller's ordinary `posts` SELECT/RLS, then sign only active validated attachments for 60 seconds. No user-editable metadata role decision.
- Private schema/table access and worker RPC EXECUTE denied to ordinary/anonymous clients. Six private tables have deny-all RLS as defense in depth. Storage's module-specific restrictive policy denies all ordinary direct reads/list/insert/update/delete; narrowly scoped signed capabilities handle upload/read. No managed Storage tables are recreated or SQL-deleted.
- Upload request retry reuses its allocation. Create requests have actor-bound UUID/payload idempotency; conflicting payload gets PT409. Owner-scoped session draft/request metadata prevents duplicate text posts after an ambiguous failure. Raw files/URLs/tokens are not persisted in drafts. Edit failures retain title/body and old image.
- Replacement CAS allows exactly one winner. Finish rechecks the real owner, existing post and upload lease/version. Delete trigger preserves paths/owner and queues objects even after the post disappears. Post identity changes are blocked once a media slot exists. Queue processing is bounded at 20 tasks, leased, retryable, and refuses a currently referenced final object.
- UI supports selection, preview, cancel, uploading/validation feedback, retry, replace/remove and cleanup retry. All post cards and detail use the same batched reader (max 20 IDs/request, short memory cache, in-flight dedup, invalidation after writes). Chinese/Korean copy and responsive controls retained.

## Isolated infrastructure and source mapping

Verified project `kcny-e2e-017` / `kirvcbkbkvotnsqnbcyf`, org Free tier, initially zero Storage objects/buckets and approximately 12 MB database. No plan upgrade/new project. Tests used synthetic buffers only, no real images. No resource quota rejection occurred.

Applied only these new module migrations (CLI 2.110.0 generated UTC filenames; task date is KST):

| Source | SHA256 | Test management ledger |
|---|---|---|
| `20261024162328_post_image_lifecycle.sql` | `B84541E23FAF0CF3D6A82A5FED567659F290F860B04655EDF6799060936D485E` | `20261024163455 / post_image_lifecycle_021` |
| `20261024164540_post_image_cleanup_guards.sql` | `A387E8367ACF4D1542CA1BF704A941823CC23F4ED880AE1D7207369F6824A176` | `20261024164714 / post_image_cleanup_guards_021` |

Management tooling assigns execution-time versions; do not repair history or blindly push all pending migrations. First applied file remained immutable. Follow-up fixes an observed SQL alias collision and adds bounded sweep/identity guards. No reporting/reply/history migration rerun.

Private buckets: `kcny-post-staging` (three input MIME types) and `kcny-post-images` (WebP), both 5 MiB max. Worker `kcny-post-media` final version 5, bundle `4bc344f73b51039ab6895256b9d224dd12e0b99ae9c46d94ba2a2152170c0aab`, exactly the same bundle as normal version 3 before temporary fault injection.

`KCNY_POST_IMAGES_ENABLED` defaults off. Both app and worker exact-project guards reject Production. Test DB `media_private.configuration.enabled` was explicitly enabled only for acceptance, and is OFF at completion. Reading and cleanup remain available with new uploads off. Existing Production reporting OFF/OFF was not changed; local testing explicitly kept reporting off.

## Actual evidence, not simulated login acceptance

Existing legitimate A/B account fixtures were loaded through the prior external encrypted fixture workflow; passwords were never printed/reported or placed in Git. Two real browser contexts logged in through the website form; separate ordinary SDK sessions exercised direct API denials. No service-role success was counted as ordinary-user authorization evidence.

Evidence directory: `D:/KCNY-main-site-audit/KCNY-MAIN-20261025-021/` (with a working copy beside the worktree). No credentials, auth states, raw images or build caches included.

| Batch | Actual result |
|---|---|
| Original main batch `2026-10-24T16-57-18-629Z-main` | 22/24 PASS; both original failures retained |
| Targeted recheck `2026-10-24T17-00-56-451Z-recheck` | 4/4 PASS, including the two failed scenarios; not a rewritten main batch |
| DB off / anonymous API / immutable post identity | 6/6 PASS |
| Controlled Storage DELETE denial | 4/4 PASS: 20 failed jobs persisted; current image readable |
| Restored worker and real Storage retry | 4/4 PASS: 20 tasks acknowledged, 0 failures; current image still readable |
| Delete only this round's synthetic posts | 3/3 PASS |
| Cleanup after posts no longer exist | 3/3 PASS; final Storage readback 0 module objects, 0 pending jobs |

Main batch covers all three formats via real UI, refresh/feed/detail, 5,235,825-byte valid PNG, over-limit client/allocation/actual Storage rejection, MIME spoof/corrupt/SVG/pixel bomb rejection, raw staging/list denials, cross-user attach/replace/remove/delete rejection, direct private-state/worker-RPC/image_path bypass denial, request replay, one-winner concurrent replacement, delete/finalize race, Korean 390×844 upload and 820×1180 controls, flag-off server denial + actual plain-text publishing, malformed JSON and external URL rejection. Race observed finalize=404 after deletion; other interleavings are guarded by locks/CAS, not claimed as all exhaustively scheduled.

Original two main-batch failures were test synchronization: Next's route-announcer also has role=alert, and navigation waiting exceeded the click timeout during the retry. Selectors now target the actual error paragraph and navigation has its own timeout. Targeted replay proved retained input and exactly one persisted post. Earlier development probe failures (decoder list-limit and SQL alias) and their fixes are kept in `initial-failures.json`; no history overwritten.

Cleanup testing used a **temporary test-worker fetch shim** to return a controlled Storage DELETE denial, not a real provider outage or changed Storage policy. Version 4 was immediately replaced by the original exact bundle (version 5). Synthetic expiry/grace timestamps were explicitly advanced to avoid a three-hour wait; this does not claim that real token expiry elapsed. Actual deletions used Storage API, never SQL object-metadata deletion. A deliberately queued current image remained protected. All 12 known synthetic posts from probes/main/recheck and all this round's image files were removed through ordinary sessions; private lifecycle records remain for audit/idempotency. A/B signed out; no auth-state files saved.

Final automated validation: **437/437 unit tests**, no failed/skipped; TypeScript PASS; optimized Next 15.5.28 build PASS; diff check PASS. Real browser pageerror and unexpected HTTP5xx: 0 in all completed batches. Actual iPad/Safari hardware testing: **PENDING**, not implied by Chromium viewport results.

Security review: module RPC EXECUTE/grants/search_path/RLS, ownership/CAS, direct Storage/DML denial, signed-read visibility and no secret/client leakage checked. Advisor only reports six expected private-table RLS-with-no-policy INFO findings (intentional default deny, no schema/table grant), not missing access rules. [Advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Unrelated historical findings were not modified.

## One targeted retrospective

Fixed two core development defects: native working-image resource misconfiguration and ambiguous PL/pgSQL read aliases. Added identity/orphan-progress safeguards. No unresolved critical issue observed in the tested scope. Deferred: real iPad/Safari, broader volume/cold-start performance, native file-picker same-file reselection polish, optional operator automation. Cleanup is deliberately manual/bounded, not a scheduler. Signed capabilities have expiry windows, not instantaneous revocation. Production requires the separate request below.

References: [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [signed uploads](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl), [WASM processing](https://supabase.com/docs/guides/functions/examples/image-manipulation), [runtime limits](https://supabase.com/docs/guides/functions/limits), [Storage quota](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size).
