-- TASK 028. Default-on preferences; no existing notification or trigger rewrite.
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  post_comment boolean not null default true,
  comment_reply boolean not null default true,
  post_like boolean not null default true,
  new_follower boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated, service_role;
grant select on public.notification_preferences to authenticated;
grant insert (user_id, post_comment, comment_reply, post_like, new_follower)
  on public.notification_preferences to authenticated;
grant update (post_comment, comment_reply, post_like, new_follower)
  on public.notification_preferences to authenticated;
create policy notification_preferences_read_own on public.notification_preferences
  for select to authenticated using (
    user_id = (select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true'
  );
create policy notification_preferences_insert_own on public.notification_preferences
  for insert to authenticated with check (
    user_id = (select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true'
  );
create policy notification_preferences_update_own on public.notification_preferences
  for update to authenticated using (
    user_id = (select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true'
  ) with check (
    user_id = (select auth.uid()) and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true'
  );

create schema notification_private;
revoke all on schema notification_private from public, anon, authenticated, service_role;
create function notification_private.touch_preferences() returns trigger
language plpgsql set search_path='' as $$
begin new.updated_at := clock_timestamp(); return new; end;
$$;
revoke all on function notification_private.touch_preferences() from public, anon, authenticated, service_role;
create trigger notification_preferences_touch before update on public.notification_preferences
for each row execute function notification_private.touch_preferences();

-- Invoker rights: table/column grants and owner RLS still apply. No caller-supplied ID.
create function public.set_notification_preferences(
  p_post_comment boolean, p_comment_reply boolean, p_post_like boolean, p_new_follower boolean
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved public.notification_preferences;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
    raise sqlstate 'PT401' using message='authentication_required';
  end if;
  if p_post_comment is null or p_comment_reply is null or p_post_like is null or p_new_follower is null then
    raise sqlstate 'PT400' using message='invalid_notification_preferences';
  end if;
  insert into public.notification_preferences(user_id,post_comment,comment_reply,post_like,new_follower)
  values(auth.uid(),p_post_comment,p_comment_reply,p_post_like,p_new_follower)
  on conflict(user_id) do update set post_comment=excluded.post_comment,comment_reply=excluded.comment_reply,
    post_like=excluded.post_like,new_follower=excluded.new_follower
  returning * into saved;
  return to_jsonb(saved)-'user_id';
end;
$$;
revoke all on function public.set_notification_preferences(boolean,boolean,boolean,boolean) from public,anon,service_role;
grant execute on function public.set_notification_preferences(boolean,boolean,boolean,boolean) to authenticated;

-- A single database gate covers all four existing generation paths, including
-- future trusted inserts. It reads RECIPIENT preferences, not the actor's RLS view.
-- Definer rights are needed only for that cross-user read. It is not a public RPC.
create function notification_private.filter_notification() returns trigger
language plpgsql security definer set search_path='' as $$
declare allowed boolean;
begin
  begin
    select case new.type
      when 'post_comment' then p.post_comment when 'comment_reply' then p.comment_reply
      when 'post_like' then p.post_like when 'new_follower' then p.new_follower
      else true end into allowed
    from public.notification_preferences p where p.user_id=new.recipient_id;
  exception when others then
    -- Fail closed for THIS notification, not the main comment/like/follow.
    -- No account IDs, content, SQLERRM or credentials in this diagnostic.
    raise log 'KCNY_NOTIFICATION_PREFERENCE_LOOKUP_FAILED sqlstate=%', SQLSTATE;
    return null;
  end;
  if allowed is false then return null; end if;
  return new; -- No preference record preserves the prior default-on behaviour.
end;
$$;
revoke all on function notification_private.filter_notification() from public,anon,authenticated,service_role;
create trigger notifications_apply_preferences before insert on public.notifications
for each row execute function notification_private.filter_notification();
