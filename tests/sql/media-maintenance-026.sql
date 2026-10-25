-- Isolated worker-contract checks ONLY; not ordinary-user permission evidence.
-- JWT role here is a transaction-local service-worker simulation, never a user session.
-- Every fixture/counter/lease mutation rolls back. No HTTP/Storage invocation.
begin;
do $$begin
 if not exists(select 1 from media_private.maintenance_state where environment='test' and project_url='https://kirvcbkbkvotnsqnbcyf.supabase.co' and enabled and lease_until is null) then raise exception 'isolated_test_identity_required'; end if;
end;$$;
create temporary table checks_026(name text primary key,status text) on commit drop;
create function pg_temp.expect_026(p_ok boolean,p_name text) returns void language plpgsql as $$begin
 if not coalesce(p_ok,false) then raise exception '026 contract failed: %',p_name; end if;
 insert into pg_temp.checks_026 values(p_name,'PASS');
end;$$;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.role','service_role',true);
do $$
declare rejected boolean; secret text; signature text; stamp text; nonce uuid; busy_nonce uuid; previous_run uuid; current_run uuid; lease_key uuid; result jsonb;
begin
 perform pg_temp.expect_026(media_private.valid_identity('production','https://czcyarmramlpmilfhpqo.supabase.co'),'exact_production_pair');
 perform pg_temp.expect_026(media_private.valid_identity('test','https://kirvcbkbkvotnsqnbcyf.supabase.co'),'exact_test_pair');
 perform pg_temp.expect_026(not media_private.valid_identity('production','https://kirvcbkbkvotnsqnbcyf.supabase.co'),'cross_environment_pair_denied');
 rejected:=false;begin update media_private.maintenance_state set environment='production' where singleton;exception when check_violation then rejected:=true;end;
 perform pg_temp.expect_026(rejected,'mismatched_database_identity_constraint');
 rejected:=false;begin perform public.media_maintenance_begin_v2(gen_random_uuid(),floor(extract(epoch from clock_timestamp()))::bigint::text,repeat('0',64),'production','https://czcyarmramlpmilfhpqo.supabase.co');exception when sqlstate 'PT401' then rejected:=true;end;
 perform pg_temp.expect_026(rejected,'edge_database_identity_mismatch_denied');
 rejected:=false;begin perform public.media_maintenance_begin_v2(gen_random_uuid(),floor(extract(epoch from clock_timestamp()-interval '10 minutes'))::bigint::text,repeat('0',64),'test','https://kirvcbkbkvotnsqnbcyf.supabase.co');exception when sqlstate 'PT401' then rejected:=true;end;
 perform pg_temp.expect_026(rejected,'stale_dispatch_timestamp_denied');
 select decrypted_secret into secret from vault.decrypted_secrets where name='kcny_media_maintenance_026_test';
 nonce:=gen_random_uuid();stamp:=floor(extract(epoch from clock_timestamp()))::bigint::text;
 insert into media_private.maintenance_dispatches(id,signed_timestamp,source,environment,project_url) values(nonce,stamp,'manual','test','https://kirvcbkbkvotnsqnbcyf.supabase.co');
 rejected:=false;begin perform public.media_maintenance_begin_v2(nonce,stamp,repeat('0',64),'test','https://kirvcbkbkvotnsqnbcyf.supabase.co');exception when sqlstate 'PT401' then rejected:=true;end;
 perform pg_temp.expect_026(rejected,'forged_signature_denied');
 signature:=encode(extensions.hmac('026:test:https://kirvcbkbkvotnsqnbcyf.supabase.co:manual:'||stamp||':'||nonce::text,secret,'sha256'),'hex');
 result:=public.media_maintenance_begin_v2(nonce,stamp,signature,'test','https://kirvcbkbkvotnsqnbcyf.supabase.co');
 lease_key:=(result->>'lease')::uuid;
 perform pg_temp.expect_026(result->>'runId'=nonce::text,'bound_dispatch_starts_real_database_run');
 rejected:=false;begin perform public.media_maintenance_begin_v2(nonce,stamp,signature,'test','https://kirvcbkbkvotnsqnbcyf.supabase.co');exception when sqlstate 'PT401' then rejected:=true;end;
 perform pg_temp.expect_026(rejected,'accepted_nonce_replay_denied');
 busy_nonce:=gen_random_uuid();
 insert into media_private.maintenance_dispatches(id,signed_timestamp,source,environment,project_url) values(busy_nonce,stamp,'cron','test','https://kirvcbkbkvotnsqnbcyf.supabase.co');
 signature:=encode(extensions.hmac('026:test:https://kirvcbkbkvotnsqnbcyf.supabase.co:cron:'||stamp||':'||busy_nonce::text,secret,'sha256'),'hex');
 result:=public.media_maintenance_begin_v2(busy_nonce,stamp,signature,'test','https://kirvcbkbkvotnsqnbcyf.supabase.co');
 perform pg_temp.expect_026(result->>'state'='busy','concurrent_schedule_does_not_steal_lease');
 perform pg_temp.expect_026(public.media_maintenance_guard(nonce,lease_key) and not public.media_maintenance_guard(nonce,gen_random_uuid()),'run_lease_guard');
 perform public.media_maintenance_progress(nonce,lease_key,'{"cursor":null,"owners":0,"deleted":0,"failed":0,"physicalDeleted":1,"alreadyAbsent":0,"acknowledged":0}'::jsonb);
 perform public.media_maintenance_finish(nonce,lease_key,null,'maintenance_injected_ack_failure');
 perform pg_temp.expect_026(exists(select 1 from media_private.maintenance_runs where id=nonce and status='failed' and physical_deleted=1 and acknowledged=0),'physical_outcome_survives_ack_failure_record');
 perform pg_temp.expect_026(exists(select 1 from media_private.maintenance_state where run_id is null and lease_until is null),'failed_run_releases_global_lock');
 previous_run:=gen_random_uuid();stamp:=floor(extract(epoch from clock_timestamp()))::bigint::text;
 insert into media_private.maintenance_dispatches(id,signed_timestamp,source,environment,project_url) values(previous_run,stamp,'manual','test','https://kirvcbkbkvotnsqnbcyf.supabase.co');
 signature:=encode(extensions.hmac('026:test:https://kirvcbkbkvotnsqnbcyf.supabase.co:manual:'||stamp||':'||previous_run::text,secret,'sha256'),'hex');
 perform public.media_maintenance_begin_v2(previous_run,stamp,signature,'test','https://kirvcbkbkvotnsqnbcyf.supabase.co');
 -- Simulated lease expiry, NOT a natural credential-expiry test. Transaction rollback.
 update media_private.maintenance_state set lease_until=clock_timestamp()-interval '1 second' where singleton;
 current_run:=gen_random_uuid();
 insert into media_private.maintenance_dispatches(id,signed_timestamp,source,environment,project_url) values(current_run,stamp,'manual','test','https://kirvcbkbkvotnsqnbcyf.supabase.co');
 signature:=encode(extensions.hmac('026:test:https://kirvcbkbkvotnsqnbcyf.supabase.co:manual:'||stamp||':'||current_run::text,secret,'sha256'),'hex');
 perform public.media_maintenance_begin_v2(current_run,stamp,signature,'test','https://kirvcbkbkvotnsqnbcyf.supabase.co');
 perform pg_temp.expect_026(exists(select 1 from media_private.maintenance_runs where id=previous_run and status='lease_expired' and recovered_at is not null),'v2_expired_global_lease_recovery');
 perform pg_temp.expect_026(not has_function_privilege('service_role','public.media_maintenance_begin(uuid,text,text)','EXECUTE'),'obsolete_signature_entry_revoked');
 perform pg_temp.expect_026(not has_function_privilege('authenticated','public.media_maintenance_begin_v2(uuid,text,text,text,text)','EXECUTE'),'ordinary_v2_execute_denied');
end;$$;
select jsonb_build_object('scope','isolated transaction-only worker contract; all changes rolled back','checks',(select jsonb_agg(to_jsonb(c) order by name) from pg_temp.checks_026 c)) as result;
rollback;
