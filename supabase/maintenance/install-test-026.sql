-- TEST ONLY. Verify management target kirvcbkbkvotnsqnbcyf before execution.
begin;
do $$begin
 if (select enabled from media_private.configuration) then raise exception 'disable_media_writes_first'; end if;
 if exists(select 1 from media_private.maintenance_state where lease_until>clock_timestamp()) then raise exception 'maintenance_run_active'; end if;
 if exists(select 1 from cron.job where jobname in ('kcny-post-media-hourly-024','kcny-post-media-hourly-026') and active) then raise exception 'pause_media_schedule_first'; end if;
 if exists(select 1 from cron.job where jobname='kcny-post-media-hourly-026') then raise exception 'already_installed_use_explicit_resume'; end if;
 if not exists(select 1 from vault.secrets where name='kcny_media_maintenance_026_test') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'kcny_media_maintenance_026_test','Independent test-only v2 maintenance HMAC; not for production');
 end if;
end;$$;
update media_private.maintenance_state set environment='test',project_url='https://kirvcbkbkvotnsqnbcyf.supabase.co',enabled=true where singleton;
select cron.schedule('kcny-post-media-hourly-026','17 * * * *',$job$select media_private.dispatch_maintenance('cron');$job$) as job_id;
select cron.alter_job((select jobid from cron.job where jobname='kcny-post-media-hourly-026'),active:=false);
commit;
