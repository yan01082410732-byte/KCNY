# TASK 024 — actual isolated scheduled maintenance

2026-10-25 KST. Base `89ac252a6c5fd7f1a79fbf8d9b17fa60db40f839`.
Only `kirvcbkbkvotnsqnbcyf` is an installation target. No Production installation,
flag changes, reporting changes, AI calls, new paid resources or push is authorized.

## Implemented operating path

`pg_cron` → private dispatcher → `pg_net` → `kcny-media-maintenance` → existing
`maintainMediaBatch` → exact module Storage API removal → true lease acknowledgement.
The ordinary `kcny-post-media` getUser/ownership/visibility behavior is unchanged.

The 256-bit dedicated secret is generated in the test database and stored only in
Vault under `kcny_media_maintenance_024`. Each dispatch signs its server timestamp
and unique nonce with HMAC-SHA256. The Edge authenticates against a service-only
RPC, a five-minute window and a one-use server dispatch record. No service key is
exported or placed in cron SQL/client code; the Edge uses its provider-held key.
Publishable keys and ordinary Auth JWTs do not confer maintenance rights.

Three new private tables have RLS and deny ordinary grants. Worker RPCs have fixed
empty search_path and EXECUTE only for service_role. The platform management
channel alone can install/pause/dispatch. No client-facing global cleanup action
was added to the application. Test-only exact-project allowlisting fails closed
for Production; Production adaptation/installation needs separate approval.

## Bounds and recovery

At most three owners/run, twenty claimed tasks/owner. Existing discovery remains
keyset paginated; owner cursor progress is durable, incomplete owner work is not
skipped, and a completed sweep wraps to NULL. Processing checks its global lease
before Storage operations. The run has a two-minute non-reentrant DB lease, a
35-second work budget, 42-second cancellation and bounded network/finalization
timeouts. Crashed job leases and global run leases recover using real server time.
There is no unbounded polling/loop. No other buckets or client-supplied paths are
accepted. Referenced valid images and live upload-processing leases remain protected.

`maintenance_dispatches` tracks source, request ID and eventual transport status;
`maintenance_runs` records actual start/finish, result counts, failures/recovery and
backlog; `maintenance_state` holds cursor, lease, last completion/success and failed
run count. A queued HTTP request or successful cron SQL execution is NOT cleanup
success. Inspect the actual worker run plus exact object readback. Deleted counts
are confirmed successful Storage removals/acks; an already absent object is a safe
idempotent removal and is not evidence of an additional physical file deletion.

Failure before an acknowledgement leaves the durable task lease recoverable. A
run that crashes has no invented finished_at; recovery records lease_expired and
recovered_at separately. Snapshot records pending/leased/due/failed counts and
oldest due time. `collect_maintenance_responses()` copies only safe status/error
categories from pg_net (never response headers/request credentials).

## Install, pause, resume, inspect

After independently verifying management project identity, apply only these new
migrations after the three TASK 021/022 media migrations:

1. `20261025061601_post_media_scheduled_maintenance_024.sql`.
2. `20261025062825_post_media_maintenance_status_024.sql`.

Deploy the new function with its declared config/import closure, then execute
`supabase/maintenance/install-test-schedule-024.sql` once. It creates an actual
hourly job, not a rapid test loop, with the minute chosen three minutes after
installation. It does not enable media uploads. The test installation produced
job 1, `27 * * * *` (every hour at minute 27 UTC).

Pause with `supabase/maintenance/pause-test-schedule-024.sql`; it preserves Vault,
job definition, recovery cursor and run history. To resume after explicit test
authorization, use `cron.alter_job(jobid, active:=true)` for this exact job only.
The maintenance-enabled flag is independent of the media-write flag, so necessary
manual maintenance can continue while uploads and the test cron are off.

Read only the exact job in `cron.job`/`cron.job_run_details`, run records, snapshots
and module cleanup rows. To make a controlled manual call, existing management may
call `media_private.dispatch_maintenance('manual')`; it is not a public RPC. Record
manual results separately from source='cron'. No external alert subscription was
installed; operational ownership/production monitoring still needs release approval.

The management tool assigned test ledger versions `20261025062151` and
`20261025062912` to these two names, respectively; the local filenames were created
earlier by the CLI. Both exact local SQL payloads were applied successfully. Record
this mapping rather than silently repairing the ledger or using a full db push.

## Actual evidence and limits

First true cron trigger: 2026-10-25 06:27:00.080820 UTC. Worker run
`0e2e4ef2-d773-4466-b92b-126e8bd48502` completed at 06:27:02.729135 UTC, HTTP 200,
one old display-object deletion/ack. Exact old object became absent; current image
remained present and a real ordinary-user signed read returned 200. Uploads were
off throughout this scheduled run. The test hourly job was then paused.

A deliberate invalid-path synthetic task caused actual HTTP 503 and
`maintenance_path_invalid`; the original failed run remains in history. Its path
was restored from the known synthetic upload record, not guessed. A separately
controlled interrupted startup acquired the real two-minute run lease without
continuing a worker, while a second real dispatch returned 409 busy. No clock or
timestamp was advanced. Subsequent recovery results belong in the final evidence,
not a rewrite of these original observations.

Real recovery run `263360d5-995e-4d48-8a4c-8581c55ad2de` completed at
06:32:58.720473 UTC. The interrupted run's lease naturally ended at 06:31:05;
its finished_at stays NULL and recovered_at records actual recovery. The task's
own lease naturally ended at 06:30:17; retry attempt 3 acknowledged removal of
the already absent old display path. This proves idempotent recovery, not a second
physical deletion. Busy control returned HTTP 409; real-signature nonce replay
was rejected. The original failure and controlled interrupted-start rows remain.

The current image still returned HTTP 200 at 06:33:03, before its disposable post
was intentionally deleted at 06:33:29. A separate management-triggered run at
06:35:44 removed that now-unreferenced display image. Final readback at 06:36:52:
zero due/failed/leased jobs, two future staging jobs, media writes false, cron
active=false. The global failed-run count remains 2; a later success did not erase
the failed run or interrupted-start history. These recovery/teardown calls are
manual, not misreported as additional scheduled runs.

TASK 023 credentials/fixtures are preserved unchanged for the real expiry probe.
Initial time was 15:10:38 KST, before 17:33:15 KST eligibility. Until that time the
expiry test is PENDING; no early upload/rejection or fake completion is claimed.
Any additional staging fixtures retain the three-hour safe allocation lifetime;
they must not be prematurely deleted while an issued upload capability can write.
At the final 15:36:53 KST clock check, genuine expiry was still not eligible. The
023 empty path remains absent and its abandoned PNG remains private. The 024
synthetic post and both display objects are gone; its two staging objects safely
remain until 18:23:22 KST. There are three known staging objects total, not a false
zero-orphan claim. One follow-up after **18:24:00 KST** can execute the original
023 one-shot expired-token probe, discover/reclaim both sets through the new
authorized maintenance path, delete the remaining 023 post and remove its private
encrypted capability state. The scheduler stays paused; no future job or reminder
was created to pretend this has already occurred.
No actual iPad hardware test was performed (PENDING). Historical 22/24 and 4/4 and
all earlier failed/recheck records remain unchanged.

## Resource and rollback boundaries

Current organization plan remains Free. No upgrade/purchase/new paid resource.
Monthly billing egress/function figures remain unverified because the previously
checked dashboard session requires authentication; no repeated login attempt here.
Do not infer bandwidth headroom from small database size. This task adds a tested
hourly job only in the independent project, paused after acceptance.

Stop scheduling with active=false; stop new uploads with BOTH write switches.
Preserve run/task history, Vault recovery configuration, buckets, posts and valid
references. Necessary bounded maintenance remains callable by authorized management.
No DROP, SQL storage.objects deletion, real-user file deletion or Production
deployment is a rollback step. A new production proposal must include these two
incremental migrations/config, explicit Production allowlisting, operational duty,
current resource headroom and the natural-expiry/iPad acceptance disposition.

## Checks and one targeted retrospective

Affected media unit tests: 56/56 PASS, no skips. Application TypeScript/build and
diff check PASS. Supplemental Edge TypeScript check against the pinned SDK and a
minimal Deno global declaration PASS. Its initial five diagnostics came from the
Windows virtual-file/type-root test harness, were preserved, and were corrected
without changing the worker implementation. Actual cloud execution independently
verifies the deployed runtime. The full unrelated unit suite was not rerun.

Actual configured-Vault auth checks: anonymous/public key/ordinary user/forged
HMAC all HTTP 401; ordinary/anonymous privileged RPC calls denied with 42501.
Three private tables' effective ordinary grants are false and RLS is enabled;
four public worker RPCs have ordinary EXECUTE false, service EXECUTE true and
fixed empty search_path. Expected private deny-all RLS advisor info and inherited
unrelated warnings were not "fixed" by widening permissions. No confirmed new
security/core defect remains in the exercised path. Hardware/scale observations
and production gates are recorded in the backlog; no broader audit was performed.
