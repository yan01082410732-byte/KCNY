alter table public.comments
  add column if not exists parent_comment_id uuid null
  references public.comments(id) on delete cascade;

create index if not exists comments_post_parent_created_at_idx
  on public.comments (post_id, parent_comment_id, created_at);
