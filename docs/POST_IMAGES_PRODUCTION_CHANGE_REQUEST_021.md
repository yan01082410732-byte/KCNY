# Production Change Request — TASK 021 post images

**NOT EXECUTED / separate owner authorization required.** This round only modified `kirvcbkbkvotnsqnbcyf`. Production `czcyarmramlpmilfhpqo`, its Storage/Auth/RLS, Vercel configuration, reporting switches and deployment were untouched. No push/merge.

## Exact proposed scope/order

1. Approve the final local checkpoint, production resource budget, region/CPU/egress expectations and real iPad/Safari acceptance disposition. Do not assume the test environment proves unlimited throughput.
2. Verify Production identity and only the existing `public.posts(id,author_id,title,content,category,language)` / Auth / Storage dependencies. Check for module schema, bucket, trigger and RPC name conflicts. Stop on conflict, no overwrites or blind full migration push.
3. Apply ONLY `20261024162328_post_image_lifecycle.sql` then `20261024164540_post_image_cleanup_guards.sql`, source hashes recorded in implementation report. Keep configuration.enabled=false. Includes six private RLS tables, worker-only RPCs, authenticated actor-bound creation RPC, two private 5 MiB buckets and module-specific restrictive Storage policy; adds post-delete and stable-identity guards. No posts.image_path, historical rewrite, reporting changes, test account seed or paid plan.
4. Prepare a reviewed production-specific worker/application allowlist adaptation. **Current source intentionally accepts the test ref only and rejects VERCEL_ENV=production.** Do not globally flip true/remove guards. Deploy pinned worker with platform-held built-in server credential; explicit Auth `getUser` validation on each write, caller-scoped visibility on reads. No management secret export. No fault shim or synthetic identities/data.
5. Stage a fresh approved Production-config app build without domain promotion and with application flag off. Verify permissions/disabled behavior, existing text paths and rollback target before promotion. No test configuration or build artifact reuse.
6. Enable only after DB grants/RLS/worker deployment, write/read/cost controls and manual cleanup ownership are accepted, then explicitly turn on both application and DB switches. Genuine write regression remains in the isolated test project unless specifically authorized otherwise. Do not change reporting OFF/OFF.

## Impact and controls

- No existing post data rewrite. Brief table locks for trigger installation; use low-traffic transaction and bounded lock/statement timeouts in the execution plan. Test-only ledger execution versions differ from source timestamps and must be mapped, never repaired by assumption.
- Private staging cannot be publicly listed/read. Only verified, decoded, metadata-free WebP can be linked. Existing public post visibility is rechecked with the caller's real data client before short signed reads.
- Native resource limits and 4,194,304 pixels bound decoding; 5 MiB actual object limit and 32 KiB JSON endpoint limit. No full image through Server Action/Vercel request body. Fixed dependency CDN URL is integrity-checked and carries no user image.
- Atomic CAS association protects replacement; reference-aware queue and Storage API deletion protect cleanup. Owner retry works after post deletion. Operator runbook is separate from ordinary user access; no automatic job is requested here.
- Rollout must monitor resource-limit errors, failures/queue age, egress and manual cleanup duty. Free-tier acceptance used small synthetic volume; no spend upgrade is authorized. Signed URLs remain usable for up to 60 seconds and signed uploads up to two hours: not instant revocation.

## Stop / rollback

On privacy/ownership/backend-identity failure: disable both new-upload switches immediately. Continue serving already validated images and bounded cleanup where safe; preserve all posts, slots, objects and jobs. Prefer flag-off/fix-forward. If application rollback is necessary, record that pre-media code does not render attachments, but all media references/files must remain intact for restoration. Never drop buckets/schema or erase user data as default rollback.

Remaining non-production limitation: actual iPad hardware/Safari PENDING; native file-picker reselection polish and higher-volume/cold-start benchmarks deferred. No production application or database execution authority is implied by this request.
