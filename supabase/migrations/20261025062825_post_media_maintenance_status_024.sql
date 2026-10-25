-- Add complete queue totals without rewriting the already-applied TASK 024 migration.
create or replace function media_private.maintenance_snapshot() returns jsonb language sql set search_path='' as $$
 select jsonb_build_object('observedAt',clock_timestamp(),
  'pendingJobs',(select count(*) from media_private.cleanup where status='pending'),
  'leasedJobs',(select count(*) from media_private.cleanup where status='deleting'),
  'dueJobs',(select count(*) from media_private.cleanup where not_before<=now() and status='pending'),
  'expiredJobLeases',(select count(*) from media_private.cleanup where status='deleting' and lease_until<now()),
  'failedJobs',(select count(*) from media_private.cleanup where status<>'done' and last_error is not null),
  'oldestDueAt',(select min(not_before) from media_private.cleanup where status<>'done' and not_before<=now()),
  'expiredUnqueuedUploads',(select count(*) from media_private.uploads u where u.expires_at<now() and u.state in ('pending','processing','rejected') and not(u.state='processing' and coalesce(u.lease_until,'-infinity')>=now()) and not exists(select 1 from media_private.cleanup c where c.upload_id=u.id and c.bucket='kcny-post-staging')));
$$;
revoke all on function media_private.maintenance_snapshot() from public,anon,authenticated,service_role;
