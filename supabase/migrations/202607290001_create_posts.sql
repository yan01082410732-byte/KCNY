create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  content text not null check (char_length(trim(content)) between 1 and 5000),
  category text not null check (category in ('culture', 'language', 'travel', 'study', 'daily', 'other')),
  language text not null check (language in ('CN', 'KR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_created_at_desc_idx on public.posts (created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_language_idx on public.posts (language);
create index if not exists posts_category_created_at_desc_idx on public.posts (category, created_at desc);

alter table public.posts enable row level security;

create policy "Public posts are readable"
  on public.posts for select using (true);

create policy "Users insert own posts"
  on public.posts for insert to authenticated
  with check (author_id = auth.uid());

create policy "Users delete own posts"
  on public.posts for delete to authenticated
  using (author_id = auth.uid());

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();
