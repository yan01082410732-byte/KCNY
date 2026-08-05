create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists post_likes_user_id_idx
  on public.post_likes (user_id);

alter table public.post_likes enable row level security;

create policy "Post likes are readable"
  on public.post_likes for select
  using (true);

create policy "Users insert own post likes"
  on public.post_likes for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users delete own post likes"
  on public.post_likes for delete to authenticated
  using (user_id = auth.uid());
