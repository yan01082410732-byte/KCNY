-- TEMPLATE: manual review, choose exactly one operation on verified management target.
-- Pausing scheduling never disables independent manually dispatched cleanup.
-- PAUSE (safe default):
select cron.alter_job((select jobid from cron.job where jobname='kcny-post-media-hourly-026'),active:=false);
-- RESUME only after current v2 Edge is deployed and an actual completed run verified:
-- select cron.alter_job((select jobid from cron.job where jobname='kcny-post-media-hourly-026'),active:=true);
-- MANUAL bounded run (a UUID is only dispatch acknowledgement, not success):
-- select media_private.dispatch_maintenance('manual');
-- After execution, collect response metadata and inspect the run's actual finish:
-- select media_private.collect_maintenance_responses();
select s.environment,s.project_url,s.enabled,s.last_success_at,s.failed_runs,s.last_error,
 s.lease_until,media_private.maintenance_snapshot() as backlog,
 (select jsonb_build_object('status',r.status,'finishedAt',r.finished_at,
 'physicalDeleted',r.physical_deleted,'alreadyAbsent',r.already_absent,'acknowledged',r.acknowledged,
 'error',r.error_code) from media_private.maintenance_runs r order by r.started_at desc limit 1) as latest_run
from media_private.maintenance_state s;
