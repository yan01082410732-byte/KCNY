begin;
set local lock_timeout = '5s';

-- The existing follows primary key (follower_id, following_id) supports
-- membership lookup. Add only the missing per-author keyset index; retain the
-- existing category/created_at index and all existing public-read policies.
create index if not exists posts_author_created_at_id_idx
  on public.posts (author_id, created_at desc, id desc);

create function public.following_feed_page(
  p_category text default null,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 21
)
returns setof public.posts
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  viewer_id uuid := auth.uid();
begin
  if viewer_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 51 then
    raise exception using errcode = '22023', message = 'Invalid following feed limit';
  end if;
  if p_category is not null and p_category not in ('culture', 'language', 'travel', 'study', 'daily', 'other') then
    raise exception using errcode = '22023', message = 'Invalid following feed category';
  end if;
  if (p_before_created_at is null) <> (p_before_id is null)
    or (p_before_created_at is not null and not pg_catalog.isfinite(p_before_created_at)) then
    raise exception using errcode = '22023', message = 'Invalid following feed cursor';
  end if;

  -- This bounds the returned page, not total database work. Follow membership,
  -- category and cursor all apply before LIMIT; there is no client ID fan-out.
  return query
    select p.*
    from public.posts p
    where p.author_id <> viewer_id
      and exists (
        select 1 from public.user_follows f
        where f.follower_id = viewer_id and f.following_id = p.author_id
      )
      and (p_category is null or p.category = p_category)
      and (p_before_created_at is null or (p.created_at, p.id) < (p_before_created_at, p_before_id))
    order by p.created_at desc, p.id desc
    limit p_limit;
end;
$$;

revoke execute on function public.following_feed_page(text, timestamptz, uuid, integer) from public, anon, authenticated;
grant execute on function public.following_feed_page(text, timestamptz, uuid, integer) to authenticated;

comment on function public.following_feed_page(text, timestamptz, uuid, integer) is
  'Authenticated caller following-feed page, at most 51 posts. Invoker RLS applies; existing public follow visibility is unchanged.';

commit;
