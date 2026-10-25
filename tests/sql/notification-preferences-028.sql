-- Isolated management-only fault probe. NEVER execute on Production.
-- Before this script, verify actual management project == kirvcbkbkvotnsqnbcyf,
-- then set kcny.test_user_a / kcny.test_user_b to the approved synthetic Auth IDs.
-- These GUCs supply fixture IDs, NOT infrastructure identity or auth evidence.
begin;
set local lock_timeout='5s';
set local statement_timeout='15s';
create temporary table task_028_fault_ids on commit drop as select
  current_setting('kcny.test_user_a')::uuid as a,
  current_setting('kcny.test_user_b')::uuid as b,
  gen_random_uuid() as post, gen_random_uuid() as parent,
  gen_random_uuid() as comment, gen_random_uuid() as reply;
do $$declare f record; begin
  select * into strict f from task_028_fault_ids;
  if f.a=f.b or (select count(*) from public.profiles where id in (f.a,f.b))<>2 then
    raise exception 'synthetic_fixture_identity_missing';
  end if;
end$$;

-- The missing relation is a genuine database lookup failure. Transactional DDL
-- is rolled back; no installed function, policy or migration is rewritten.
alter table public.notification_preferences rename to notification_preferences_fault_028;
do $$declare f record; begin
  select * into strict f from task_028_fault_ids;
  insert into public.posts(id,author_id,title,content,category,language)
    values(f.post,f.a,'028 rollback fault probe','Synthetic only','other','CN');
  insert into public.comments(id,post_id,author_id,content) values(f.parent,f.post,f.a,'028 parent');
  insert into public.comments(id,post_id,author_id,content) values(f.comment,f.post,f.b,'028 comment');
  insert into public.comments(id,post_id,author_id,parent_comment_id,content)
    values(f.reply,f.post,f.b,f.parent,'028 reply');
  insert into public.post_likes(post_id,user_id) values(f.post,f.b);
  -- Existing synthetic relationship and its notification are restored by rollback.
  delete from public.user_follows where follower_id=f.b and following_id=f.a;
  insert into public.user_follows(follower_id,following_id) values(f.b,f.a);
  if (select count(*) from public.comments where id in (f.comment,f.reply))<>2
    or not exists(select 1 from public.post_likes where post_id=f.post and user_id=f.b)
    or not exists(select 1 from public.user_follows where follower_id=f.b and following_id=f.a)
  then raise exception 'main_business_was_not_preserved'; end if;
  if exists(select 1 from public.notifications where post_id=f.post)
    or exists(select 1 from public.notifications where type='new_follower' and recipient_id=f.a and actor_id=f.b)
  then raise exception 'lookup_failure_did_not_suppress_notification'; end if;
end$$;
rollback;
select jsonb_build_object('fault_types_verified',4,'main_business_rows_succeeded',true,
  'failed_lookup_notifications_created',0,'transaction_rolled_back',true,
  'preferences_relation_restored',to_regclass('public.notification_preferences') is not null) as fault_probe;
