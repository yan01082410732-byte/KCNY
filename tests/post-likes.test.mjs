import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyPostLikeState, postLikeLabels } from "../lib/post-likes.ts";

const migration = readFileSync(
  new URL("../supabase/migrations/202608050001_create_post_likes.sql", import.meta.url),
  "utf8",
);
const actions = readFileSync(
  new URL("../app/posts/like-actions.ts", import.meta.url),
  "utf8",
);
const likeButton = readFileSync(
  new URL("../components/LikeButton.tsx", import.meta.url),
  "utf8",
);
const homePage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const detailPage = readFileSync(new URL("../app/posts/[id]/page.tsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../app/u/[username]/page.tsx", import.meta.url), "utf8");

const post = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  title: "Post",
  content: "Content",
  category: "culture",
  language: "CN",
  created_at: "2026-08-05T00:00:00.000Z",
  comment_count: 0,
  likeCount: 0,
  likedByCurrentUser: false,
  author_id: "author",
  author: { username: "author", display_name: "Author" },
};

test("post likes migration creates the table", () => assert.match(migration, /create table if not exists public\.post_likes/i));
test("post likes migration uses composite primary key", () => assert.match(migration, /primary key \(post_id, user_id\)/i));
test("post likes cascade when post or auth user is deleted", () => {
  assert.match(migration, /post_id uuid not null references public\.posts\(id\) on delete cascade/i);
  assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/i);
});
test("post likes migration indexes user id", () => assert.match(migration, /post_likes_user_id_idx[\s\S]*\(user_id\)/i));
test("post likes migration enables RLS", () => assert.match(migration, /alter table public\.post_likes enable row level security/i));
test("post likes select policy is public", () => assert.match(migration, /for select[\s\S]*using \(true\)/i));
test("post likes insert policy requires the current user", () => assert.match(migration, /for insert to authenticated[\s\S]*user_id = auth\.uid\(\)/i));
test("post likes delete policy requires the current user", () => assert.match(migration, /for delete to authenticated[\s\S]*user_id = auth\.uid\(\)/i));
test("post likes migration has no update policy", () => assert.doesNotMatch(migration, /for update/i));
test("post likes migration has no destructive SQL", () => assert.doesNotMatch(migration, /\b(drop|truncate)\b/i));
test("like state counts likes without an N plus one result", () => {
  const state = applyPostLikeState([post], [
    { post_id: post.id, user_id: "viewer" },
    { post_id: post.id, user_id: "other" },
  ], "viewer");
  assert.equal(state[0].likeCount, 2);
  assert.equal(state[0].likedByCurrentUser, true);
});
test("like state ignores rows for other posts", () => {
  const state = applyPostLikeState([post], [{ post_id: "other", user_id: "viewer" }], "viewer");
  assert.equal(state[0].likeCount, 0);
  assert.equal(state[0].likedByCurrentUser, false);
});
test("CN like labels are available", () => assert.equal(postLikeLabels("CN").like, "点赞"));
test("KR like labels are available", () => assert.equal(postLikeLabels("KR").unlike, "좋아요 취소"));
test("like actions derive the user from Supabase auth", () => {
  assert.match(actions, /auth\.getUser\(\)/);
  assert.doesNotMatch(actions, /service_role|auth\.admin/i);
});
test("like insert uses only the current user and post id", () => assert.match(actions, /post_id: context\.postId, user_id: context\.userId/));
test("unlike scopes both post and user", () => assert.match(actions, /\.eq\("post_id", context\.postId\)[\s\S]*\.eq\("user_id", context\.userId\)/));
test("like actions safely preserve internal return paths", () => assert.match(actions, /safeReturnTo\(formData\.get\("returnTo"\)\)/));
test("like actions revalidate the feed and post detail", () => {
  assert.match(actions, /revalidatePath\("\/"\)/);
  assert.match(actions, /revalidatePath\(`\/posts\/\$\{postId\}`\)/);
});
test("like UI is a form with pressed state and pending support", () => {
  assert.match(likeButton, /useFormStatus/);
  assert.match(likeButton, /type="submit"/);
  assert.match(likeButton, /aria-pressed=\{liked\}/);
  assert.doesNotMatch(likeButton, /localStorage|window\.confirm|alert\(/);
});
test("all post pages batch select like rows", () => {
  for (const source of [homePage, detailPage, profilePage]) {
    assert.match(source, /from\("post_likes"\)/);
    assert.match(source, /applyPostLikeState/);
  }
});
