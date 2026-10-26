-- TASK030: candidate policy only; new operations and actual redaction default OFF.
-- No account seeds, scheduled deletes, Auth changes or target-content deletion.
begin;
set local lock_timeout = '5s';

create table reporting_private.operations_configuration (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  policy_approved boolean not null default false,
  policy_version text not null default 'candidate-90d-v1'
);
insert into reporting_private.operations_configuration(singleton) values (true);
create table reporting_private.reviewer_membership_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  granted boolean not null,
  changed boolean not null,
  management_actor text not null,
  approval_reference text not null,
  created_at timestamptz not null default now()
);
create table reporting_private.retention_reviews (
  report_id uuid primary key references public.reports(id),
  review_version integer not null check (review_version > 0),
  decision text not null check (decision in ('retain','eligible_for_clear','cleared')),
  hold text not null check (hold in ('none','appeal','legal','investigation')),
  reason text not null check (char_length(reason) between 5 and 1000),
  next_review_at timestamptz,
  reviewed_by uuid not null,
  reviewed_at timestamptz not null default now()
);
alter table public.reports add column content_cleared_at timestamptz;
create table public.report_data_requests (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id),
  requester_id uuid not null,
  request_kind text not null check (request_kind in ('access','correction','deletion')),
  details text not null check (char_length(details) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected','fulfilled')),
  public_response text not null default '' check (char_length(public_response) <= 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index report_data_requests_owner_page_idx on public.report_data_requests(requester_id,created_at desc,id desc);
create index report_data_requests_case_idx on public.report_data_requests(report_id,status);
create table reporting_private.data_request_keys (
  requester_id uuid not null,
  request_id uuid not null,
  request_record_id uuid not null references public.report_data_requests(id),
  payload_hash text not null,
  primary key (requester_id,request_id)
);
create table reporting_private.data_request_reviews (
  request_id uuid primary key references public.report_data_requests(id),
  reviewer_id uuid not null,
  internal_reason text not null check (char_length(internal_reason) between 5 and 1000),
  approval_reference text not null default '',
  updated_at timestamptz not null default now()
);
-- No free text in immutable metadata events: sensitive current text is separately scoped.
create table reporting_private.operation_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id),
  request_id uuid references public.report_data_requests(id),
  actor_id uuid not null,
  action text not null check (action in ('data_request_submitted','data_request_under_review','data_request_approved','data_request_rejected','retention_retain','retention_eligible_for_clear','sensitive_content_cleared')),
  created_at timestamptz not null default now()
);
create index reporting_operation_events_case_idx on reporting_private.operation_events(report_id,created_at,id);
-- A transaction-local, unforgeable-to-client capability; never exposed via the API.
create table reporting_private.redaction_scope (
  backend_pid integer not null,
  transaction_id bigint not null,
  report_id uuid not null references public.reports(id),
  primary key (backend_pid,transaction_id,report_id)
);
create table reporting_private.redaction_receipts (
  report_id uuid primary key references public.reports(id),
  approval_reference text not null,
  case_kind text not null,
  case_status text not null,
  closed_month date not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table reporting_private.operations_configuration enable row level security;
alter table reporting_private.reviewer_membership_events enable row level security;
alter table reporting_private.retention_reviews enable row level security;
alter table reporting_private.data_request_keys enable row level security;
alter table reporting_private.data_request_reviews enable row level security;
alter table reporting_private.operation_events enable row level security;
alter table reporting_private.redaction_scope enable row level security;
alter table reporting_private.redaction_receipts enable row level security;
alter table public.report_data_requests enable row level security;
revoke all on all tables in schema reporting_private from public,anon,authenticated,service_role;
revoke all on public.report_data_requests from public,anon,authenticated,service_role;
grant select on public.report_data_requests to authenticated;

create function public.report_operations_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and coalesce((public.reporting_access()->>'enabled')::boolean,false)
    and coalesce((select enabled from reporting_private.operations_configuration where singleton),false);
$$;
revoke all on function public.report_operations_access() from public,anon,service_role;
grant execute on function public.report_operations_access() to authenticated;
create policy report_data_request_owner_or_reviewer on public.report_data_requests for select to authenticated
using ((select public.report_operations_access()) and
  (requester_id=(select auth.uid()) or (public.reporting_access()->>'reviewer')::boolean));

create function reporting_private.set_reviewer(p_user_id uuid,p_enabled boolean,p_approval_reference text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare changed_rows integer;
begin
  if current_user <> 'postgres' then raise exception using errcode='42501',message='management_only'; end if;
  if p_enabled is null or p_approval_reference is null or p_approval_reference !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{4,119}$' then
    raise exception using errcode='22023',message='approval_reference_required';
  end if;
  if not exists(select 1 from auth.users where id=p_user_id and confirmed_at is not null and deleted_at is null and not is_anonymous) then
    raise exception using errcode='22023',message='verified_existing_user_required';
  end if;
  if p_enabled then
    insert into reporting_private.reviewers(user_id) values(p_user_id) on conflict do nothing;
  else
    delete from reporting_private.reviewers where user_id=p_user_id;
  end if;
  get diagnostics changed_rows = row_count;
  insert into reporting_private.reviewer_membership_events(user_id,granted,changed,management_actor,approval_reference)
    values(p_user_id,p_enabled,changed_rows>0,session_user,p_approval_reference);
  return jsonb_build_object('granted',p_enabled,'changed',changed_rows>0);
end;
$$;

create function public.submit_report_data_request(p_report_id uuid,p_request_id uuid,p_kind text,p_details text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); existing reporting_private.data_request_keys%rowtype;
  body text:=btrim(coalesce(p_details,'')); digest text; new_id uuid; locked_report public.reports%rowtype;
begin
  if not public.report_operations_access() then raise exception using errcode='42501',message='report_operations_forbidden'; end if;
  if p_request_id is null or p_kind is null or p_kind not in ('access','correction','deletion') or char_length(body) not between 10 and 1000 then
    raise exception using errcode='22023',message='report_invalid_input';
  end if;
  -- Serialize against management redaction BEFORE reading ownership or inserting text.
  select * into locked_report from public.reports where id=p_report_id for key share;
  if not found or locked_report.reporter_id<>actor or locked_report.content_cleared_at is not null then
    raise exception using errcode='42501',message='report_operations_forbidden';
  end if;
  digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(jsonb_build_object('report_id',p_report_id,'kind',p_kind,'details',body)::text,'UTF8')),'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,30));
  select * into existing from reporting_private.data_request_keys where requester_id=actor and request_id=p_request_id;
  if found then
    if existing.payload_hash<>digest then raise exception using errcode='PT409',message='report_request_conflict'; end if;
    return existing.request_record_id;
  end if;
  if (select count(*) from public.report_data_requests where requester_id=actor and created_at>now()-interval '1 day')>=5 then
    raise exception using errcode='P0001',message='report_rate_limited';
  end if;
  insert into public.report_data_requests(report_id,requester_id,request_kind,details) values(p_report_id,actor,p_kind,body) returning id into new_id;
  insert into reporting_private.data_request_keys values(actor,p_request_id,new_id,digest);
  insert into reporting_private.operation_events(report_id,request_id,actor_id,action) values(p_report_id,new_id,actor,'data_request_submitted');
  return new_id;
end;
$$;

create function public.record_report_retention(p_report_id uuid,p_expected_case_version integer,p_expected_review_version integer,p_decision text,p_hold text,p_reason text,p_next_review_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.reports%rowtype; r reporting_private.retention_reviews%rowtype; new_version integer;
begin
  if not public.report_operations_access() or not coalesce((public.reporting_access()->>'reviewer')::boolean,false) then
    raise exception using errcode='42501',message='report_review_forbidden';
  end if;
  if p_decision is null or p_decision not in ('retain','eligible_for_clear') or p_hold is null or p_hold not in ('none','appeal','legal','investigation')
    or char_length(btrim(coalesce(p_reason,''))) not between 5 and 1000 or p_next_review_at is null
    or p_next_review_at<=now() or p_next_review_at>now()+interval '366 days' then
    raise exception using errcode='22023',message='report_invalid_input';
  end if;
  select * into c from public.reports where id=p_report_id for update;
  if not found or c.content_cleared_at is not null then raise exception using errcode='22023',message='report_not_found'; end if;
  select * into r from reporting_private.retention_reviews where report_id=p_report_id for update;
  if p_expected_case_version is distinct from c.version or p_expected_review_version is distinct from coalesce(r.review_version,0) then
    raise exception using errcode='PT409',message='report_review_conflict';
  end if;
  if p_decision='eligible_for_clear' and (c.status not in ('resolved','dismissed') or c.updated_at>now()-interval '90 days' or p_hold<>'none') then
    raise exception using errcode='22023',message='retention_not_eligible';
  end if;
  new_version:=coalesce(r.review_version,0)+1;
  insert into reporting_private.retention_reviews(report_id,review_version,decision,hold,reason,next_review_at,reviewed_by)
    values(p_report_id,new_version,p_decision,p_hold,btrim(p_reason),p_next_review_at,auth.uid())
    on conflict(report_id) do update set review_version=excluded.review_version,decision=excluded.decision,hold=excluded.hold,
      reason=excluded.reason,next_review_at=excluded.next_review_at,reviewed_by=excluded.reviewed_by,reviewed_at=clock_timestamp();
  insert into reporting_private.operation_events(report_id,actor_id,action) values(p_report_id,auth.uid(),'retention_'||p_decision);
  return jsonb_build_object('review_version',new_version,'decision',p_decision,'next_review_at',p_next_review_at);
end;
$$;

create function public.review_report_data_request(p_request_id uuid,p_expected_version integer,p_next_status text,p_public_response text,p_internal_reason text,p_approval_reference text)
returns integer language plpgsql security definer set search_path = '' as $$
declare r public.report_data_requests%rowtype; c public.reports%rowtype;
begin
  if not public.report_operations_access() or not coalesce((public.reporting_access()->>'reviewer')::boolean,false) then
    raise exception using errcode='42501',message='report_review_forbidden';
  end if;
  if p_next_status is null or p_next_status not in ('under_review','approved','rejected')
    or char_length(btrim(coalesce(p_internal_reason,''))) not between 5 and 1000
    or char_length(coalesce(p_public_response,''))>2000
    or (p_next_status in ('approved','rejected') and char_length(btrim(coalesce(p_public_response,'')))=0)
    or (coalesce(p_approval_reference,'')<>'' and p_approval_reference !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{4,119}$')
    or (p_next_status='approved' and coalesce(p_approval_reference,'')='') then
    raise exception using errcode='22023',message='report_invalid_input';
  end if;
  -- Consistent lock order with redaction: report, then request.
  select c0.* into c from public.reports c0 join public.report_data_requests q on q.report_id=c0.id where q.id=p_request_id for update of c0;
  if not found or c.content_cleared_at is not null then raise exception using errcode='22023',message='report_not_found'; end if;
  select * into r from public.report_data_requests where id=p_request_id for update;
  if p_expected_version is distinct from r.version then raise exception using errcode='PT409',message='report_review_conflict'; end if;
  if not ((r.status='pending' and p_next_status='under_review') or (r.status='under_review' and p_next_status in ('approved','rejected'))) then
    raise exception using errcode='22023',message='report_invalid_transition';
  end if;
  update public.report_data_requests set status=p_next_status,public_response=btrim(coalesce(p_public_response,'')),version=version+1,updated_at=clock_timestamp() where id=r.id;
  insert into reporting_private.data_request_reviews(request_id,reviewer_id,internal_reason,approval_reference)
    values(r.id,auth.uid(),btrim(p_internal_reason),coalesce(p_approval_reference,'')) on conflict(request_id) do update
    set reviewer_id=excluded.reviewer_id,internal_reason=excluded.internal_reason,approval_reference=excluded.approval_reference,updated_at=clock_timestamp();
  insert into reporting_private.operation_events(report_id,request_id,actor_id,action) values(r.report_id,r.id,auth.uid(),'data_request_'||p_next_status);
  return r.version+1;
end;
$$;

create function public.report_operations_overview(p_case_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare due_rows jsonb; selected_row jsonb; request_rows jsonb; policy jsonb;
begin
  if not public.report_operations_access() or not coalesce((public.reporting_access()->>'reviewer')::boolean,false) then
    raise exception using errcode='42501',message='report_review_forbidden';
  end if;
  select coalesce(jsonb_agg(x order by x.updated_at,x.id),'[]'::jsonb) into due_rows from (
    select c.id,c.kind,c.status,c.version,c.created_at,c.updated_at,coalesce(r.review_version,0) review_version,
      r.decision,coalesce(r.hold,'none') hold,coalesce(r.reason,'') reason,r.next_review_at,c.content_cleared_at cleared_at
    from public.reports c left join reporting_private.retention_reviews r on r.report_id=c.id
    where c.content_cleared_at is null and (r.next_review_at is null or r.next_review_at<=now())
      and ((c.status in ('resolved','dismissed') and c.updated_at<=now()-interval '90 days')
        or (c.status in ('pending','under_review') and c.updated_at<=now()-interval '30 days'))
    order by c.updated_at,c.id limit 20
  )x;
  select to_jsonb(x) into selected_row from (
    select c.id,c.kind,c.status,c.version,c.created_at,c.updated_at,coalesce(r.review_version,0) review_version,
      r.decision,coalesce(r.hold,'none') hold,coalesce(r.reason,'') reason,r.next_review_at,c.content_cleared_at cleared_at
    from public.reports c left join reporting_private.retention_reviews r on r.report_id=c.id where c.id=p_case_id
  )x;
  select coalesce(jsonb_agg(x order by x.created_at desc,x.id desc),'[]'::jsonb) into request_rows from (
    select q.id,q.report_id,q.request_kind,q.details,q.status,q.public_response,q.version,q.created_at,q.updated_at,
      coalesce(r.internal_reason,'') internal_reason,coalesce(r.approval_reference,'') approval_reference
    from public.report_data_requests q left join reporting_private.data_request_reviews r on r.request_id=q.id
    order by q.created_at desc,q.id desc limit 20
  )x;
  select jsonb_build_object('policy_approved',policy_approved,'policy_version',policy_version) into policy
    from reporting_private.operations_configuration where singleton;
  return jsonb_build_object('retention',due_rows,'selected',selected_row,'requests',request_rows,'policy',policy);
end;
$$;

create function public.report_operations_history(p_report_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.report_operations_access() or not coalesce((public.reporting_access()->>'reviewer')::boolean,false) then
    raise exception using errcode='42501',message='report_review_forbidden';
  end if;
  return coalesce((select jsonb_agg(x order by x.created_at,x.id) from
    (select id,action,actor_id,created_at from reporting_private.operation_events where report_id=p_report_id order by created_at desc,id desc limit 100)x),'[]'::jsonb);
end;
$$;

-- Original audit identity/order/state/time remain immutable. Only a management-owned
-- case+transaction capability permits the exact, approved de-identification below.
create or replace function reporting_private.append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op='UPDATE' and tg_table_schema='reporting_private' and tg_table_name in ('review_events','operation_events') then
    if current_user='postgres' and exists(select 1 from reporting_private.redaction_scope
      where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.txid_current() and report_id=old.report_id) then
      if tg_table_name='review_events' then
        if (to_jsonb(new)-array['actor_id','decision_reason','internal_note'])=(to_jsonb(old)-array['actor_id','decision_reason','internal_note'])
          and new.actor_id='00000000-0000-0000-0000-000000000000'::uuid and new.decision_reason='retention_redacted' and new.internal_note='' then return new; end if;
      elsif tg_table_name='operation_events' then
        if (to_jsonb(new)-'actor_id')=(to_jsonb(old)-'actor_id') and new.actor_id='00000000-0000-0000-0000-000000000000'::uuid then return new; end if;
      end if;
    end if;
  end if;
  raise exception using errcode='42501',message='report_audit_immutable';
end;
$$;
create trigger reporting_membership_immutable before update or delete on reporting_private.reviewer_membership_events
for each row execute function reporting_private.append_only();
create trigger reporting_operations_immutable before update or delete on reporting_private.operation_events
for each row execute function reporting_private.append_only();
create trigger reporting_receipts_immutable before update or delete on reporting_private.redaction_receipts
for each row execute function reporting_private.append_only();
create trigger data_requests_no_delete before delete on public.report_data_requests
for each row execute function reporting_private.append_only();

create function reporting_private.redact_case(p_report_id uuid,p_expected_version integer,p_approval_reference text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.reports%rowtype; r reporting_private.retention_reviews%rowtype; receipt reporting_private.redaction_receipts%rowtype;
  audit_count integer; operation_count integer; payload_count integer; request_count integer; result jsonb;
  nil uuid:='00000000-0000-0000-0000-000000000000';
begin
  if current_user<>'postgres' then raise exception using errcode='42501',message='management_only'; end if;
  if p_approval_reference is null or p_approval_reference !~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{4,119}$'
    or not coalesce((select policy_approved from reporting_private.operations_configuration where singleton),false) then
    raise exception using errcode='42501',message='approved_policy_and_case_authorization_required';
  end if;
  select * into c from public.reports where id=p_report_id for update;
  if not found then raise exception using errcode='22023',message='report_not_found'; end if;
  select * into receipt from reporting_private.redaction_receipts where report_id=p_report_id;
  if found then
    if receipt.approval_reference<>p_approval_reference then raise exception using errcode='PT409',message='report_request_conflict'; end if;
    return receipt.result||jsonb_build_object('already_cleared',true);
  end if;
  select * into r from reporting_private.retention_reviews where report_id=p_report_id for update;
  if c.version is distinct from p_expected_version then raise exception using errcode='PT409',message='report_review_conflict'; end if;
  if c.status not in ('resolved','dismissed') or c.updated_at>now()-interval '90 days' or c.content_cleared_at is not null
    or r.decision is distinct from 'eligible_for_clear' or r.hold is distinct from 'none' then
    raise exception using errcode='22023',message='retention_not_eligible';
  end if;
  if exists(select 1 from public.report_data_requests where report_id=c.id and
    (status in ('pending','under_review') or (status='approved' and request_kind<>'deletion'))) then
    raise exception using errcode='22023',message='outstanding_data_request';
  end if;
  insert into reporting_private.redaction_scope values(pg_catalog.pg_backend_pid(),pg_catalog.txid_current(),c.id);
  update reporting_private.review_events set actor_id=nil,decision_reason='retention_redacted',internal_note='' where report_id=c.id;
  get diagnostics audit_count=row_count;
  update reporting_private.operation_events set actor_id=nil where report_id=c.id;
  get diagnostics operation_count=row_count;
  delete from reporting_private.requests where report_id=c.id;
  get diagnostics payload_count=row_count;
  delete from reporting_private.data_request_keys where request_record_id in(select id from public.report_data_requests where report_id=c.id);
  update reporting_private.data_request_reviews set reviewer_id=nil,internal_reason='retention_redacted',approval_reference='',updated_at=clock_timestamp()
    where request_id in(select id from public.report_data_requests where report_id=c.id);
  update public.report_data_requests set requester_id=nil,details='Sensitive content cleared',public_response='',
    status=case when status='approved' and request_kind='deletion' then 'fulfilled' else status end,version=version+1,updated_at=clock_timestamp() where report_id=c.id;
  get diagnostics request_count=row_count;
  update reporting_private.retention_reviews set decision='cleared',reason='retention_redacted',reviewed_by=nil,next_review_at=null,
    review_version=review_version+1,reviewed_at=clock_timestamp() where report_id=c.id;
  update public.reports set reporter_id=nil,target_id=case when target_id is null then null else nil end,
    reason='other',description='Sensitive content cleared',public_resolution='',content_cleared_at=clock_timestamp(),version=version+1 where id=c.id;
  insert into reporting_private.operation_events(report_id,actor_id,action) values(c.id,nil,'sensitive_content_cleared');
  result:=jsonb_build_object('cleared',true,'already_cleared',false,'audit_rows_redacted',audit_count,
    'operation_actors_redacted',operation_count,'idempotency_payloads_removed',payload_count,'data_requests_redacted',request_count);
  insert into reporting_private.redaction_receipts(report_id,approval_reference,case_kind,case_status,closed_month,result)
    values(c.id,p_approval_reference,c.kind,c.status,date_trunc('month',c.updated_at)::date,result);
  delete from reporting_private.redaction_scope where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.txid_current() and report_id=c.id;
  return result;
end;
$$;

revoke all on all functions in schema reporting_private from public,anon,authenticated,service_role;
revoke all on function public.submit_report_data_request(uuid,uuid,text,text),public.record_report_retention(uuid,integer,integer,text,text,text,timestamptz),
  public.review_report_data_request(uuid,integer,text,text,text,text),public.report_operations_overview(uuid),public.report_operations_history(uuid) from public,anon,service_role;
grant execute on function public.submit_report_data_request(uuid,uuid,text,text),public.record_report_retention(uuid,integer,integer,text,text,text,timestamptz),
  public.review_report_data_request(uuid,integer,text,text,text,text),public.report_operations_overview(uuid),public.report_operations_history(uuid) to authenticated;
comment on function reporting_private.redact_case(uuid,integer,text) is 'Management only; candidate policy requires explicit approval. No trigger disabling, case/audit deletion, or production scheduling. Scoped de-identification changes the original audit immutability contract and requires separate production approval.';
comment on table public.report_data_requests is 'Private access/correction/deletion request tracking. Approved is not fulfilled; real redaction alone can fulfil approved deletion. No automatic export or deletion.';
notify pgrst,'reload schema';
commit;
