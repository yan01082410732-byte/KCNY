# Single-image cleanup runbook — TASK 021

Scope: explicit test project only in this work order. No production schedule or destructive rollback. No real user files were processed. Buckets stay private; new upload disabling does not remove valid references.

## Ordinary owner flow

1. Sign in legitimately. An owner can use “重试清理 / 정리 다시 시도” on the edit page, or send `{ "operation": "cleanup" }` to the same-origin `/api/post-media` endpoint. Request needs a real user session. There is no client-supplied owner/path/bucket.
2. Worker checks the real Auth user, queues at most 20 expired dangling ready uploads, then claims at most 20 due jobs with `FOR UPDATE SKIP LOCKED` and a two-minute lease. A separate bounded sweep discovers expired failed/pending uploads without repeatedly starving newer rows.
3. Final-object tasks are eligible only when no existing post/slot still references the upload. Processing uploads cannot be deleted. Claim + immutable upload state prevent an attach-versus-cleanup race. Original signed upload URLs last two hours; raw-object expiry is at least three hours after the last allocation/mint attempt, including retries.
4. The worker deletes exact DB-generated paths through Storage API `.remove()`. Success is acknowledged by lease; failure records `storage_delete_failed`, increments attempts and returns to pending with a one-minute delay. Crash after deletion/before ack is safe: lease expires and deleting an already absent object is repeatable. Never SQL DELETE `storage.objects`.
5. Repeat bounded calls until no due tasks remain. Successful task count is not necessarily physical-file count (an absent object also completes a task). Check authoritative Storage metadata/object readback for final zero-orphan claims. No automatic cleanup task is installed.

Post deletion uses a BEFORE DELETE trigger to retain the owner and paths and queue both source and display objects; records have no cascading FK to posts. The same owner can still call cleanup after the post no longer exists. Replace/remove first commits the new slot/version, then queues the displaced image with two-minute display grace. A failed replacement never unlinks the old image.

## Trusted manual operator fallback

For inactive owners, a separately authorized operator may work through the provider's authenticated management interface. Verify project identity, exact module bucket/path and case batch first. This is management authority, NOT evidence that ordinary clients have privileged rights.

TASK 022 replaces the pending-only discovery query. Use the bounded worker-only
candidate RPC through the already authorized management channel. It includes
expired unqueued uploads (excluding live processing leases), expired deleting
leases, unreferenced ready images and observed late objects at exact known paths.
No user needs to sign back in. Example management transaction (not a client API):

```sql
begin;
set local request.jwt.claims = '{"role":"service_role"}';
select * from public.media_maintenance_candidates(null,20);
commit;
```

In an authorized management transaction, set only that transaction's RPC role claim to service_role, call `public.media_queue_orphans(verified_owner_uuid)` and `public.media_service('cleanup_claim', verified_owner_uuid, '{}'::jsonb)`. Do not change persistent roles, RLS or Auth. The result is an exact batch of at most 20 fixed-bucket paths and leases, not a bucket-wide delete instruction. Inspect its correspondence to the approved owner/target. Delete those objects through the official Storage UI/API (the UI itself uses Storage API), then acknowledge each exact task ID/lease with `cleanup_ack` and the true success boolean in an authorized transaction. A failure stays pending; do not falsify success or manually erase queue records. Claim again if a lease expired. Never reuse this administrative path as a normal-user permission test, export a service key, or put it in the browser.

Current round exercised owner-session cleanup, including a persisted injected Storage failure and real retry. Operator fallback is documented, not separately presented as executed production maintenance. Future automation/global maintenance endpoints require a separate narrowly scoped decision; no whole-site super-admin role was introduced.

TASK 022 also supplies `lib/media-maintenance.ts`, a bounded trusted-runtime helper
using an existing server client, not an HTTP route or a request for key export.
Repeat keyset pages (at most 20 owners and 20 claims per owner), then restart at
NULL on a later sweep. Exact observed late objects reopen completed jobs; signed
upload safety still uses at least three hours after allocation. Actual deletion
uses Storage API. Acks that fail leave durable deleting leases for subsequent
recovery. Discovery/claim/ack failures are not silently called successful cleanup.
Assign an accountable operator and review queue age/failures before production;
there is still no installed automatic schedule.

## Acceptance controls and recovery

- Retain raw failures/retests separately. Controlled version-4 DELETE denial produced 20 persisted pending failures and left 27 objects/7 active objects unchanged. Version 5 restored the identical original bundle before retry.
- Deliberately queued active final object was not claimed/deleted. Real user retry completed 20 tasks while seven valid active objects remained readable.
- Synthetic timers were advanced in the test database only; real token expiry was not asserted. After deleting the 12 known synthetic posts, bounded owner-session Storage API cleanup left 0 module objects and 0 pending jobs. Lifecycle records remain, no raw media.
- Disable writes with both the application flag and private DB configuration. Reads and cleanup continue. Keep posts, valid image references, buckets, functions and cleanup records. Do not DROP schema/buckets or SQL-delete Storage metadata to roll back.
