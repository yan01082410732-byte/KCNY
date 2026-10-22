import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isSearchType, mergeRecentSearchRows, mergeUniqueByKey, normalizeSearchQuery, parseSearchCursor, parseSearchFilters, phaseSearchPage, searchHref, searchLabels, searchLikePattern, searchPage, toPublicSearchProfiles } from "../lib/search.ts";

const page = readFileSync(new URL("../app/search/page.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../components/SearchPageClient.tsx", import.meta.url), "utf8");
const header = readFileSync(new URL("../components/Header.tsx", import.meta.url), "utf8");

test("search accepts post and user result types", () => {
  assert.equal(isSearchType("posts"), true);
  assert.equal(isSearchType("users"), true);
});
test("search rejects unknown result types", () => assert.equal(isSearchType("bookmarks"), false));
test("search query trims and collapses whitespace", () => assert.equal(normalizeSearchQuery("  China   Korea  "), "China Korea"));
test("search query limits input length", () => assert.equal(normalizeSearchQuery("a".repeat(100)).length, 80));
test("search query rejects non-string input", () => assert.equal(normalizeSearchQuery(undefined), ""));
test("search like pattern escapes wildcard characters", () => assert.equal(searchLikePattern("100%_ready"), "%100\\%\\_ready%"));
test("search profile mapping exposes only public identity fields", () => {
  assert.deepEqual(toPublicSearchProfiles([{ username: "kcny", display_name: "KCNY", email: "private@example.com", id: "private" }]), [{ username: "kcny", display_name: "KCNY" }]);
});
test("search profile mapping drops invalid rows", () => assert.deepEqual(toPublicSearchProfiles([{ display_name: "No user" }]), []));
test("search result merging removes duplicate rows", () => assert.deepEqual(mergeUniqueByKey([{ id: "a" }, { id: "a" }, { id: "b" }], "id"), [{ id: "a" }, { id: "b" }]));
test("CN search labels are available", () => assert.equal(searchLabels("CN").posts, "帖子"));
test("KR search labels are available", () => assert.equal(searchLabels("KR").users, "회원"));
test("search page queries title and content independently without raw user filters", () => {
  assert.match(page, /makeQuery\("title"\)/);
  assert.match(page, /makeQuery\("content"\)/);
  assert.match(page, /\.ilike\(field, pattern\)/);
  assert.match(page, /\.or\(olderThanFilter\(/);
  assert.doesNotMatch(page, /\.or\(pattern\)/);
});
test("search page queries username and display name with public fields only", () => {
  assert.match(page, /select\("username, display_name"\)/);
  assert.match(page, /makeQuery\("username"\)/);
  assert.match(page, /makeQuery\("display_name", true\)/);
  assert.doesNotMatch(page, /email|PUBLIC_PROFILE_FIELDS/);
});
test("search uses current viewer data only for likes and bookmarks", () => {
  assert.match(page, /from\("post_bookmarks"\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.doesNotMatch(page, /auth\.admin|service_role/);
});
test("search results include safe encoded profile links", () => assert.match(client, /encodeURIComponent\(user\.username\)/));
test("search page provides posts and users tabs", () => {
  assert.match(client, /searchHref\("posts"\)/);
  assert.match(client, /searchHref\("users"\)/);
});
test("search page has an empty result state", () => assert.match(client, /text\.empty/));
test("header links to the bilingual search page", () => assert.match(header, /\/search\?lang=\$\{language\}/));

test("search filters accept only supported category, language and sort", () => {
  assert.deepEqual(parseSearchFilters({ category: "travel", postLanguage: "KR", sort: "relevant" }), { category: "travel", postLanguage: "KR", sort: "relevant" });
  assert.deepEqual(parseSearchFilters({ category: "private", postLanguage: "EN", sort: "popular" }), { category: undefined, postLanguage: undefined, sort: "recent" });
});
test("search URLs preserve query and filters while dropping stale cursor", () => {
  const href = searchHref("KR", "posts", "중국 여행", { category: "travel", postLanguage: "CN", sort: "recent" });
  assert.equal(href, "/search?lang=KR&type=posts&q=%EC%A4%91%EA%B5%AD+%EC%97%AC%ED%96%89&category=travel&postLanguage=CN&sort=recent");
  assert.equal(searchHref("CN", "users", "测试", { before: "u|alice" }).includes("before=u%7Calice"), true);
});
test("search cursors reject malformed or cross-sort values", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(parseSearchCursor(`r|2026-10-20T00:00:00Z|${id}`, "posts", "recent")?.id, id);
  assert.equal(parseSearchCursor(`r|2026-10-20T00:00:00Z|${id}`, "posts", "relevant"), undefined);
  assert.equal(parseSearchCursor("u|alice", "users", "recent")?.username, "alice");
  assert.equal(parseSearchCursor("u|alice,or(true)", "users", "recent"), undefined);
  assert.equal(parseSearchCursor("b", "posts", "relevant")?.phase, "b");
});
test("recent merged search pagination is deterministic and deduplicated across 257 rows", () => {
  const rows = Array.from({ length: 257 }, (_, index) => ({ id: String(index).padStart(3, "0"), created_at: `2026-10-20T00:${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}Z` }));
  const title = rows.filter((_, index) => index % 2 === 0);
  const body = rows.filter((_, index) => index % 3 !== 0);
  const expected = mergeRecentSearchRows(title, body);
  const seen = [];
  let cursor;
  do {
    const left = title.filter((row) => !cursor || row.created_at < cursor.created_at || (row.created_at === cursor.created_at && row.id < cursor.id)).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)).slice(0, 21);
    const right = body.filter((row) => !cursor || row.created_at < cursor.created_at || (row.created_at === cursor.created_at && row.id < cursor.id)).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)).slice(0, 21);
    const page = searchPage(mergeRecentSearchRows(left, right));
    seen.push(...page.items);
    cursor = page.hasMore ? page.last : undefined;
  } while (cursor);
  assert.deepEqual(seen.map((row) => row.id), expected.map((row) => row.id));
});
test("relevance grouping fills title results before content-only and reports the next phase", () => {
  const page = phaseSearchPage(Array.from({ length: 12 }, (_, id) => `title-${id}`), Array.from({ length: 21 }, (_, id) => `body-${id}`));
  assert.equal(page.items.length, 20);
  assert.equal(page.items[11], "title-11");
  assert.equal(page.items[12], "body-0");
  assert.equal(page.primaryMore, false);
  assert.equal(page.secondaryMore, true);
});
