-- TASK 026. Apply ONLY after the five immutable TASK 021/022/024 migrations.
-- No credentials, buckets, active schedules or upload enabling in this migration.
do $$begin
 if exists(select 1 from media_private.maintenance_state where lease_until>clock_timestamp()) then raise exception 'maintenance_run_active'; end if;
 if exists(select 1 from cron.job where jobname in ('kcny-post-media-hourly-024','kcny-post-media-hourly-026') and active) then raise exception 'pause_media_schedule_first'; end if;
 if (select enabled from media_private.configuration) then raise exception 'disable_media_writes_first'; end if;
end;$$;
update media_private.maintenance_state set enabled=false where singleton;
alter table media_private.maintenance_state drop constraint maintenance_state_project_url_check;
alter table media_private.maintenance_state add column environment text;
alter table media_private.maintenance_state add constraint maintenance_project_url_026 check(project_url in ('https://kirvcbkbkvotnsqnbcyf.supabase.co','https://czcyarmramlpmilfhpqo.supabase.co'));
alter table media_private.maintenance_state add constraint maintenance_identity_026 check(
 (environment is null and not enabled) or (environment is not null and
 ((environment='test' and project_url='https://kirvcbkbkvotnsqnbcyf.supabase.co') or
  (environment='production' and project_url='https://czcyarmramlpmilfhpqo.supabase.co'))));
alter table media_private.maintenance_dispatches add column environment text, add column project_url text;
-- NULL means historical counters were not measured, not zero physical deletions.
alter table media_private.maintenance_runs
 add column physical_deleted integer check(physical_deleted>=0),
 add column already_absent integer check(already_absent>=0),
 add column acknowledged integer check(acknowledged>=0);

create function media_private.valid_identity(p_environment text,p_url text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce((p_environment='test' and p_url='https://kirvcbkbkvotnsqnbcyf.supabase.co') or
 (p_environment='production' and p_url='https://czcyarmramlpmilfhpqo.supabase.co'),false);
$$;
revoke all on function media_private.valid_identity(text,text) from public,anon,authenticated,service_role;

-- v1 dispatches/signatures are deliberately not accepted by v2. Keep history intact.
revoke all on function public.media_maintenance_begin(uuid,text,text) from public,anon,authenticated,service_role;
create function public.media_maintenance_begin_v2(p_nonce uuid,p_timestamp text,p_signature text,p_environment text,p_project_url text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare secret text; expected text; s media_private.maintenance_state; d media_private.maintenance_dispatches; lease_key uuid;
begin
 if auth.role() is distinct from 'service_role' or p_timestamp is null or p_timestamp!~'^[0-9]{10,11}$' or p_signature is null or p_signature!~'^[a-f0-9]{64}$' then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 if abs(extract(epoch from clock_timestamp())-p_timestamp::bigint)>300 then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 select * into s from media_private.maintenance_state where singleton for update;
 if not s.enabled or not media_private.valid_identity(s.environment,s.project_url) then raise sqlstate 'PT403' using message='maintenance_disabled'; end if;
 -- p_* identity is supplied by Edge provider/server config, never request JSON.
 if p_environment is distinct from s.environment or p_project_url is distinct from s.project_url then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 select * into d from media_private.maintenance_dispatches where id=p_nonce and signed_timestamp=p_timestamp and environment=s.environment and project_url=s.project_url and status='queued' for update;
 if not found then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='kcny_media_maintenance_026_'||s.environment;
 if secret is null then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 expected:=encode(extensions.hmac('026:'||s.environment||':'||s.project_url||':'||d.source||':'||p_timestamp||':'||p_nonce::text,secret,'sha256'),'hex');
 if extensions.digest(p_signature,'sha256')<>extensions.digest(expected,'sha256') then raise sqlstate 'PT401' using message='maintenance_authentication_required'; end if;
 if s.lease_until>clock_timestamp() then
  update media_private.maintenance_dispatches set status='busy' where id=p_nonce;
  insert into media_private.maintenance_runs(id,status,finished_at,error_code,physical_deleted,already_absent,acknowledged) values(p_nonce,'busy',clock_timestamp(),'maintenance_already_running',0,0,0);
  return jsonb_build_object('state','busy');
 end if;
 if s.run_id is not null then
  update media_private.maintenance_runs set status='lease_expired',recovered_at=clock_timestamp(),error_code='maintenance_lease_expired' where id=s.run_id and status='running';
  update media_private.maintenance_state set failed_runs=failed_runs+1,last_error='maintenance_lease_expired' where singleton;
 end if;
 lease_key:=gen_random_uuid();
 update media_private.maintenance_dispatches set status='accepted' where id=p_nonce;
 insert into media_private.maintenance_runs(id,status,cursor_before,cursor_after,physical_deleted,already_absent,acknowledged) values(p_nonce,'running',s.cursor_after,s.cursor_after,0,0,0);
 update media_private.maintenance_state set run_id=p_nonce,lease=lease_key,lease_until=clock_timestamp()+interval '2 minutes',last_started_at=clock_timestamp() where singleton;
 return jsonb_build_object('runId',p_nonce,'lease',lease_key,'after',s.cursor_after);
end;$$;
revoke all on function public.media_maintenance_begin_v2(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.media_maintenance_begin_v2(uuid,text,text,text,text) to service_role;

create or replace function public.media_maintenance_guard(p_run uuid,p_lease uuid) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise sqlstate 'PT403' using message='worker_only'; end if;
 return exists(select 1 from media_private.maintenance_state where singleton and enabled and media_private.valid_identity(environment,project_url) and run_id=p_run and lease=p_lease and lease_until>clock_timestamp());
end;$$;

create or replace function public.media_maintenance_progress(p_run uuid,p_lease uuid,p_progress jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.media_maintenance_guard(p_run,p_lease) then raise sqlstate 'PT409' using message='maintenance_lease_lost'; end if;
 perform 1 from media_private.maintenance_state where singleton and run_id=p_run and lease=p_lease for update;
 if not found then raise sqlstate 'PT409' using message='maintenance_lease_lost'; end if;
 update media_private.maintenance_state set cursor_after=(p_progress->>'cursor')::uuid where singleton;
 update media_private.maintenance_runs set cursor_after=(p_progress->>'cursor')::uuid,
 owners=(p_progress->>'owners')::integer,deleted=(p_progress->>'deleted')::integer,failed=(p_progress->>'failed')::integer,
 physical_deleted=(p_progress->>'physicalDeleted')::integer,already_absent=(p_progress->>'alreadyAbsent')::integer,acknowledged=(p_progress->>'acknowledged')::integer where id=p_run;
end;$$;

create or replace function public.media_maintenance_finish(p_run uuid,p_lease uuid,p_result jsonb,p_error text) returns jsonb
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
  update media_private.maintenance_runs set owners=(p_result->>'owners')::integer,deleted=(p_result->>'deleted')::integer,failed=(p_result->>'failed')::integer,cursor_after=(p_result->>'next')::uuid,
   physical_deleted=(p_result->>'physicalDeleted')::integer,already_absent=(p_result->>'alreadyAbsent')::integer,acknowledged=(p_result->>'acknowledged')::integer where id=p_run;
  update media_private.maintenance_state set cursor_after=(p_result->>'next')::uuid where singleton;
 end if;
 update media_private.maintenance_runs set status=outcome,finished_at=clock_timestamp(),error_code=failure,backlog=snapshot where id=p_run;
 update media_private.maintenance_state set run_id=null,lease=null,lease_until=null,last_finished_at=clock_timestamp(),
  last_success_at=case when outcome='completed' then clock_timestamp() else last_success_at end,
  failed_runs=failed_runs+case when outcome='failed' then 1 else 0 end,last_error=failure,backlog=snapshot where singleton;
 return jsonb_build_object('status',outcome,'result',p_result,'backlog',snapshot);
end;$$;

create or replace function media_private.dispatch_maintenance(p_source text default 'manual') returns uuid
language plpgsql security definer set search_path='' as $$
declare nonce uuid:=gen_random_uuid(); stamp text:=floor(extract(epoch from clock_timestamp()))::bigint::text; secret text; signature text; request bigint; s media_private.maintenance_state;
begin
 if p_source is null or p_source not in ('manual','cron') then raise exception 'maintenance_source_denied'; end if;
 perform media_private.collect_maintenance_responses();
 select * into s from media_private.maintenance_state where singleton and enabled;
 if not found or not media_private.valid_identity(s.environment,s.project_url) then raise exception 'maintenance_environment_denied'; end if;
 select decrypted_secret into secret from vault.decrypted_secrets where name='kcny_media_maintenance_026_'||s.environment;
 if secret is null then raise exception 'maintenance_secret_missing'; end if;
 signature:=encode(extensions.hmac('026:'||s.environment||':'||s.project_url||':'||p_source||':'||stamp||':'||nonce::text,secret,'sha256'),'hex');
 insert into media_private.maintenance_dispatches(id,signed_timestamp,source,environment,project_url) values(nonce,stamp,p_source,s.environment,s.project_url);
 select net.http_post(url:=s.project_url||'/functions/v1/kcny-media-maintenance',headers:=jsonb_build_object('Content-Type','application/json','x-kcny-maintenance-id',nonce,'x-kcny-maintenance-time',stamp,'x-kcny-maintenance-signature',signature),body:='{}'::jsonb,timeout_milliseconds:=55000) into request;
 update media_private.maintenance_dispatches set request_id=request where id=nonce;
 return nonce;
end;$$;
-- CREATE OR REPLACE retains ACLs; explicitly restate the boundary for review.
revoke all on function media_private.dispatch_maintenance(text),media_private.collect_maintenance_responses(),media_private.maintenance_snapshot() from public,anon,authenticated,service_role;
revoke all on function public.media_maintenance_guard(uuid,uuid),public.media_maintenance_progress(uuid,uuid,jsonb),public.media_maintenance_finish(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.media_maintenance_guard(uuid,uuid),public.media_maintenance_progress(uuid,uuid,jsonb),public.media_maintenance_finish(uuid,uuid,jsonb,text) to service_role;
