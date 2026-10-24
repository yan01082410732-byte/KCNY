-- TASK 021: private single-image lifecycle. No posts image_path column.
create schema media_private;
revoke all on schema media_private from public,anon,authenticated;
create table media_private.configuration(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into media_private.configuration values(true,false);
create table media_private.slots(post_id uuid primary key,version integer not null default 0,upload_id uuid);
create table media_private.uploads(
 id uuid primary key,owner_id uuid not null,post_id uuid not null,request_id uuid not null,
 claimed_mime text not null check(claimed_mime in ('image/jpeg','image/png','image/webp')),
 expected_version integer not null check(expected_version>=0),stage_path text not null unique,final_path text not null unique,
 state text not null default 'pending' check(state in ('pending','processing','ready','rejected','stale')),
 lease uuid,lease_until timestamptz,expires_at timestamptz not null default now()+interval '3 hours',
 bytes integer,width integer,height integer,sha256 text,created_at timestamptz not null default now(),
 unique(owner_id,request_id)
);
create index media_upload_owner_time on media_private.uploads(owner_id,created_at);
create index media_upload_post on media_private.uploads(post_id);
create table media_private.cleanup(
 id uuid primary key default gen_random_uuid(),upload_id uuid not null references media_private.uploads(id),
 owner_id uuid not null,bucket text not null check(bucket in ('kcny-post-staging','kcny-post-images')),path text not null,
 not_before timestamptz not null,status text not null default 'pending' check(status in ('pending','deleting','done')),
 lease uuid,lease_until timestamptz,attempts integer not null default 0,last_error text,
 unique(bucket,path)
);
create index media_cleanup_due on media_private.cleanup(owner_id,not_before) where status<>'done';
create table media_private.creations(owner_id uuid not null,request_id uuid not null,payload jsonb not null,post_id uuid not null,created_at timestamptz not null default now(),primary key(owner_id,request_id));
create table media_private.removals(owner_id uuid not null,request_id uuid not null,payload jsonb not null,result jsonb not null,primary key(owner_id,request_id));
alter table media_private.configuration enable row level security;
alter table media_private.slots enable row level security;
alter table media_private.uploads enable row level security;
alter table media_private.cleanup enable row level security;
alter table media_private.creations enable row level security;
alter table media_private.removals enable row level security;
revoke all on all tables in schema media_private from public,anon,authenticated;

-- Storage keeps control of its schema. These are new module-owned bucket rows/policies only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('kcny-post-staging','kcny-post-staging',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('kcny-post-images','kcny-post-images',false,5242880,array['image/webp']);
-- Signed upload/download capabilities are issued only by the authenticated trusted worker.
-- No ordinary direct access, listing, upsert, move, deletion, or raw staging read.
create policy kcny_media_direct_access_denied on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id not in ('kcny-post-staging','kcny-post-images'))
 with check(bucket_id not in ('kcny-post-staging','kcny-post-images'));

create function media_private.enqueue(p_upload media_private.uploads,p_final boolean,p_when timestamptz) returns void
language sql security definer set search_path='' as $$
 insert into media_private.cleanup(upload_id,owner_id,bucket,path,not_before)
 values(p_upload.id,p_upload.owner_id,case when p_final then 'kcny-post-images' else 'kcny-post-staging' end,
 case when p_final then p_upload.final_path else p_upload.stage_path end,p_when)
 on conflict(bucket,path) do update set not_before=greatest(media_private.cleanup.not_before,excluded.not_before);
$$;
create function media_private.post_deleted() returns trigger language plpgsql security definer set search_path='' as $$
declare u media_private.uploads;
begin
 for u in select * from media_private.uploads where post_id=old.id loop
  perform media_private.enqueue(u,false,u.expires_at);
  perform media_private.enqueue(u,true,now()+interval '2 minutes');
 end loop;
 update media_private.uploads set state='stale',lease=null,lease_until=null where post_id=old.id;
 update media_private.slots set upload_id=null,version=version+1 where post_id=old.id;
 return old;
end;$$;
create trigger kcny_media_post_deleted before delete on public.posts for each row execute function media_private.post_deleted();

-- Idempotent creation uses the REAL authenticated caller, not a client-supplied owner.
create function public.media_create_post(p_request_id uuid,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); old_request media_private.creations; new_id uuid;
begin
 if actor is null then raise sqlstate 'PT401' using message='authentication_required'; end if;
 if not exists(select 1 from media_private.configuration where enabled) then raise sqlstate 'PT403' using message='media_disabled'; end if;
 if p_request_id is null or jsonb_typeof(p_payload)<>'object' or p_payload-array['title','content','category','language']<>'{}'::jsonb or length(btrim(coalesce(p_payload->>'title',''))) not between 1 and 120
 or length(btrim(coalesce(p_payload->>'content',''))) not between 1 and 5000
 or coalesce(p_payload->>'category','') not in ('culture','language','travel','study','daily','other')
 or coalesce(p_payload->>'language','') not in ('CN','KR') then raise sqlstate 'PT400' using message='invalid_post'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,21));
 select * into old_request from media_private.creations where owner_id=actor and request_id=p_request_id;
 if found then
  if old_request.payload<>p_payload then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
  if not exists(select 1 from public.posts where id=old_request.post_id and author_id=actor) then raise sqlstate 'PT409' using message='post_deleted'; end if;
  return old_request.post_id;
 end if;
 if (select count(*) from media_private.creations where owner_id=actor and created_at>now()-interval '10 minutes')>=20 then raise sqlstate 'PT429' using message='rate_limited'; end if;
 insert into public.posts(author_id,title,content,category,language) values(actor,btrim(p_payload->>'title'),btrim(p_payload->>'content'),p_payload->>'category',p_payload->>'language') returning id into new_id;
 insert into media_private.creations values(actor,p_request_id,p_payload,new_id,now());
 return new_id;
end;$$;
revoke all on function public.media_create_post(uuid,jsonb) from public,anon;
grant execute on function public.media_create_post(uuid,jsonb) to authenticated;

-- Worker-only API: p_actor MUST come from a verified Auth user in the worker.
-- No ordinary client can grant itself validation or call lifecycle mutations.
create function public.media_service(p_operation text,p_actor uuid,p_request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u media_private.uploads; old_u media_private.uploads; s media_private.slots; task media_private.cleanup;
 post_key uuid; request_key uuid; expected integer; lease_key uuid; result jsonb; old_remove media_private.removals;
begin
 if auth.role() is distinct from 'service_role' then raise sqlstate 'PT403' using message='worker_only'; end if;
 if p_operation='read' then
  return coalesce((select jsonb_agg(jsonb_build_object('postId',s.post_id,'path',u.final_path,'version',s.version,'width',u.width,'height',u.height))
   from media_private.slots s join media_private.uploads u on u.id=s.upload_id and u.state='ready'
   join public.posts p on p.id=s.post_id
   where s.post_id in (select value::uuid from jsonb_array_elements_text(p_request->'ids'))),'[]'::jsonb);
 end if;
 if p_actor is null then raise sqlstate 'PT401' using message='authentication_required'; end if;
 if p_operation not in ('cleanup_claim','cleanup_ack','status') and not exists(select 1 from media_private.configuration where enabled) then raise sqlstate 'PT403' using message='media_disabled'; end if;
 if p_operation='cleanup_ack' then
  select * into task from media_private.cleanup where id=(p_request->>'id')::uuid and owner_id=p_actor for update;
  if not found or task.status<>'deleting' or task.lease is distinct from (p_request->>'lease')::uuid then raise sqlstate 'PT409' using message='cleanup_conflict'; end if;
  update media_private.cleanup set status=case when p_request->>'success'='true' then 'done' else 'pending' end,
   not_before=case when p_request->>'success'='true' then not_before else now()+interval '1 minute' end,
   last_error=case when p_request->>'success'='true' then null else 'storage_delete_failed' end,lease=null,lease_until=null where id=task.id;
  return jsonb_build_object('acknowledged',true);
 end if;
 if p_operation='cleanup_claim' then
  for u in select * from media_private.uploads where owner_id=p_actor and expires_at<now() and state in ('pending','rejected','processing') and coalesce(lease_until,'-infinity')<now() order by expires_at,id limit 20 for update skip locked loop
   update media_private.uploads set state='rejected',lease=null,lease_until=null where id=u.id;
   perform media_private.enqueue(u,false,u.expires_at); perform media_private.enqueue(u,true,now());
  end loop;
  result:='[]'::jsonb;
  for task in select c.* from media_private.cleanup c join media_private.uploads x on x.id=c.upload_id
   where c.owner_id=p_actor and c.not_before<=now() and (c.status='pending' or (c.status='deleting' and c.lease_until<now()))
   and x.state<>'processing'
   and (c.bucket='kcny-post-staging' or not exists(select 1 from media_private.slots a join public.posts p on p.id=a.post_id where a.upload_id=x.id))
   order by c.not_before,c.id limit 20 for update of c skip locked loop
   lease_key:=gen_random_uuid();
   update media_private.cleanup set status='deleting',lease=lease_key,lease_until=now()+interval '2 minutes',attempts=attempts+1 where id=task.id;
   result:=result||jsonb_build_array(jsonb_build_object('id',task.id,'lease',lease_key,'bucket',task.bucket,'path',task.path));
  end loop;
  return result;
 end if;
 if p_operation in ('begin','finish','reject') then
  select * into u from media_private.uploads where id=(p_request->>'uploadId')::uuid and owner_id=p_actor;
  if not found then raise sqlstate 'PT404' using message='upload_not_found'; end if;
  post_key:=u.post_id;
 else post_key:=(p_request->>'postId')::uuid;
 end if;
 -- Lock ordering is post -> slot -> upload for reserve/finalize/remove/delete.
 perform 1 from public.posts where id=post_key and author_id=p_actor for update;
 if not found then raise sqlstate 'PT404' using message='post_not_owned'; end if;
 insert into media_private.slots(post_id) values(post_key) on conflict do nothing;
 select * into s from media_private.slots where post_id=post_key for update;
 if p_operation='status' then return jsonb_build_object('postId',post_key,'version',s.version,'imageId',s.upload_id); end if;
 if p_operation='reserve' then
  request_key:=(p_request->>'requestId')::uuid; expected:=(p_request->>'expectedVersion')::integer;
  if request_key is null or expected is null or expected<0 or coalesce(p_request->>'mime','') not in ('image/jpeg','image/png','image/webp') then raise sqlstate 'PT400' using message='invalid_upload'; end if;
  select * into u from media_private.uploads where owner_id=p_actor and request_id=request_key for update;
  if found then
   if u.post_id<>post_key or u.expected_version<>expected or u.claimed_mime<>p_request->>'mime' then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
   if u.state='pending' then
    update media_private.uploads set expires_at=now()+interval '3 hours' where id=u.id returning * into u;
   end if;
   return to_jsonb(u)||jsonb_build_object('version',s.version);
  end if;
  if s.version<>expected then raise sqlstate 'PT409' using message='image_conflict'; end if;
  if (select count(*) from media_private.uploads where owner_id=p_actor and created_at>now()-interval '10 minutes')>=30
  or (select count(*) from media_private.uploads where owner_id=p_actor and state in ('pending','processing') and expires_at>now())>=5 then raise sqlstate 'PT429' using message='rate_limited'; end if;
  lease_key:=gen_random_uuid();
  insert into media_private.uploads(id,owner_id,post_id,request_id,claimed_mime,expected_version,stage_path,final_path)
   values(lease_key,p_actor,post_key,request_key,p_request->>'mime',expected,
    p_actor::text||'/'||post_key::text||'/'||lease_key::text||'/original',p_actor::text||'/'||post_key::text||'/'||lease_key::text||'.webp') returning * into u;
  return to_jsonb(u)||jsonb_build_object('version',s.version);
 end if;
 if p_operation='remove' then
  request_key:=(p_request->>'requestId')::uuid;
  if request_key is null then raise sqlstate 'PT400' using message='invalid_request'; end if;
  select * into old_remove from media_private.removals where owner_id=p_actor and request_id=request_key;
  if found then
   if old_remove.payload<>p_request then raise sqlstate 'PT409' using message='idempotency_conflict'; end if;
   return old_remove.result;
  end if;
  if s.version is distinct from (p_request->>'expectedVersion')::integer then raise sqlstate 'PT409' using message='image_conflict'; end if;
  if s.upload_id is not null then
   select * into old_u from media_private.uploads where id=s.upload_id for update;
   update media_private.uploads set state='stale' where id=old_u.id;
   perform media_private.enqueue(old_u,true,now()+interval '2 minutes');
  end if;
  update media_private.slots set upload_id=null,version=version+1 where post_id=post_key returning * into s;
  result:=jsonb_build_object('version',s.version,'imageId',null);
  insert into media_private.removals values(p_actor,request_key,p_request,result);
  return result;
 end if;
 select * into u from media_private.uploads where id=u.id for update;
 if p_operation='begin' then
  if u.state='ready' and s.upload_id=u.id then return to_jsonb(u)||jsonb_build_object('version',s.version); end if;
  if u.state<>'pending' and not(u.state='processing' and u.lease_until<now()) then raise sqlstate 'PT409' using message='upload_busy_or_closed'; end if;
  if u.expires_at<now() or s.version<>u.expected_version then raise sqlstate 'PT409' using message='image_conflict'; end if;
  lease_key:=gen_random_uuid();
  update media_private.uploads set state='processing',lease=lease_key,lease_until=now()+interval '2 minutes' where id=u.id returning * into u;
  return to_jsonb(u);
 end if;
 if p_operation='reject' then
  if u.state='processing' and u.lease=(p_request->>'lease')::uuid then
   update media_private.uploads set state='rejected',lease=null,lease_until=null where id=u.id;
   perform media_private.enqueue(u,false,u.expires_at);perform media_private.enqueue(u,true,now());
  end if;
  return jsonb_build_object('rejected',true);
 end if;
 if p_operation='finish' then
  if u.state<>'processing' or u.lease is distinct from (p_request->>'lease')::uuid or u.lease_until<now() or s.version<>u.expected_version then raise sqlstate 'PT409' using message='image_conflict'; end if;
  if coalesce((p_request->>'bytes')::integer,0) not between 1 and 5242880 or coalesce((p_request->>'width')::integer,0) not between 1 and 2048 or coalesce((p_request->>'height')::integer,0) not between 1 and 2048
    or coalesce(p_request->>'sha256','') !~ '^[a-f0-9]{64}$' then raise sqlstate 'PT400' using message='invalid_validated_image'; end if;
  if not exists(select 1 from storage.objects where bucket_id='kcny-post-images' and name=u.final_path) then raise sqlstate 'PT409' using message='validated_object_missing'; end if;
  if s.upload_id is not null then
   select * into old_u from media_private.uploads where id=s.upload_id for update;
   update media_private.uploads set state='stale' where id=old_u.id;
   perform media_private.enqueue(old_u,true,now()+interval '2 minutes');
  end if;
  update media_private.uploads set state='ready',lease=null,lease_until=null,bytes=(p_request->>'bytes')::integer,width=(p_request->>'width')::integer,height=(p_request->>'height')::integer,sha256=p_request->>'sha256' where id=u.id;
  update media_private.slots set upload_id=u.id,version=version+1 where post_id=post_key returning * into s;
  perform media_private.enqueue(u,false,u.expires_at);
  return jsonb_build_object('imageId',u.id,'version',s.version);
 end if;
 raise sqlstate 'PT400' using message='invalid_operation';
end;$$;
revoke all on function public.media_service(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.media_service(text,uuid,jsonb) to service_role;
revoke all on all functions in schema media_private from public,anon,authenticated;
