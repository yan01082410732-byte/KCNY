-- Business conflicts must not use serialization_failure (40001), which PostgREST retries.
-- Preserve the original applied migration; replace only this function's conflict response.
begin;
set local lock_timeout = '5s';
create or replace function public.review_report(p_report_id uuid,p_expected_version integer,p_next_status text,p_public_resolution text,p_decision_reason text,p_internal_note text)
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
  if p_expected_version is null or old_case.version<>p_expected_version then raise sqlstate 'PT409' using message='report_review_conflict'; end if;
  if not ((old_case.status='pending' and p_next_status='under_review') or (old_case.status='under_review' and p_next_status in ('resolved','dismissed'))) then
    raise exception using errcode='22023',message='report_invalid_transition';
  end if;
  update public.reports set status=p_next_status,public_resolution=btrim(coalesce(p_public_resolution,'')),version=version+1,updated_at=clock_timestamp() where id=p_report_id;
  insert into reporting_private.review_events(report_id,actor_id,from_status,to_status,decision_reason,internal_note)
    values(p_report_id,actor,old_case.status,p_next_status,btrim(p_decision_reason),coalesce(p_internal_note,''));
  return old_case.version+1;
end;
$$;
revoke all on function public.review_report(uuid,integer,text,text,text,text) from public,anon;
grant execute on function public.review_report(uuid,integer,text,text,text,text) to authenticated;
commit;
