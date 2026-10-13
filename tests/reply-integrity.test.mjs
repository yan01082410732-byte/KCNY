import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/20261013173533_enforce_comment_reply_integrity.sql",import.meta.url),"utf8");
test("reply integrity migration serializes preflight and installation without data modification",()=>{
  assert.match(sql,/lock table public.comments in share row exclusive mode/i);
  assert.match(sql,/set local lock_timeout = '5s'/i);
  assert.match(sql,/Existing comment relationships require review/);
  assert.doesNotMatch(sql,/\b(drop|truncate|delete from|update public.comments|alter policy)\b/i);
});
test("database INSERT rejects missing cross-post nested and self parent",()=>{
  assert.match(sql,/new.parent_comment_id = new.id/);
  assert.match(sql,/not found or parent_post_id is distinct from new.post_id or parent_parent_id is not null/);
  assert.match(sql,/before insert or update on public.comments/i);
  assert.match(sql,/errcode = '23514'/);
});
test("database UPDATE cannot reparent move or convert an existing parent",()=>{
  assert.match(sql,/tg_op = 'UPDATE'/);
  for(const field of ["id","post_id","parent_comment_id"]) assert.ok(sql.includes("new."+field+" is distinct from old."+field));
  assert.match(sql,/Comment relationship cannot be changed/);
});
test("integrity trigger is invoker and not callable as public RPC",()=>{
  assert.match(sql,/security invoker/i); assert.doesNotMatch(sql,/security definer/i);
  assert.match(sql,/revoke execute[\s\S]*from public, anon, authenticated/i);
});
