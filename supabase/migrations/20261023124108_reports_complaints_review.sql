-- Reporting contract only. No account seeds; disabled until a separate management action.
begin;
set local lock_timeout = '5s';
create schema reporting_private;
revoke all on schema reporting_private from public, anon, authenticated;

create table reporting_private.configuration (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into reporting_private.configuration values (true, false);
create table reporting_private.reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null,
  kind text not null check (kind in ('report','complaint')),
  target_type text check (target_type in ('post','comment','reply','profile')),
  target_id uuid,
  reason text not null check (reason in ('spam','harassment','hate','privacy','other')),
  description text not null check (char_length(description) <= 2000),
  status text not null default 'pending' check (status in ('pending','under_review','resolved','dismissed')),
  public_resolution text not null default '' check (char_length(public_resolution) <= 2000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((target_type is null) = (target_id is null)),
  check (kind <> 'report' or target_id is not null),
  check (kind <> 'complaint' or char_length(description) >= 10)
);
-- Intentionally no target/reporter FK: deletion must not cascade into case history.
create index reports_reporter_page_idx on public.reports(reporter_id,created_at desc,id desc);
create index reports_status_page_idx on public.reports(status,created_at desc,id desc);
create table reporting_private.requests (
  reporter_id uuid not null,
  request_id uuid not null,
  payload jsonb not null,
  report_id uuid not null references public.reports(id),
  primary key (reporter_id,request_id)
);
create table reporting_private.review_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id),
  actor_id uuid not null,
  from_status text,
  to_status text not null,
  decision_reason text not null check (char_length(decision_reason) between 1 and 2000),
  internal_note text not null default '' check (char_length(internal_note) <= 4000),
  created_at timestamptz not null default now()
);
create index report_events_case_idx on reporting_private.review_events(report_id,created_at,id);
alter table public.reports enable row level security;
alter table reporting_private.configuration enable row level security;
alter table reporting_private.reviewers enable row level security;
alter table reporting_private.requests enable row level security;
alter table reporting_private.review_events enable row level security;
revoke all on public.reports from public,anon,authenticated;
grant select on public.reports to authenticated;
revoke all on all tables in schema reporting_private from public,anon,authenticated;

create function public.reporting_access() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'enabled',auth.uid() is not null and coalesce((select enabled from reporting_private.configuration where singleton),false),
    'reviewer',auth.uid() is not null and coalesce((select enabled from reporting_private.configuration where singleton),false)
      and exists(select 1 from reporting_private.reviewers where user_id=auth.uid()));
$$;
revoke all on function public.reporting_access() from public,anon;
grant execute on function public.reporting_access() to authenticated;
create policy report_owner_or_reviewer_read on public.reports for select to authenticated
using ((public.reporting_access()->>'enabled')::boolean and
  (reporter_id=(select auth.uid()) or (public.reporting_access()->>'reviewer')::boolean));

create function reporting_private.append_only() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception using errcode='42501',message='report_audit_immutable'; end;
$$;
create trigger report_events_immutable before update or delete on reporting_private.review_events
for each row execute function reporting_private.append_only();
create trigger reports_no_delete before delete on public.reports
for each row execute function reporting_private.append_only();

create function public.submit_report(p_request_id uuid,p_kind text,p_target_type text,p_target_ref text,p_reason text,p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); old_request reporting_private.requests%rowtype;
  payload jsonb; resolved_target uuid; parent_id uuid; case_id uuid;
  description text := btrim(coalesce(p_description,''));
begin
  if actor is null then raise exception using errcode='42501',message='report_login_required'; end if;
  if not coalesce((public.reporting_access()->>'enabled')::boolean,false) then raise exception using errcode='42501',message='report_disabled'; end if;
  if p_request_id is null or p_kind is null or p_kind not in ('report','complaint') or p_reason is null or p_reason not in ('spam','harassment','hate','privacy','other')
    or char_length(description)>2000 or (p_kind='complaint' and char_length(description)<10)
    or (p_kind='report' and (p_target_type is null or nullif(p_target_ref,'') is null))
    or ((p_target_type is null) <> (nullif(p_target_ref,'') is null))
    or (p_target_type is not null and p_target_type not in ('post','comment','reply','profile')) then
    raise exception using errcode='22023',message='report_invalid_input';
  end if;
  payload := jsonb_build_object('kind',p_kind,'target_type',p_target_type,'target_ref',nullif(p_target_ref,''),'reason',p_reason,'description',description);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,19));
  select * into old_request from reporting_private.requests where reporter_id=actor and request_id=p_request_id;
  if found then
    if old_request.payload is distinct from payload then raise exception using errcode='22023',message='report_request_conflict'; end if;
    return old_request.report_id;
  end if;
  if (select count(*) from public.reports where reporter_id=actor and created_at>now()-interval '1 hour')>=10 then
    raise exception using errcode='P0001',message='report_rate_limited';
  end if;
  -- Current posts/comments/profiles have public SELECT policies. No private-content snapshot is retained.
  if p_target_type='profile' then
    select id into resolved_target from public.profiles where username=p_target_ref;
  elsif p_target_type='post' then
    select id into resolved_target from public.posts where id::text=p_target_ref;
  elsif p_target_type in ('comment','reply') then
    select c.id,c.parent_comment_id into resolved_target,parent_id from public.comments c
      join public.posts p on p.id=c.post_id where c.id::text=p_target_ref;
    if (p_target_type='comment' and parent_id is not null) or (p_target_type='reply' and parent_id is null) then resolved_target:=null; end if;
  end if;
  if p_target_type is not null and resolved_target is null then raise exception using errcode='22023',message='report_invalid_target'; end if;
  insert into public.reports(reporter_id,kind,target_type,target_id,reason,description)
    values(actor,p_kind,p_target_type,resolved_target,p_reason,description) returning id into case_id;
  insert into reporting_private.requests values(actor,p_request_id,payload,case_id);
  insert into reporting_private.review_events(report_id,actor_id,from_status,to_status,decision_reason)
    values(case_id,actor,null,'pending','submitted');
  return case_id;
end;
$$;

create function public.review_report(p_report_id uuid,p_expected_version integer,p_next_status text,p_public_resolution text,p_decision_reason text,p_internal_note text)
returns integer language plpgsql security definer set search_path = '' as $$
declare old_case public.reports%rowtype; actor uuid:=auth.uid();
begin
  if not coalesce((public.reporting_access()->>'reviewer')::boolean,false) then raise exception using errcode='42501',message='report_review_forbidden'; end if;
  if p_next_status is null or p_next_status not in ('under_review','resolved','dismissed')
    or char_length(btrim(coalesce(p_decision_reason,''))) not between 1 and 2000
    or char_length(coalesce(p_internal_note,''))>4000 or char_length(coalesce(p_public_resolution,''))>2000
    or (p_next_status in ('resolved','dismissed') and char_length(btrim(coalesce(p_public_resolution,'')))=0) then
    raise exception using errcode='22023',message='report_invalid_input';
  end if;
  select * into old_case from public.reports where id=p_report_id for update;
  if not found then raise exception using errcode='22023',message='report_not_found'; end if;
  if p_expected_version is null or old_case.version<>p_expected_version then raise exception using errcode='40001',message='report_review_conflict'; end if;
  if not ((old_case.status='pending' and p_next_status='under_review') or (old_case.status='under_review' and p_next_status in ('resolved','dismissed'))) then
    raise exception using errcode='22023',message='report_invalid_transition';
  end if;
  update public.reports set status=p_next_status,public_resolution=btrim(coalesce(p_public_resolution,'')),version=version+1,updated_at=clock_timestamp() where id=p_report_id;
  insert into reporting_private.review_events(report_id,actor_id,from_status,to_status,decision_reason,internal_note)
    values(p_report_id,actor,old_case.status,p_next_status,btrim(p_decision_reason),coalesce(p_internal_note,''));
  return old_case.version+1;
end;
$$;

create function public.report_review_history(p_report_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce((public.reporting_access()->>'reviewer')::boolean,false) then raise exception using errcode='42501',message='report_review_forbidden'; end if;
  return coalesce((select jsonb_agg(x order by x.created_at,x.id) from
    (select id,actor_id,from_status,to_status,decision_reason,internal_note,created_at from reporting_private.review_events where report_id=p_report_id)x),'[]'::jsonb);
end;
$$;
revoke all on function public.submit_report(uuid,text,text,text,text,text),public.review_report(uuid,integer,text,text,text,text),public.report_review_history(uuid) from public,anon;
grant execute on function public.submit_report(uuid,text,text,text,text,text),public.review_report(uuid,integer,text,text,text,text),public.report_review_history(uuid) to authenticated;
revoke all on all functions in schema reporting_private from public,anon,authenticated;
comment on table public.reports is 'Private cases. Public resolution only; internal notes and reviewer identity are separate.';
comment on function public.review_report(uuid,integer,text,text,text,text) is 'Atomic human review and append-only audit; never deletes content or bans users.';
commit;
