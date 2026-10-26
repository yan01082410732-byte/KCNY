-- Scoped reviewer statistics only; no case/status rewrite or account seeds.
begin;
set local lock_timeout = '5s';
create function public.report_review_summary(p_kind text default null,p_reason text default null,p_older_than timestamptz default null,p_report_id uuid default null,p_as_of timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not coalesce((public.reporting_access()->>'reviewer')::boolean,false) then
    raise exception using errcode='42501',message='report_review_forbidden';
  end if;
  if (p_kind is not null and p_kind not in ('report','complaint'))
    or (p_reason is not null and p_reason not in ('spam','harassment','hate','privacy','other'))
    or p_as_of is null or p_as_of>now()+interval '1 minute'
    or p_as_of<'2000-01-01'::timestamptz
    or (p_older_than is not null and (p_older_than>p_as_of or p_older_than<'2000-01-01'::timestamptz)) then
    raise exception using errcode='22023',message='report_invalid_input';
  end if;
  select jsonb_build_object('counts',jsonb_build_object(
    'pending',count(*) filter(where c.status='pending'),
    'under_review',count(*) filter(where c.status='under_review'),
    'resolved',count(*) filter(where c.status='resolved'),
    'dismissed',count(*) filter(where c.status='dismissed')),
    'oldest_open_created_at',min(c.created_at) filter(where c.status in ('pending','under_review')))
  into result from public.reports c
  where c.created_at<=p_as_of and (p_kind is null or c.kind=p_kind)
    and (p_reason is null or c.reason=p_reason) and (p_report_id is null or c.id=p_report_id)
    and (p_older_than is null or (c.status in ('pending','under_review') and c.created_at<=p_older_than));
  return result;
end;
$$;
revoke all on function public.report_review_summary(text,text,timestamptz,uuid,timestamptz) from public,anon,service_role;
grant execute on function public.report_review_summary(text,text,timestamptz,uuid,timestamptz) to authenticated;
comment on function public.report_review_summary(text,text,timestamptz,uuid,timestamptz) is 'Fresh trusted-reviewer check; actual scoped counts, not a public aggregate. Ignores active status/cursor, respects type/reason/age/exact ID/frozen as-of. Failure must not render fake zero.';
notify pgrst,'reload schema';
commit;
