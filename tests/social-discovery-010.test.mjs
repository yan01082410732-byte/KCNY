import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOLLOW_LIST_PAGE_SIZE, followListHref, followListPage, olderFollowFilter, parseFollowCursor, toPublicFollowProfiles } from "../lib/user-follows.ts";

const followers = readFileSync(new URL("../app/u/[username]/followers/page.tsx", import.meta.url), "utf8");
const following = readFileSync(new URL("../app/u/[username]/following/page.tsx", import.meta.url), "utf8");
const list = readFileSync(new URL("../components/FollowListClient.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../components/HomePageClient.tsx", import.meta.url), "utf8");
const card = readFileSync(new URL("../components/PostCard.tsx", import.meta.url), "utf8");
const feed = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

const uuid = (n) => `00000000-0000-0000-0000-${n.toString(16).padStart(12, "0")}`;
const rows = Array.from({ length: 51 }, (_, index) => ({ created_at: "2026-10-20T00:00:00+00:00", follower_id: uuid(100 - index), following_id: uuid(200 - index) }));

for (const kind of ["followers", "following"]) {
  test(`${kind} keyset pages are bounded and contain no duplicate relation`, () => {
    const column = kind === "followers" ? "follower_id" : "following_id";
    const first = followListPage(rows.slice(0, FOLLOW_LIST_PAGE_SIZE + 1), kind);
    const second = followListPage(rows.slice(FOLLOW_LIST_PAGE_SIZE, 2 * FOLLOW_LIST_PAGE_SIZE + 1), kind);
    const third = followListPage(rows.slice(2 * FOLLOW_LIST_PAGE_SIZE), kind);
    assert.equal(first.items.length, 20);
    assert.equal(second.items.length, 20);
    assert.equal(third.items.length, 11);
    assert.equal(third.nextCursor, undefined);
    assert.equal(new Set([...first.items, ...second.items, ...third.items].map((row) => row[column])).size, 51);
    assert.deepEqual(parseFollowCursor(first.nextCursor), { createdAt: rows[19].created_at, relatedId: rows[19][column] });
    assert.match(olderFollowFilter(parseFollowCursor(first.nextCursor), kind), new RegExp(`${column}\\.lt\\.${rows[19][column]}`));
  });
}

test("follow cursors reject malformed or injected values", () => {
  for (const value of ["bad", "2026-10-20|wrong", "2026-10-20T00:00:00Z|x,or(id.eq.foo)", "2026-10-20T00:00:00Z|" + uuid(1) + "|extra", "x".repeat(101)]) assert.equal(parseFollowCursor(value), undefined);
});

test("follow list URLs preserve owner, language and cursor", () => {
  const href = followListHref("한 글", "followers", "KR", `${rows[0].created_at}|${rows[0].follower_id}`);
  const url = new URL(href, "https://example.test");
  assert.equal(url.pathname, "/u/%ED%95%9C%20%EA%B8%80/followers");
  assert.equal(url.searchParams.get("lang"), "KR");
  assert.equal(url.searchParams.get("before"), `${rows[0].created_at}|${rows[0].follower_id}`);
});

test("both relationship routes apply bounded keyset queries and only select public profile fields", () => {
  for (const [source, kind, tie] of [[followers, "followers", "follower_id"], [following, "following", "following_id"]]) {
    assert.match(source, new RegExp(`olderFollowFilter\\(cursor, "${kind}"\\)`));
    assert.match(source, new RegExp(`\\.order\\("${tie}", \\{ ascending: false \\}\\)`));
    assert.match(source, /\.limit\(FOLLOW_LIST_PAGE_SIZE \+ 1\)/);
    assert.match(source, /\(username, display_name\)/);
    assert.doesNotMatch(source, /select\("\*"\)/);
  }
  assert.deepEqual(toPublicFollowProfiles([{ username: "visible", display_name: null, email: "secret" }]), [{ username: "visible", display_name: null }]);
  assert.match(list, /followListHref\(profileUsername, title, language, nextCursor\)/);
  assert.match(list, /href=\{`\/u\/\$\{encodeURIComponent\(profile\.username\)\}\?lang=\$\{language\}`\}/);
});

test("category browsing preserves feed and language, clears category, and retains stable feed pagination", () => {
  assert.match(home, /href=\{followingFeedHref\(language, feed\)\}/);
  assert.match(home, /aria-current=\{category === item \? "page" : undefined\}/);
  assert.match(home, /href=\{followingFeedHref\(language, feed, item\)\}/);
  assert.match(home, /category \? text\.categoryEmpty/);
  assert.match(feed, /\.eq\("category", category\)/);
  assert.match(feed, /\.or\(olderThanFilter\(cursor\)\)/);
});

test("post cards connect author, category and detail routes", () => {
  assert.match(card, /authorHref = `\/u\/\$\{encodeURIComponent\(author\.username\)\}\?lang=\$\{language\}`/);
  assert.match(card, /followingFeedHref\(language, "all", post\.category\)/);
  assert.match(card, /href=\{postHref\}/);
});
