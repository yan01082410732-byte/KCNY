begin;
set local lock_timeout = '5s';

-- The journal deliberately has no cascading foreign keys. A deleted comment,
-- parent, post or account must never turn an old request into a new insert.
create schema comment_idempotency;
revoke all on schema comment_idempotency from public, anon, authenticated, service_role;
grant usage on schema comment_idempotency to authenticated;

create table comment_idempotency.request_journal (
  author_id uuid not null,
  request_id uuid not null,
  post_id uuid not null,
  parent_comment_id uuid,
  content_sha256 bytea not null,
  comment_id uuid not null unique,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (author_id, request_id)
);
alter table comment_idempotency.request_journal enable row level security;
revoke all on comment_idempotency.request_journal from public, anon, authenticated, service_role;
grant select on comment_idempotency.request_journal to authenticated;
create policy "Read own comment request receipts"
  on comment_idempotency.request_journal for select to authenticated
  using (author_id = (select auth.uid()));

alter table public.comments add column request_id uuid;

-- Only a real INSERT on comments can create a receipt. Clients have no journal
-- write privileges and cannot invoke this trigger function as an RPC.
create function comment_idempotency.claim_comment_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  receipt comment_idempotency.request_journal%rowtype;
  inserted_count integer;
begin
  if new.request_id is null then return new; end if;
  if auth.uid() is null or new.author_id is distinct from auth.uid() then
    raise exception using errcode = '42501', message = 'Comment request requires its authenticated author';
  end if;
  insert into comment_idempotency.request_journal
    (author_id, request_id, post_id, parent_comment_id, content_sha256, comment_id)
    values (new.author_id, new.request_id, new.post_id, new.parent_comment_id,
      pg_catalog.sha256(pg_catalog.convert_to(new.content, 'UTF8')), new.id)
    on conflict (author_id, request_id) do nothing;
  get diagnostics inserted_count = row_count;
  select j.* into strict receipt from comment_idempotency.request_journal j
    where j.author_id = new.author_id and j.request_id = new.request_id for update;
  if receipt.post_id is distinct from new.post_id
    or receipt.parent_comment_id is distinct from new.parent_comment_id
    or receipt.content_sha256 is distinct from pg_catalog.sha256(pg_catalog.convert_to(new.content, 'UTF8')) then
    raise exception using errcode = 'PT409', message = 'comment_request_conflict';
  end if;
  -- Waiting duplicate inserts return no row: AFTER INSERT notification triggers
  -- therefore run exactly once. The receipt and comment commit atomically.
  if inserted_count = 0 then return null; end if;
  return new;
end;
$$;
revoke execute on function comment_idempotency.claim_comment_request() from public, anon, authenticated, service_role;
create trigger comments_00_claim_request
  before insert on public.comments for each row
  execute function comment_idempotency.claim_comment_request();

create function comment_idempotency.tombstone_comment_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A trusted DELETE trigger also handles post/parent/account cascades, including
  -- replies owned by someone other than the authenticated deleting parent owner.
  -- No EXECUTE grant exists and the function only changes the OLD row's receipt.
  update comment_idempotency.request_journal
    set deleted_at = coalesce(deleted_at, pg_catalog.clock_timestamp())
    where comment_id = old.id and author_id = old.author_id;
  return old;
end;
$$;
revoke execute on function comment_idempotency.tombstone_comment_request() from public, anon, authenticated, service_role;
create trigger comments_tombstone_request
  after delete on public.comments for each row
  execute function comment_idempotency.tombstone_comment_request();

create function public.comment_request_status(
  p_request_id uuid, p_post_id uuid, p_parent_comment_id uuid, p_content text
)
returns table (request_id uuid, comment_id uuid, outcome text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  receipt comment_idempotency.request_journal%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if p_request_id is null or p_post_id is null or p_content is null
    or pg_catalog.char_length(p_content) > 1000 or pg_catalog.char_length(pg_catalog.btrim(p_content)) = 0 then
    raise exception using errcode = '22023', message = 'Invalid comment request';
  end if;
  select j.* into receipt from comment_idempotency.request_journal j
    where j.author_id = (select auth.uid()) and j.request_id = p_request_id;
  if not found then
    return query select p_request_id, null::uuid, 'not_found'::text;
  elsif receipt.post_id is distinct from p_post_id
    or receipt.parent_comment_id is distinct from p_parent_comment_id
    or receipt.content_sha256 is distinct from pg_catalog.sha256(pg_catalog.convert_to(p_content, 'UTF8')) then
    return query select p_request_id, null::uuid, 'conflict'::text;
  else
    return query select p_request_id, receipt.comment_id,
      case when receipt.deleted_at is null then 'confirmed'::text else 'deleted'::text end;
  end if;
end;
$$;
revoke execute on function public.comment_request_status(uuid, uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.comment_request_status(uuid, uuid, uuid, text) to authenticated;

create function public.submit_comment_request(
  p_request_id uuid, p_post_id uuid, p_parent_comment_id uuid, p_content text
)
returns table (request_id uuid, comment_id uuid, outcome text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  receipt record;
begin
  select s.* into strict receipt from public.comment_request_status(p_request_id, p_post_id, p_parent_comment_id, p_content) s;
  -- Check the journal before target existence: a deleted parent/post is still a
  -- completed historical request, not permission to recreate its old child.
  if receipt.outcome <> 'not_found' then
    return query select receipt.request_id, receipt.comment_id, receipt.outcome;
    return;
  end if;
  -- These reads and the actual INSERT retain the caller's existing RLS. No
  -- SECURITY DEFINER code reads posts or grants access to hidden targets.
  if not exists (select 1 from public.posts p where p.id = p_post_id) then
    raise exception using errcode = 'P0002', message = 'invalid_post';
  end if;
  if p_parent_comment_id is not null and not exists (
    select 1 from public.comments c where c.id = p_parent_comment_id
      and c.post_id = p_post_id and c.parent_comment_id is null
  ) then
    raise exception using errcode = 'P0002', message = 'invalid_parent_comment';
  end if;
  insert into public.comments (post_id, author_id, parent_comment_id, content, request_id)
    values (p_post_id, auth.uid(), p_parent_comment_id, p_content, p_request_id);
  -- The trigger serializes concurrent inserts with the journal's unique key and
  -- row lock. Replay never locks comments after journal, avoiding inverse lock
  -- order against DELETE(comment -> journal). A concurrent delete can linearize
  -- after this receipt; every lookup after its commit reports deleted.
  return query select s.* from public.comment_request_status(p_request_id, p_post_id, p_parent_comment_id, p_content) s;
end;
$$;
revoke execute on function public.submit_comment_request(uuid, uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.submit_comment_request(uuid, uuid, uuid, text) to authenticated;

commit;
