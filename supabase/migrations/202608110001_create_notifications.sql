create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('post_comment', 'comment_reply', 'post_like', 'new_follower')),
  post_id uuid null references public.posts(id) on delete cascade,
  comment_id uuid null references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz null,
  constraint notifications_distinct_actor_recipient check (recipient_id <> actor_id)
);

create index notifications_recipient_created_at_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_read_created_at_idx
  on public.notifications (recipient_id, read_at, created_at desc);
create unique index notifications_comment_unique_idx
  on public.notifications (comment_id)
  where type in ('post_comment', 'comment_reply');
create unique index notifications_post_like_unique_idx
  on public.notifications (actor_id, recipient_id, post_id)
  where type = 'post_like';
create unique index notifications_new_follower_unique_idx
  on public.notifications (actor_id, recipient_id)
  where type = 'new_follower';

alter table public.notifications enable row level security;

revoke all on public.notifications from anon;
revoke all on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Recipients read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

create policy "Recipients mark own notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_author_id uuid;
  target_post_id uuid;
  target_parent_id uuid;
begin
  if new.parent_comment_id is null then
    select author_id into target_author_id
    from public.posts
    where id = new.post_id;

    if target_author_id is null or target_author_id = new.author_id then
      return new;
    end if;

    begin
      insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
      values (target_author_id, new.author_id, 'post_comment', new.post_id, new.id)
      on conflict do nothing;
    exception when others then
      return new;
    end;

    return new;
  end if;

  select author_id, post_id, parent_comment_id
  into target_author_id, target_post_id, target_parent_id
  from public.comments
  where id = new.parent_comment_id;

  if target_author_id is null
    or target_post_id is distinct from new.post_id
    or target_parent_id is not null
    or target_author_id = new.author_id then
    return new;
  end if;

  begin
    insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
    values (target_author_id, new.author_id, 'comment_reply', new.post_id, new.id)
    on conflict do nothing;
  exception when others then
    return new;
  end;

  return new;
end;
$$;

create function public.create_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_author_id uuid;
begin
  select author_id into target_author_id
  from public.posts
  where id = new.post_id;

  if target_author_id is null or target_author_id = new.user_id then
    return new;
  end if;

  begin
    insert into public.notifications (recipient_id, actor_id, type, post_id)
    values (target_author_id, new.user_id, 'post_like', new.post_id)
    on conflict do nothing;
  exception when others then
    return new;
  end;

  return new;
end;
$$;

create function public.remove_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    delete from public.notifications
    where type = 'post_like'
      and actor_id = old.user_id
      and post_id = old.post_id;
  exception when others then
    return old;
  end;

  return old;
end;
$$;

create function public.create_new_follower_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  begin
    insert into public.notifications (recipient_id, actor_id, type)
    values (new.following_id, new.follower_id, 'new_follower')
    on conflict do nothing;
  exception when others then
    return new;
  end;

  return new;
end;
$$;

create function public.remove_new_follower_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    delete from public.notifications
    where type = 'new_follower'
      and actor_id = old.follower_id
      and recipient_id = old.following_id;
  exception when others then
    return old;
  end;

  return old;
end;
$$;

revoke execute on function public.create_comment_notification() from public, anon, authenticated;
revoke execute on function public.create_post_like_notification() from public, anon, authenticated;
revoke execute on function public.remove_post_like_notification() from public, anon, authenticated;
revoke execute on function public.create_new_follower_notification() from public, anon, authenticated;
revoke execute on function public.remove_new_follower_notification() from public, anon, authenticated;

create trigger comments_create_notification
  after insert on public.comments
  for each row execute function public.create_comment_notification();

create trigger post_likes_create_notification
  after insert on public.post_likes
  for each row execute function public.create_post_like_notification();

create trigger post_likes_remove_notification
  after delete on public.post_likes
  for each row execute function public.remove_post_like_notification();

create trigger user_follows_create_notification
  after insert on public.user_follows
  for each row execute function public.create_new_follower_notification();

create trigger user_follows_remove_notification
  after delete on public.user_follows
  for each row execute function public.remove_new_follower_notification();
