import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { applyPostBookmarkState, postBookmarkLabels } from "../lib/post-bookmarks.ts";

const migration = readFileSync(new URL("../supabase/migrations/202608090001_create_post_bookmarks.sql", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/posts/bookmark-actions.ts", import.meta.url), "utf8");
const button = readFileSync(new URL("../components/BookmarkButton.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("../components/PostCard.tsx", import.meta.url), "utf8");
const detailClient = readFileSync(new URL("../components/PostDetailClient.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../app/posts/[id]/page.tsx", import.meta.url), "utf8");
const profile = readFileSync(new URL("../app/u/[username]/page.tsx", import.meta.url), "utf8");
const bookmarksPage = readFileSync(new URL("../app/bookmarks/page.tsx", import.meta.url), "utf8");
const bookmarksClient = readFileSync(new URL("../components/BookmarksPageClient.tsx", import.meta.url), "utf8");
const menu = readFileSync(new URL("../components/UserMenu.tsx", import.meta.url), "utf8");
const menuLabels = readFileSync(new URL("../lib/user-menu.ts", import.meta.url), "utf8");

const post = {
  id: "550e8400-e29b-41d4-a716-446655440000", title: "Post", content: "Content", category: "culture", language: "CN",
  created_at: "2026-08-09T00:00:00.000Z", comment_count: 0, likeCount: 0, likedByCurrentUser: false, bookmarkedByCurrentUser: false,
  author_id: "author", author: { username: "author", display_name: "Author" },
};

test("bookmarks migration creates a private relation table", () => assert.match(migration, /create table if not exists public\.post_bookmarks/i));
test("bookmarks migration uses a composite primary key", () => assert.match(migration, /primary key \(post_id, user_id\)/i));
test("bookmarks cascade when a post is deleted", () => assert.match(migration, /post_id uuid not null references public\.posts\(id\) on delete cascade/i));
test("bookmarks cascade when an auth user is deleted", () => assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/i));
test("bookmarks migration indexes user and saved order", () => assert.match(migration, /post_bookmarks_user_created_at_idx[\s\S]*\(user_id, created_at desc\)/i));
test("bookmarks migration enables RLS", () => assert.match(migration, /alter table public\.post_bookmarks enable row level security/i));
test("bookmark select policy restricts reads to the current user", () => assert.match(migration, /for select to authenticated[\s\S]*user_id = auth\.uid\(\)/i));
test("bookmark insert policy restricts writes to the current user", () => assert.match(migration, /for insert to authenticated[\s\S]*user_id = auth\.uid\(\)/i));
test("bookmark delete policy restricts deletes to the current user", () => assert.match(migration, /for delete to authenticated[\s\S]*user_id = auth\.uid\(\)/i));
test("bookmarks have no update policy", () => assert.doesNotMatch(migration, /for update/i));
test("bookmarks have no public select policy", () => assert.doesNotMatch(migration, /using \(true\)/i));
test("bookmarks migration has no destructive SQL", () => assert.doesNotMatch(migration, /\b(drop|truncate)\b/i));
test("bookmark state marks only rows for posts on the page", () => {
  const state = applyPostBookmarkState([post], [{ post_id: post.id }, { post_id: "other" }]);
  assert.equal(state[0].bookmarkedByCurrentUser, true);
});
test("bookmark state defaults to false without a current user row", () => assert.equal(applyPostBookmarkState([post], [])[0].bookmarkedByCurrentUser, false));
test("CN bookmark labels are available", () => assert.equal(postBookmarkLabels("CN").bookmark, "收藏"));
test("KR bookmark labels are available", () => assert.equal(postBookmarkLabels("KR").saved, "저장됨"));
test("bookmark actions obtain the user only from the server session", () => {
  assert.match(actions, /auth\.getUser\(\)/);
  assert.doesNotMatch(actions, /auth\.admin|service_role|formData\.get\("userId"\)/i);
});
test("bookmark action is idempotent through composite conflict handling", () => assert.match(actions, /onConflict: "post_id,user_id", ignoreDuplicates: true/));
test("unbookmark action scopes post and server user", () => assert.match(actions, /\.eq\("post_id", context\.postId\)[\s\S]*\.eq\("user_id", context\.userId\)/));
test("bookmark actions preserve only safe internal return paths", () => assert.match(actions, /safeReturnTo\(formData\.get\("returnTo"\)\)/));
test("bookmark actions revalidate feed detail and bookmarks page", () => {
  assert.match(actions, /revalidatePath\("\/"\)/);
  assert.match(actions, /revalidatePath\(`\/posts\/\$\{postId\}`\)/);
  assert.match(actions, /revalidatePath\("\/bookmarks"\)/);
});
test("bookmark button has pressed state and pending support", () => {
  assert.match(button, /useFormStatus/);
  assert.match(button, /type="submit"/);
  assert.match(button, /aria-pressed=\{bookmarked\}/);
  assert.doesNotMatch(button, /localStorage|window\.confirm|alert\(/);
});
test("post card includes a bookmark button without nesting it in a link", () => {
  assert.match(card, /<BookmarkButton/);
  assert.match(card, /<h3><a href=\{postHref\}>\{post\.title\}<\/a><\/h3>/);
});
test("post detail includes a bookmark button", () => assert.match(detailClient, /<BookmarkButton/));
test("home queries bookmarks once for the current page posts", () => {
  assert.match(home, /from\("post_bookmarks"\)/);
  assert.match(home, /\.eq\("user_id", userId\)[\s\S]*\.in\("post_id", postIds\)/);
});
test("home does not query bookmarks for anonymous visitors", () => assert.match(home, /if \(userId\) \{/));
test("detail queries only the current user bookmark relation", () => assert.match(detail, /\.eq\("user_id", currentUserId\)[\s\S]*\.eq\("post_id", id\)/));
test("profile only maps the current user bookmark state", () => assert.match(profile, /\.eq\("user_id", currentUserId\)[\s\S]*\.in\("post_id", postIds\)/));
test("bookmarks page protects unauthenticated access", () => assert.match(bookmarksPage, /auth\/login\?lang=\$\{language\}&returnTo=/));
test("bookmarks page queries only the current user", () => assert.match(bookmarksPage, /\.eq\("user_id", user\.id\)/));
test("bookmarks page orders by bookmark creation time", () => assert.match(bookmarksPage, /order\("created_at", \{ ascending: false \}\)/));
test("bookmarks page preserves bookmark order after post lookup", () => assert.match(bookmarksPage, /postIds\.flatMap/));
test("bookmarks page has CN empty state", () => assert.match(bookmarksClient, /还没有收藏帖子/));
test("bookmarks page has KR empty state", () => assert.match(bookmarksClient, /아직 저장한 게시물이 없습니다/));
test("user menu provides a CN bookmark entry", () => assert.match(menuLabels, /bookmarks: "我的收藏"/));
test("user menu provides a KR bookmark entry", () => assert.match(menuLabels, /bookmarks: "내 저장글"/));
test("user menu bookmark entry preserves language", () => assert.match(menu, /\/bookmarks\?lang=\$\{language\}/));
test("public profile never queries bookmark relations by the profile owner", () => {
  assert.doesNotMatch(profile, /\.eq\("user_id", profile\.id\)/);
  assert.match(profile, /\.eq\("user_id", currentUserId\)/);
});
test("bookmark UI does not show a public bookmark count", () => assert.doesNotMatch(button, /bookmark-count|bookmarkCount/));
test("bookmark implementation has no public bookmark user list", () => assert.doesNotMatch(`${home}\n${detail}\n${profile}`, /bookmarkUsers|bookmarkedBy|userIds/));
