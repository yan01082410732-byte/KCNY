create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists user_follows_following_id_idx on public.user_follows (following_id);
create index if not exists user_follows_follower_created_at_idx on public.user_follows (follower_id, created_at desc);
create index if not exists user_follows_following_created_at_idx on public.user_follows (following_id, created_at desc);

alter table public.user_follows enable row level security;

create policy "Public follows are readable" on public.user_follows for select using (true);
create policy "Users follow from their own account" on public.user_follows for insert to authenticated with check (auth.uid() = follower_id and follower_id <> following_id);
create policy "Users unfollow from their own account" on public.user_follows for delete to authenticated using (auth.uid() = follower_id);
