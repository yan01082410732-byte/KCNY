create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_post_id_created_at_idx
  on public.comments (post_id, created_at);
create index if not exists comments_author_id_created_at_idx
  on public.comments (author_id, created_at);

alter table public.comments enable row level security;

create policy "Public comments are readable"
  on public.comments for select using (true);
create policy "Users insert own comments"
  on public.comments for insert to authenticated
  with check (author_id = auth.uid());
create policy "Users delete own comments"
  on public.comments for delete to authenticated
  using (author_id = auth.uid());

create trigger comments_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();
