begin;
set local lock_timeout = '5s';
-- Serialize the compatibility check and trigger installation against writes.
lock table public.comments in share row exclusive mode;

do $$
begin
  if exists (
    select 1 from public.comments child
    left join public.comments parent on parent.id = child.parent_comment_id
    where child.parent_comment_id is not null
      and (parent.id is null or parent.post_id <> child.post_id
        or parent.parent_comment_id is not null or child.id = parent.id)
  ) then
    raise exception using errcode = '23514', message = 'Existing comment relationships require review';
  end if;
end;
$$;

create function public.enforce_comment_reply_integrity()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  parent_post_id uuid;
  parent_parent_id uuid;
begin
  -- IDs and relationships are immutable. This also prevents converting a
  -- top-level parent into a reply or moving it while children are inserted.
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.post_id is distinct from old.post_id
    or new.parent_comment_id is distinct from old.parent_comment_id
  ) then
    raise exception using errcode = '23514', message = 'Comment relationship cannot be changed';
  end if;

  if new.parent_comment_id is null then
    return new;
  end if;
  if new.parent_comment_id = new.id then
    raise exception using errcode = '23514', message = 'Invalid comment parent';
  end if;
  select parent.post_id, parent.parent_comment_id
    into parent_post_id, parent_parent_id
    from public.comments parent where parent.id = new.parent_comment_id;
  if not found or parent_post_id is distinct from new.post_id or parent_parent_id is not null then
    raise exception using errcode = '23514', message = 'Invalid comment parent';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_comment_reply_integrity() from public, anon, authenticated;
create trigger comments_enforce_reply_integrity
  before insert or update on public.comments
  for each row execute function public.enforce_comment_reply_integrity();
commit;
