import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isSearchType, mergeUniqueByKey, normalizeSearchQuery, searchLabels, searchLikePattern, toPublicSearchProfiles } from "../lib/search.ts";

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
test("search page queries title and content independently without raw or filters", () => {
  assert.match(page, /\.ilike\("title", pattern\)/);
  assert.match(page, /\.ilike\("content", pattern\)/);
  assert.doesNotMatch(page, /\.or\(/);
});
test("search page queries username and display name with public fields only", () => {
  assert.match(page, /select\("username, display_name"\)/);
  assert.match(page, /\.ilike\("username", pattern\)/);
  assert.match(page, /\.ilike\("display_name", pattern\)/);
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
