import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { groupCommentThreads, validateCommentReplyInput } from "../lib/comments.ts";

const migration = readFileSync("supabase/migrations/202608100002_add_comment_replies.sql", "utf8");
const oldMigration = readFileSync("supabase/migrations/202607290002_create_comments.sql", "utf8");
const actions = readFileSync("app/posts/[id]/comment-actions.ts", "utf8");
const detail = readFileSync("app/posts/[id]/page.tsx", "utf8");
const client = readFileSync("components/PostDetailClient.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const id = "550e8400-e29b-41d4-a716-446655440000";
const replyId = "550e8400-e29b-41d4-a716-446655440001";

test("reply validates parent id and CN KR input", () => { assert.equal(validateCommentReplyInput({ postId:id, parentCommentId:null, content:"reply", language:"CN" }).error, "invalid_parent_comment"); assert.equal(validateCommentReplyInput({ postId:id, parentCommentId:id, content:" reply ", language:"CN" }).error, null); assert.equal(validateCommentReplyInput({ postId:id, parentCommentId:id, content:"reply", language:"KR" }).error, null); });
test("reply migration is incremental self FK cascade with index", () => { assert.match(migration, /parent_comment_id uuid null[\s\S]*references public\.comments\(id\) on delete cascade/i); assert.match(migration, /comments_post_parent_created_at_idx[\s\S]*\(post_id, parent_comment_id, created_at\)/i); assert.doesNotMatch(migration, /create policy|enable row level security|for update|\b(drop|truncate)\b/i); assert.doesNotMatch(oldMigration, /parent_comment_id/); });
test("reply action derives author from session and validates parent", () => { assert.match(actions, /auth\.getClaims\(\)/); assert.doesNotMatch(actions, /service_role|auth\.admin|formData\.get\("authorId"\)/i); assert.match(actions, /parent\.post_id !== validation\.value\.postId \|\| parent\.parent_comment_id !== null/); assert.match(actions, /parent_comment_id: parent\.id/); assert.match(actions, /revalidateCommentViews\(validation\.value\.postId\)/); });
test("comments group to one ordered reply level", () => { const threads = groupCommentThreads([{id:replyId,postId:id,parentCommentId:id,content:"r",createdAt:"2026-01-02T00:00:00.000Z",author:{username:"r",displayName:null},canDelete:false},{id,postId:id,parentCommentId:null,content:"p",createdAt:"2026-01-01T00:00:00.000Z",author:{username:"p",displayName:null},canDelete:false}]); assert.equal(threads.length,1); assert.equal(threads[0].replies[0].id,replyId); });
test("detail uses one bounded comment query containing parent ids", () => { assert.match(detail, /parent_comment_id/); assert.match(detail, /\.from\("comments"\)[\s\S]*\.limit\(200\)/); assert.match(detail, /groupCommentThreads\(publicComments\)/); });
test("reply UI includes safe login, delete form, bilingual copy and mobile styles", () => { assert.match(client, /createCommentReply/); assert.match(client, /returnTo=\$\{encodeURIComponent/); assert.match(client, /form action=\{deleteComment\}/); assert.match(client, /发表回复/); assert.match(client, /답글 작성/); assert.match(client, /删除这条评论也会删除它下面的回复/); assert.match(client, /이 댓글을 삭제하면 아래 답글도 함께 삭제됩니다/); assert.doesNotMatch(client, /window\.confirm|alert\(/); assert.match(css, /\.comment-replies/); assert.doesNotMatch(css, /overflow-x\s*:\s*hidden/); });
