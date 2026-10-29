import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { followingFeedArgs, FOLLOWING_FEED_MAX_ROWS } from "../lib/following-feed-query.ts";
import { communityPage, FEED_PAGE_SIZE, olderThanFilter, parseCommunityCursor } from "../lib/community-pagination.ts";
import { isPostCategory, toPublicPosts } from "../lib/posts.ts";
import { applyViewerLikeState } from "../lib/post-likes.ts";
import { applyPostBookmarkState } from "../lib/post-bookmarks.ts";
import { contentLoadState } from "../lib/service-errors.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sql = read("supabase/migrations/20261029122609_following_feed_bounded_036.sql");
const id = (n) => `550e8400-e29b-41d4-a716-${String(n).padStart(12, "0")}`;
const stamp = "2026-10-29T10:00:00.123456+00:00";

test("036 RPC args are bounded and never accept a viewer identity", () => {
  assert.deepEqual(followingFeedArgs(), { p_category: null, p_before_created_at: null, p_before_id: null, p_limit: 21 });
  assert.equal(FOLLOWING_FEED_MAX_ROWS, 51);
  assert.equal(followingFeedArgs(undefined, undefined, 1).p_limit, 1);
  assert.equal(followingFeedArgs(undefined, undefined, 51).p_limit, 51);
  for (const limit of [null, 0, -1, 52, 1.5, NaN, Infinity, "21"]) {
    assert.throws(() => followingFeedArgs(undefined, undefined, limit), RangeError);
  }
  assert.deepEqual(Object.keys(followingFeedArgs()).sort(), ["p_before_created_at", "p_before_id", "p_category", "p_limit"]);
});

test("036 RPC args preserve category and microsecond paired cursor exactly", () => {
  const cursor = parseCommunityCursor(`${stamp}|${id(50)}`);
  assert.deepEqual(followingFeedArgs("study", cursor, 21), {
    p_category: "study", p_before_created_at: stamp, p_before_id: id(50), p_limit: 21,
  });
});

test("036 SQL derives identity and retains invoker RLS with authenticated-only execute", () => {
  assert.match(sql, /returns setof public\.posts/i);
  assert.match(sql, /stable\s+security invoker\s+set search_path = pg_catalog/i);
  assert.match(sql, /viewer_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /if viewer_id is null then\s+raise exception using errcode = '42501'/i);
  const signature = "public\\.following_feed_page\\(text, timestamptz, uuid, integer\\)";
  assert.match(sql, new RegExp(`revoke execute on function ${signature} from public, anon, authenticated`, "i"));
  assert.match(sql, new RegExp(`grant execute on function ${signature} to authenticated`, "i"));
  const parameters = sql.match(/create function public\.following_feed_page\(([\s\S]*?)\)\s*returns/i)?.[1];
  assert.ok(parameters);
  assert.doesNotMatch(parameters, /viewer|follower|user_id/i);
  assert.doesNotMatch(sql, /security definer|service_role|create policy|alter policy|drop policy|disable row level security/i);
});

test("036 SQL validates limit, category and complete finite cursor before reading posts", () => {
  assert.match(sql, /p_limit is null or p_limit < 1 or p_limit > 51/);
  assert.match(sql, /p_category not in \('culture', 'language', 'travel', 'study', 'daily', 'other'\)/);
  assert.match(sql, /\(p_before_created_at is null\) <> \(p_before_id is null\)/);
  assert.match(sql, /not pg_catalog\.isfinite\(p_before_created_at\)/);
  assert.equal((sql.match(/errcode = '22023'/g) ?? []).length, 3);
  assert.ok(sql.indexOf("Invalid following feed cursor") < sql.indexOf("return query"));
});

test("036 SQL filters membership, category and composite cursor before ordered limit", () => {
  const query = sql.slice(sql.indexOf("return query"), sql.indexOf("end;\n$$"));
  assert.match(query, /f\.follower_id = viewer_id and f\.following_id = p\.author_id/);
  assert.match(query, /p\.author_id <> viewer_id/);
  assert.match(query, /p_category is null or p\.category = p_category/);
  assert.match(query, /\(p\.created_at, p\.id\) < \(p_before_created_at, p_before_id\)/);
  assert.match(query, /order by p\.created_at desc, p\.id desc\s+limit p_limit/);
  assert.ok(query.indexOf("f.follower_id") < query.indexOf("limit p_limit"));
  assert.ok(query.indexOf("p.category = p_category") < query.indexOf("limit p_limit"));
  assert.doesNotMatch(query, /\boffset\b|array_agg|string_agg/i);
  assert.match(sql, /on public\.posts \(author_id, created_at desc, id desc\)/);
  assert.equal((sql.match(/create index/gi) ?? []).length, 1);
});

// Execute the real server page with framework/database dependencies replaced.
// These tests verify application contracts, not deployed SQL/RLS behavior.
let fixtureNumber = 0;
async function loadModule(path, dependencies) {
  const key = `__kcnyFollowing036${++fixtureNumber}`;
  globalThis[key] = dependencies;
  const source = read(path).replace(/^import .*;\r?\n/gm, "");
  const prelude = `const {${Object.keys(dependencies).join(",")}}=globalThis[${JSON.stringify(key)}];\n`;
  const compiled = ts.transpileModule(prelude + source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  try { return await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`); }
  finally { delete globalThis[key]; }
}

const feedHelpers = await loadModule("lib/following-feed.ts", { isPostCategory });
const row = (n) => ({
  id: id(n), author_id: id(200), title: `Synthetic post ${n}`, content: "Synthetic content",
  category: "study", language: "KR", created_at: stamp,
  author: { username: "synthetic-author", display_name: "Synthetic author" },
  comments: [{ count: 7 }], post_likes: [{ count: 3 }],
});

async function pageFixture({ rows = [], rpcError = null, rejectRpc = false, userId = id(100), claimsError = null, params = {} } = {}) {
  const calls = [], failures = [];
  function query(table) {
    const chain = {};
    for (const method of ["select", "eq", "in", "order", "limit", "or"]) {
      chain[method] = (...args) => { calls.push([table, method, ...args]); return chain; };
    }
    chain.maybeSingle = async () => ({ data: { username: "synthetic-viewer", display_name: null }, error: null });
    chain.then = (resolve, reject) => {
      if (table === "rpc" && rejectRpc) return Promise.reject(Error("private backend failure")).then(resolve, reject);
      const data = table === "rpc" || table === "posts" ? rows : table === "post_likes" || table === "post_bookmarks" ? [{ post_id: rows[0]?.id }] : [];
      return Promise.resolve({ data, error: table === "rpc" ? rpcError : null }).then(resolve, reject);
    };
    return chain;
  }
  const supabase = {
    auth: { getClaims: async () => ({ data: { claims: { sub: userId } }, error: claimsError }) },
    from: (table) => { calls.push([table, "from"]); return query(table); },
    rpc: (name, args) => { calls.push(["rpc", name, args]); return query("rpc"); },
  };
  const { default: Page } = await loadModule("app/page.tsx", {
    React: { createElement: (type, props) => ({ type, props }) }, HomePageClient: () => {},
    ...feedHelpers, followingFeedArgs, toPublicPosts, applyViewerLikeState, applyPostBookmarkState,
    createClient: async () => supabase, contentLoadState,
    logServiceFailure: (operation) => failures.push(operation),
    communityPage, FEED_PAGE_SIZE, olderThanFilter, parseCommunityCursor,
    isLanguage: (value) => value === "CN" || value === "KR", normalizeLanguage: (value) => value === "KR" ? "KR" : "CN",
    redirect: (href) => { throw Error(`REDIRECT:${href}`); },
  });
  return { page: await Page({ searchParams: Promise.resolve({ lang: "KR", feed: "following", ...params }) }), calls, failures };
}

test("036 following page requests 21 rows with filters inside RPC and preserves public nested fields", async () => {
  const rows = Array.from({ length: 21 }, (_, i) => row(50 - i));
  const { page, calls } = await pageFixture({ rows, params: { category: "study", before: `${stamp}|${id(99)}` } });
  assert.deepEqual(calls.find((call) => call[0] === "rpc" && call[1] !== "select"), ["rpc", "following_feed_page", {
    p_category: "study", p_before_created_at: stamp, p_before_id: id(99), p_limit: 21,
  }]);
  assert.equal(calls.filter((call) => call[0] === "rpc" && call[1] === "following_feed_page").length, 1);
  assert.match(calls.find((call) => call[0] === "rpc" && call[1] === "select")[2], /author:profiles!posts_author_id_fkey\(username, display_name\), comments\(count\), post_likes\(count\)/);
  assert.deepEqual(calls.filter((call) => call[0] === "rpc" && call[1] === "order"), [
    ["rpc", "order", "created_at", { ascending: false }], ["rpc", "order", "id", { ascending: false }],
  ]);
  assert.ok(!calls.some((call) => call[0] === "posts" || call[0] === "user_follows"));
  assert.equal(page.props.posts.length, 20);
  assert.equal(page.props.nextCursor, `${stamp}|${id(31)}`);
  assert.equal(page.props.posts[0].author.username, "synthetic-author");
  assert.equal(page.props.posts[0].comment_count, 7);
  assert.equal(page.props.posts[0].likeCount, 3);
  assert.equal(page.props.posts[0].likedByCurrentUser, true);
  assert.equal(page.props.posts[0].bookmarkedByCurrentUser, true);
  assert.equal(page.props.contentUnavailable, false);
  for (const table of ["post_likes", "post_bookmarks"]) {
    assert.equal(calls.filter((call) => call[0] === table && call[1] === "from").length, 1);
    assert.equal(calls.find((call) => call[0] === table && call[1] === "in")[3].length, 20);
  }
});

test("036 anonymous following view keeps login CTA without RPC or public-post fallback", async () => {
  const { page, calls } = await pageFixture({ userId: null });
  assert.equal(page.props.authenticated, false);
  assert.equal(page.props.contentUnavailable, false);
  assert.deepEqual(page.props.posts, []);
  assert.equal(calls.length, 0);
});

test("036 following empty state and failures stay distinct without all-feed fallback", async () => {
  const empty = await pageFixture();
  assert.equal(empty.page.props.contentUnavailable, false);
  assert.deepEqual(empty.page.props.posts, []);
  for (const options of [{ rpcError: { message: "private" }, rows: [row(1)] }, { rejectRpc: true }, { rows: null }, { rows: row(1) }]) {
    const { page, calls, failures } = await pageFixture(options);
    assert.equal(page.props.contentUnavailable, true);
    assert.deepEqual(page.props.posts, []);
    assert.equal(page.props.nextCursor, undefined);
    assert.ok(!calls.some((call) => call[0] === "posts" || call[0] === "user_follows"));
    assert.equal(failures.length, 1);
  }
});

test("036 auth lookup failure remains unavailable while missing session stays logged out", async () => {
  const failed = await pageFixture({ userId: null, claimsError: { name: "AuthRetryableFetchError" } });
  assert.equal(failed.page.props.contentUnavailable, true);
  assert.equal(failed.calls.length, 0);
  const missing = await pageFixture({ userId: null, claimsError: { name: "AuthSessionMissingError" } });
  assert.equal(missing.page.props.contentUnavailable, false);
});

test("036 all-feed query retains existing ordering, filters, lookahead and no RPC", async () => {
  const { page, calls } = await pageFixture({ rows: [row(1)], userId: null, params: { feed: "all", category: "study", before: `${stamp}|${id(9)}` } });
  assert.equal(page.props.posts.length, 1);
  assert.ok(!calls.some((call) => call[0] === "rpc" || call[0] === "user_follows"));
  assert.deepEqual(calls.filter((call) => call[0] === "posts" && call[1] !== "select"), [
    ["posts", "from"], ["posts", "order", "created_at", { ascending: false }],
    ["posts", "order", "id", { ascending: false }], ["posts", "limit", 21],
    ["posts", "eq", "category", "study"], ["posts", "or", olderThanFilter({ createdAt: stamp, id: id(9) })],
  ]);
});
