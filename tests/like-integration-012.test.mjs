import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyViewerLikeState, postLikeErrorMessage } from "../lib/post-likes.ts";
import { toPublicPosts } from "../lib/posts.ts";
import { notificationTarget } from "../lib/notifications.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const actions = read("app/posts/like-actions.ts");
const button = read("components/LikeButton.tsx");
const notificationSql = read("supabase/migrations/202608110001_create_notifications.sql");
const search = read("app/search/page.tsx");
const home = read("app/page.tsx");
const profile = read("app/u/[username]/page.tsx");
const detail = read("app/posts/[id]/page.tsx");
const bookmarks = read("app/bookmarks/page.tsx");

const row = { id: "550e8400-e29b-41d4-a716-446655440000", author_id: "author", title: "标题", content: "본문", category: "culture", language: "CN", created_at: "2026-10-21T00:00:00Z", author: { username: "author", display_name: null }, post_likes: [{ count: 1400 }] };

test("aggregate like counts remain exact beyond ordinary row-response limits", () => {
  const [post] = toPublicPosts([row]);
  assert.equal(post.likeCount, 1400);
  assert.equal(post.likedByCurrentUser, false);
  assert.equal(applyViewerLikeState([post], [{ post_id: post.id }])[0].likedByCurrentUser, true);
  assert.equal(applyViewerLikeState([post], [])[0].likeCount, 1400);
});

test("viewer like state ignores unrelated rows and does not alter aggregate count", () => {
  const [post] = toPublicPosts([row]);
  assert.deepEqual(applyViewerLikeState([post], [{ post_id: "different" }])[0], post);
});

test("all four post views request aggregate count plus viewer-scoped state", () => {
  for (const source of [home, search, profile, detail, bookmarks]) {
    assert.match(source, /post_likes\(count\)/);
    assert.match(source, /applyViewerLikeState/);
    assert.match(source, /\.select\("post_id"\)/);
    assert.doesNotMatch(source, /select\("post_id, user_id"\)/);
  }
});

test("like actions remain authenticated, idempotent and owner-scoped for unlike", () => {
  assert.match(actions, /auth\.getUser\(\)/);
  assert.match(actions, /ignoreDuplicates: true/);
  assert.match(actions, /\.eq\("post_id", context\.postId\)/);
  assert.match(actions, /\.eq\("user_id", context\.userId\)/);
  assert.match(actions, /if \(error\) redirect\(withActionError/);
});

test("failure text is bilingual and only known action errors are rendered", () => {
  assert.match(postLikeErrorMessage("like_failed", "CN"), /无法确认点赞结果/);
  assert.match(postLikeErrorMessage("unlike_failed", "KR"), /좋아요 취소 결과를 확인할 수 없습니다/);
  assert.equal(postLikeErrorMessage("secret_database_error", "CN"), undefined);
  for (const path of ["components/HomePageClient.tsx", "components/SearchPageClient.tsx", "components/ProfilePageClient.tsx", "components/PostDetailClient.tsx"]) assert.match(read(path), /postLikeErrorMessage/);
});

test("like button exposes pressed/count state and disables when state is unknown", () => {
  assert.match(button, /aria-pressed=\{liked\}/);
  assert.match(button, /disabled=\{pending \|\| unavailable\}/);
  assert.match(button, /like-count/);
});

test("existing notification contract deduplicates, excludes self, and routes likes to posts", () => {
  assert.match(notificationSql, /type in \('post_comment', 'comment_reply', 'post_like', 'new_follower'\)/);
  assert.match(notificationSql, /target_author_id = new\.user_id/);
  assert.match(notificationSql, /notifications_post_like_unique_idx/);
  assert.match(notificationSql, /after insert on public\.post_likes/);
  assert.match(notificationSql, /after delete on public\.post_likes/);
  assert.equal(notificationTarget({ type: "post_like", postId: row.id }, "KR"), `/posts/${row.id}?lang=KR`);
});
