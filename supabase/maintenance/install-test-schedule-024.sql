-- TEST ONLY: first verify management project identity kirvcbkbkvotnsqnbcyf.
-- Requires migration 20261025061601 and deployed kcny-media-maintenance.
-- Credentials are generated and remain in Vault; never return/decrypt them to a client.
begin;
do $$
begin
 if (select project_url from media_private.maintenance_state where singleton) is distinct from 'https://kirvcbkbkvotnsqnbcyf.supabase.co' then raise exception 'TEST_PROJECT_REQUIRED'; end if;
 if exists(select 1 from cron.job where jobname='kcny-post-media-hourly-024') then raise exception 'ALREADY_INSTALLED_USE_EXPLICIT_RESUME'; end if;
 if not exists(select 1 from vault.secrets where name='kcny_media_maintenance_024') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'kcny_media_maintenance_024','Test-only hourly media maintenance HMAC; no user or service-role credential');
 end if;
end;$$;
update media_private.maintenance_state set enabled=true where singleton;
-- Once per hour, at a minute three minutes after installation. No rapid test cron.
select cron.schedule('kcny-post-media-hourly-024',((extract(minute from clock_timestamp())::integer+3)%60)::text||' * * * *',$job$select media_private.dispatch_maintenance('cron');$job$) as job_id;
commit;
