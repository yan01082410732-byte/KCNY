-- TASK 022. Preserve the two applied TASK 021 migrations. No seeds or schedules.
create function public.media_operation_outcome(p_actor uuid,p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u media_private.uploads; r media_private.removals; v integer;
begin
 if auth.role() is distinct from 'service_role' or p_actor is null then raise sqlstate 'PT403' using message='worker_only'; end if;
 if p_request->>'kind'='remove' then
  select * into r from media_private.removals where owner_id=p_actor and request_id=(p_request->>'requestId')::uuid;
  if found then return jsonb_build_object('state','committed','result',r.result); end if;
  return jsonb_build_object('state','unknown');
 elsif p_request->>'kind'='finalize' then
  select * into u from media_private.uploads where id=(p_request->>'uploadId')::uuid and owner_id=p_actor;
  if not found then raise sqlstate 'PT404' using message='upload_not_found'; end if;
  select s.version into v from media_private.slots s join public.posts p on p.id=s.post_id where s.upload_id=u.id and u.state='ready';
  if found then return jsonb_build_object('state','committed','result',jsonb_build_object('imageId',u.id,'version',v)); end if;
  -- A superseded/deleted image or an in-flight commit cannot be called successful.
  return jsonb_build_object('state',case when u.state='rejected' then 'not_committed' else 'unknown' end);
 end if;
 raise sqlstate 'PT400' using message='invalid_operation';
end;$$;
revoke all on function public.media_operation_outcome(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.media_operation_outcome(uuid,jsonb) to service_role;

-- Management discovery is independent of user login; ordinary clients have no EXECUTE.
-- Keyset pagination plus a strict batch limit; restart a sweep at NULL periodically.
create function public.media_maintenance_candidates(p_after uuid default null,p_limit integer default 20)
returns table(owner_id uuid) language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise sqlstate 'PT403' using message='worker_only'; end if;
 if p_limit is null or p_limit not between 1 and 20 then raise sqlstate 'PT400' using message='invalid_limit'; end if;
 return query
 select distinct candidate.owner_id from (
  select c.owner_id from media_private.cleanup c where c.not_before<=now()
   and (c.status='pending' or (c.status='deleting' and c.lease_until<now()))
  union
  select u.owner_id from media_private.uploads u where u.expires_at<now()
   and not(u.state='processing' and coalesce(u.lease_until,'-infinity')>=now())
   and (u.state in ('pending','processing')
    or (u.state='rejected' and not exists(select 1 from media_private.cleanup c where c.upload_id=u.id and c.bucket='kcny-post-staging'))
    or (u.state='ready' and not exists(select 1 from media_private.slots s join public.posts p on p.id=s.post_id where s.upload_id=u.id))
    or exists(select 1 from storage.objects o where
      (o.bucket_id='kcny-post-staging' and o.name=u.stage_path)
      or (o.bucket_id='kcny-post-images' and o.name=u.final_path and not exists(select 1 from media_private.slots s join public.posts p on p.id=s.post_id where s.upload_id=u.id))))
 ) candidate where p_after is null or candidate.owner_id>p_after order by candidate.owner_id limit p_limit;
end;$$;
revoke all on function public.media_maintenance_candidates(uuid,integer) from public,anon,authenticated;
grant execute on function public.media_maintenance_candidates(uuid,integer) to service_role;

-- Observed TASK 022 control: a delayed PUT can appear after its old job is done.
-- Reopen only exact known objects, only after upload expiry and outside a live lease.
create or replace function public.media_queue_orphans(p_actor uuid) returns integer
language plpgsql security definer set search_path='' as $$
declare item media_private.uploads; queued integer:=0; is_active boolean; bucket_name text; object_path text;
begin
 if auth.role() is distinct from 'service_role' or p_actor is null then raise sqlstate 'PT403' using message='worker_only'; end if;
 for item in select u.* from media_private.uploads u where u.owner_id=p_actor and u.expires_at<now()
  and not(u.state='processing' and coalesce(u.lease_until,'-infinity')>=now())
  and (u.state in ('pending','processing')
   or (u.state='rejected' and not exists(select 1 from media_private.cleanup c where c.upload_id=u.id and c.bucket='kcny-post-staging'))
   or (u.state='ready' and not exists(select 1 from media_private.slots s join public.posts p on p.id=s.post_id where s.upload_id=u.id))
   or exists(select 1 from storage.objects o where (o.bucket_id='kcny-post-staging' and o.name=u.stage_path)
    or (o.bucket_id='kcny-post-images' and o.name=u.final_path and not exists(select 1 from media_private.slots s join public.posts p on p.id=s.post_id where s.upload_id=u.id))))
  order by u.expires_at,u.id limit 20 for update skip locked loop
  select exists(select 1 from media_private.slots s join public.posts p on p.id=s.post_id where s.upload_id=item.id) into is_active;
  if item.state in ('pending','processing') then
   update media_private.uploads set state='rejected',lease=null,lease_until=null where id=item.id;
  elsif item.state='ready' and not is_active then
   update media_private.uploads set state='stale' where id=item.id;
  end if;
  perform media_private.enqueue(item,false,item.expires_at);
  if not is_active then perform media_private.enqueue(item,true,now()); end if;
  for bucket_name,object_path in select o.bucket_id,o.name from storage.objects o where
   (o.bucket_id='kcny-post-staging' and o.name=item.stage_path)
   or (o.bucket_id='kcny-post-images' and o.name=item.final_path and not is_active) loop
   update media_private.cleanup set status='pending',not_before=greatest(not_before,now()),lease=null,lease_until=null,last_error='late_object_observed'
    where bucket=bucket_name and path=object_path and status='done';
  end loop;
  queued:=queued+1;
 end loop;
 return queued;
end;$$;

create index media_expired_upload_discovery on media_private.uploads(expires_at,owner_id,id);
create index media_expired_cleanup_lease on media_private.cleanup(lease_until,owner_id) where status='deleting';
