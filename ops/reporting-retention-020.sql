-- MANAGEMENT-ONLY TEMPLATE. Not a migration or application RPC.
-- DRAFT / execution not verified: management interface returned invalid requestState.
-- TASK 020 authorizes execution ONLY against synthetic data in kirvcbkbkvotnsqnbcyf.
-- A later production run requires separate approval of exact cases and target identity.
-- Replace the single JSON placeholder using a JSON serializer, never SQL concatenation.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create temp table kcny_retention_request(doc jsonb) on commit drop;
insert into kcny_retention_request values ('__KCNY_RETENTION_REQUEST_JSON__'::jsonb);
lock table public.reports, reporting_private.requests, reporting_private.review_events in access exclusive mode;
do $$
declare
  request jsonb := (select doc from pg_temp.kcny_retention_request);
  ids uuid[]; nil_id constant uuid := '00000000-0000-0000-0000-000000000000';
  expected integer; eligible integer; summary jsonb;
begin
  if coalesce(request->>'project_ref','') not in ('kirvcbkbkvotnsqnbcyf','czcyarmramlpmilfhpqo')
    or coalesce(request->>'approval_reference','')='' or request->>'no_open_appeal_confirmed' is distinct from 'true' then
    raise exception 'retention_approval_required';
  end if;
  -- Project identity MUST also be verified by the authenticated management executor;
  -- a JSON value is not independent proof of the connected database's identity.
  select array_agg(value::uuid) into ids from jsonb_array_elements_text(request->'case_ids');
  expected := (request->>'expected_case_count')::integer;
  if expected is null or expected not between 1 and 20 or coalesce(array_length(ids,1),0)<>expected
    or (select count(distinct x) from unnest(ids) x)<>expected then raise exception 'retention_invalid_batch'; end if;
  perform 1 from reporting_private.configuration where singleton and enabled=false for update;
  if not found then raise exception 'retention_disable_feature_first'; end if;
  select count(*) into eligible from public.reports r where r.id=any(ids)
    and r.status in ('resolved','dismissed') and r.reporter_id<>nil_id
    and r.updated_at<=now()-interval '90 days'
    and exists(select 1 from reporting_private.review_events e where e.report_id=r.id and e.to_status=r.status)
    and not exists(select 1 from reporting_private.review_events e where e.report_id=r.id and e.created_at>now()-interval '90 days');
  if eligible<>expected then raise exception 'retention_ineligible_case'; end if;
  if not exists(select 1 from pg_catalog.pg_trigger where tgrelid='reporting_private.review_events'::regclass
      and tgname='report_events_immutable' and tgenabled='O' and tgfoid='reporting_private.append_only()'::regprocedure) then
    raise exception 'retention_audit_guard_mismatch';
  end if;
  select jsonb_agg(x) into summary from
    (select kind,status,date_trunc('month',updated_at)::date as closed_month,count(*) as cases
      from public.reports where id=any(ids) group by kind,status,date_trunc('month',updated_at)::date)x;
  -- Owner-only, named trigger exception under exclusive locks and ONE transaction.
  -- No session_replication_role, global trigger disable, public RPC or broad grants.
  alter table reporting_private.review_events disable trigger report_events_immutable;
  update reporting_private.review_events set actor_id=nil_id,decision_reason='retention_redacted',internal_note=''
    where report_id=any(ids);
  update public.reports set reporter_id=nil_id,target_id=case when target_id is null then null else nil_id end,
    reason='other',description='[Sensitive content cleared under retention policy]',public_resolution='',version=version+1
    where id=any(ids);
  -- Removes both the identity link AND duplicated description/target_ref payload.
  -- After approved redaction the old request's idempotency mapping expires.
  delete from reporting_private.requests where report_id=any(ids);
  if request->>'simulate_failure'='true' then raise exception 'retention_expected_rollback_control'; end if;
  alter table reporting_private.review_events enable trigger report_events_immutable;
  insert into reporting_private.review_events(report_id,actor_id,from_status,to_status,decision_reason)
    select id,nil_id,status,status,'retention_redacted' from public.reports where id=any(ids);
  -- Only non-identifying aggregates are returned; retain this safe summary externally.
  perform pg_catalog.set_config('kcny.retention_summary',summary::text,false);
end;
$$;
commit;
select pg_catalog.current_setting('kcny.retention_summary')::jsonb as non_identifying_statistics;
