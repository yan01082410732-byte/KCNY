import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helpers = readFileSync(new URL("../lib/following-feed.ts", import.meta.url), "utf8");
const homePage = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const homeClient = readFileSync(new URL("../components/HomePageClient.tsx", import.meta.url), "utf8");

test("following feed accepts only all and following modes", () => {
  assert.match(helpers, /value === "following" \? "following" : "all"/);
  assert.match(helpers, /FEED_MODES = \["all", "following"\]/);
});

test("following feed validates categories through the shared post category guard", () => {
  assert.match(helpers, /isPostCategory\(value\)/);
  assert.match(helpers, /type PostCategory/);
});

test("following feed URLs preserve language feed and category", () => {
  assert.match(helpers, /new URLSearchParams\(\{ lang: language, feed \}\)/);
  assert.match(helpers, /params\.set\("category", category\)/);
});

test("following feed copy is bilingual", () => {
  assert.match(helpers, /关注动态/);
  assert.match(helpers, /팔로잉 피드/);
});

test("following query derives ids from the current authenticated user then filters posts", () => {
  assert.match(homePage, /from\("user_follows"\)\.select\("following_id"\)\.eq\("follower_id", userId\)/);
  assert.match(homePage, /query = query\.in\("author_id", followingIds\)/);
  assert.doesNotMatch(homePage, /auth\.admin|service_role/);
});

test("following feed keeps one batched post profile query and batched interaction state", () => {
  assert.match(homePage, /profiles!posts_author_id_fkey\(username, display_name\)/);
  assert.match(homePage, /\.in\("post_id", postIds\)/);
  assert.doesNotMatch(homePage, /for \(const .*post.*await/);
});

test("following feed provides login CTA with safe internal returnTo", () => {
  assert.match(homeClient, /auth\/login\?lang=\$\{language\}&returnTo=\$\{encodeURIComponent\(hrefFor\(language, "following", category\)\)\}/);
  assert.match(homeClient, /feed === "following" && !authenticated/);
});

test("following feed tabs and category controls are accessible and URL driven", () => {
  assert.match(homeClient, /className="feed-tabs" aria-label/);
  assert.match(homeClient, /aria-current=\{feed === "all" \? "page" : undefined\}/);
  assert.match(homeClient, /navigate\(language, feed, item\)/);
});
