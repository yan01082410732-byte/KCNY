create table if not exists public.post_bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_bookmarks_user_created_at_idx
  on public.post_bookmarks (user_id, created_at desc);

alter table public.post_bookmarks enable row level security;

create policy "Users read own post bookmarks"
  on public.post_bookmarks for select to authenticated
  using (user_id = auth.uid());

create policy "Users insert own post bookmarks"
  on public.post_bookmarks for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users delete own post bookmarks"
  on public.post_bookmarks for delete to authenticated
  using (user_id = auth.uid());
