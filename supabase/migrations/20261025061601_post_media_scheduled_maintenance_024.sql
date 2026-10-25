-- TASK 024. No secrets, schedules, user seeds or production installation in this migration.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table media_private.maintenance_dispatches(
 id uuid primary key, signed_timestamp text not null, requested_at timestamptz not null default now(),
 source text not null check(source in ('manual','cron')), request_id bigint,
 status text not null default 'queued' check(status in ('queued','accepted','busy')),
 http_status integer, transport_error text, response_checked_at timestamptz
);
create table media_private.maintenance_runs(
 id uuid primary key references media_private.maintenance_dispatches(id),
 started_at timestamptz not null default now(), finished_at timestamptz, recovered_at timestamptz,
 status text not null check(status in ('running','completed','partial','failed','busy','lease_expired')),
 cursor_before uuid, cursor_after uuid, owners integer not null default 0,
 deleted integer not null default 0, failed integer not null default 0,
 error_code text, backlog jsonb
);
create table media_private.maintenance_state(
 singleton boolean primary key default true check(singleton), enabled boolean not null default false,
 project_url text not null check(project_url='https://kirvcbkbkvotnsqnbcyf.supabase.co'),
 cursor_after uuid, run_id uuid, lease uuid, lease_until timestamptz,
 last_started_at timestamptz, last_finished_at timestamptz, last_success_at timestamptz,
 failed_runs bigint not null default 0, last_error text, backlog jsonb
);
insert into media_private.maintenance_state(singleton,project_url) values(true,'https://kirvcbkbkvotnsqnbcyf.supabase.co');
alter table media_private.maintenance_dispatches enable row level security;
alter table media_private.maintenance_runs enable row level security;
alter table media_private.maintenance_state enable row level security;
revoke all on media_private.maintenance_dispatches,media_private.maintenance_runs,media_private.maintenance_state from public,anon,authenticated,service_role;
create index media_maintenance_dispatch_pending on media_private.maintenance_dispatches(requested_at) where response_checked_at is null;

create function media_private.maintenance_snapshot() returns jsonb language sql set search_path='' as $$
 select jsonb_build_object('observedAt',clock_timestamp(),
  'dueJobs',(select count(*) from media_private.cleanup where not_before<=now() and status='pending'),
  'expiredJobLeases',(select count(*) from media_private.cleanup where status='deleting' and lease_until<now()),
  'failedJobs',(select count(*) from media_private.cleanup where status<>'done' and last_error is not null),
  'oldestDueAt',(select min(not_before) from media_private.cleanup where status<>'done' and not_before<=now()),
  'expiredUnqueuedUploads',(select count(*) from media_private.uploads u where u.expires_at<now() and u.state in ('pending','processing','rejected') and not(u.state='processing' and coalesce(u.lease_until,'-infinity')>=now()) and not exists(select 1 from media_private.cleanup c where c.upload_id=u.id and c.bucket='kcny-post-staging')));
$$;
revoke all on function media_private.maintenance_snapshot() from public,anon,authenticated,service_role;

create function public.media_maintenance_begin(p_nonce uuid,p_timestamp text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare secret text; expected text; s media_private.maintenance_state; dispatch media_private.maintenance_dispatches; lease_key uuid;
begin
 if auth.role() is distinct from 'service_role' then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 if p_timestamp is null or p_timestamp!~'^[0-9]{10,11}$' or p_signature is null or p_signature!~'^[a-f0-9]{64}$' then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 if abs(extract(epoch from clock_timestamp())-p_timestamp::bigint)>300 then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='kcny_media_maintenance_024';
 if secret is null then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 expected:=encode(extensions.hmac(p_timestamp||':'||p_nonce::text,secret,'sha256'),'hex');
 if extensions.digest(p_signature,'sha256')<>extensions.digest(expected,'sha256') then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 select * into dispatch from media_private.maintenance_dispatches where id=p_nonce and signed_timestamp=p_timestamp and status='queued' for update;
 if not found then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 select * into s from media_private.maintenance_state where singleton for update;
 if not s.enabled then raise sqlstate 'PT403' using message='maintenance_disabled'; end if;
 if s.lease_until>clock_timestamp() then
  update media_private.maintenance_dispatches set status='busy' where id=p_nonce;
  insert into media_private.maintenance_runs(id,status,finished_at,error_code) values(p_nonce,'busy',clock_timestamp(),'maintenance_already_running');
  return jsonb_build_object('state','busy');
 end if;
 if s.run_id is not null then
  update media_private.maintenance_runs set status='lease_expired',recovered_at=clock_timestamp(),error_code='maintenance_lease_expired' where id=s.run_id and status='running';
  update media_private.maintenance_state set failed_runs=failed_runs+1,last_error='maintenance_lease_expired' where singleton;
 end if;
 lease_key:=gen_random_uuid();
 update media_private.maintenance_dispatches set status='accepted' where id=p_nonce;
 insert into media_private.maintenance_runs(id,status,cursor_before,cursor_after) values(p_nonce,'running',s.cursor_after,s.cursor_after);
 update media_private.maintenance_state set run_id=p_nonce,lease=lease_key,lease_until=clock_timestamp()+interval '2 minutes',last_started_at=clock_timestamp() where singleton;
 return jsonb_build_object('runId',p_nonce,'lease',lease_key,'after',s.cursor_after);
end;$$;

create function public.media_maintenance_guard(p_run uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise sqlstate 'PT403' using message='worker_only'; end if;
 return exists(select 1 from media_private.maintenance_state where singleton and run_id=p_run and lease=p_lease and lease_until>clock_timestamp());
end;$$;

create function public.media_maintenance_progress(p_run uuid,p_lease uuid,p_progress jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.media_maintenance_guard(p_run,p_lease) then raise sqlstate 'PT409' using message='maintenance_lease_lost'; end if;
 perform 1 from media_private.maintenance_state where singleton and run_id=p_run and lease=p_lease for update;
 if not found then raise sqlstate 'PT409' using message='maintenance_lease_lost'; end if;
 update media_private.maintenance_state set cursor_after=(p_progress->>'cursor')::uuid where singleton;
 update media_private.maintenance_runs set cursor_after=(p_progress->>'cursor')::uuid,
  owners=(p_progress->>'owners')::integer,deleted=(p_progress->>'deleted')::integer,failed=(p_progress->>'failed')::integer where id=p_run;
end;$$;

create function public.media_maintenance_finish(p_run uuid,p_lease uuid,p_result jsonb,p_error text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare outcome text; snapshot jsonb; failure text;
begin
 if not public.media_maintenance_guard(p_run,p_lease) then raise sqlstate 'PT409' using message='maintenance_lease_lost'; end if;
 perform 1 from media_private.maintenance_state where singleton and run_id=p_run and lease=p_lease for update;
 if not found then raise sqlstate 'PT409' using message='maintenance_lease_lost'; end if;
 failure:=case when p_error~'^maintenance_[a-z_]+$' then p_error when p_error is not null then 'maintenance_failed' when coalesce((p_result->>'failed')::integer,0)>0 then 'maintenance_storage_failed' end;
 outcome:=case when failure is not null then 'failed' when coalesce((p_result->>'incomplete')::boolean,false) then 'partial' else 'completed' end;
 snapshot:=media_private.maintenance_snapshot();
 if p_result is not null then
  update media_private.maintenance_runs set owners=(p_result->>'owners')::integer,deleted=(p_result->>'deleted')::integer,failed=(p_result->>'failed')::integer,cursor_after=(p_result->>'next')::uuid where id=p_run;
  update media_private.maintenance_state set cursor_after=(p_result->>'next')::uuid where singleton;
 end if;
 update media_private.maintenance_runs set status=outcome,finished_at=clock_timestamp(),error_code=failure,backlog=snapshot where id=p_run;
 update media_private.maintenance_state set run_id=null,lease=null,lease_until=null,last_finished_at=clock_timestamp(),
  last_success_at=case when outcome='completed' then clock_timestamp() else last_success_at end,
  failed_runs=failed_runs+case when outcome='failed' then 1 else 0 end,last_error=failure,backlog=snapshot where singleton;
 return jsonb_build_object('status',outcome,'result',p_result,'backlog',snapshot);
end;$$;

revoke all on function public.media_maintenance_begin(uuid,text,text),public.media_maintenance_guard(uuid,uuid),public.media_maintenance_progress(uuid,uuid,jsonb),public.media_maintenance_finish(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.media_maintenance_begin(uuid,text,text),public.media_maintenance_guard(uuid,uuid),public.media_maintenance_progress(uuid,uuid,jsonb),public.media_maintenance_finish(uuid,uuid,jsonb,text) to service_role;

create function media_private.collect_maintenance_responses() returns integer
language plpgsql security definer set search_path='' as $$
declare item record; collected integer:=0;
begin
 for item in select d.id,r.status_code,r.error_msg,r.timed_out from media_private.maintenance_dispatches d join net._http_response r on r.id=d.request_id where d.response_checked_at is null order by d.requested_at limit 20 loop
  update media_private.maintenance_dispatches set http_status=item.status_code,transport_error=case when item.timed_out then 'http_timeout' when item.error_msg is not null then 'http_transport_failed' end,response_checked_at=clock_timestamp() where id=item.id;
  collected:=collected+1;
 end loop;
 return collected;
end;$$;
revoke all on function media_private.collect_maintenance_responses() from public,anon,authenticated,service_role;

create function media_private.dispatch_maintenance(p_source text default 'manual') returns uuid
language plpgsql security definer set search_path='' as $$
declare nonce uuid:=gen_random_uuid(); stamp text:=floor(extract(epoch from clock_timestamp()))::bigint::text; secret text; signature text; request bigint; target text;
begin
 perform media_private.collect_maintenance_responses();
 select project_url into target from media_private.maintenance_state where singleton and enabled;
 if target is distinct from 'https://kirvcbkbkvotnsqnbcyf.supabase.co' then raise exception 'maintenance_environment_denied'; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='kcny_media_maintenance_024';
 if secret is null then raise exception 'maintenance_secret_missing'; end if;
 signature:=encode(extensions.hmac(stamp||':'||nonce::text,secret,'sha256'),'hex');
 insert into media_private.maintenance_dispatches(id,signed_timestamp,source) values(nonce,stamp,p_source);
 select net.http_post(url:=target||'/functions/v1/kcny-media-maintenance',headers:=jsonb_build_object('Content-Type','application/json','x-kcny-maintenance-id',nonce,'x-kcny-maintenance-time',stamp,'x-kcny-maintenance-signature',signature),body:='{}'::jsonb,timeout_milliseconds:=55000) into request;
 update media_private.maintenance_dispatches set request_id=request where id=nonce;
 return nonce;
end;$$;
revoke all on function media_private.dispatch_maintenance(text) from public,anon,authenticated,service_role;
