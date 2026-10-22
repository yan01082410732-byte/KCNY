import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { communityPage, FEED_PAGE_SIZE, NOTIFICATION_PAGE_SIZE, olderThanFilter, parseCommunityCursor } from "../lib/community-pagination.ts";
import { createUnreadCountLoader } from "../lib/notification-count.ts";
import { notificationReadSucceeded } from "../lib/notification-read.ts";
import { notificationTarget, notificationsHref } from "../lib/notifications.ts";
import { commentErrorMessage } from "../lib/comments.ts";
import { commentPageHref } from "../lib/comment-pagination.ts";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const id = (n) => `550e8400-e29b-41d4-a716-${String(n).padStart(12, "0")}`;
const stamp = "2026-10-20T10:00:00.123456+00:00";

for (const size of [FEED_PAGE_SIZE, NOTIFICATION_PAGE_SIZE]) {
  test(`descending community pagination visits 137 same-time rows exactly once (page size ${size})`, () => {
    let rows = Array.from({ length: 137 }, (_, i) => ({ id: id(137 - i), created_at: stamp }));
    const seen = [];
    while (rows.length) {
      const page = communityPage(rows.slice(0, size + 1), size);
      seen.push(...page.items.map((row) => row.id));
      if (!page.nextCursor) break;
      const cursor = parseCommunityCursor(page.nextCursor);
      assert.equal(cursor.createdAt, stamp);
      assert.match(olderThanFilter(cursor), /created_at\.lt\..*id\.lt\./);
      rows = rows.filter((row) => row.id < cursor.id);
    }
    assert.equal(seen.length, 137);
    assert.equal(new Set(seen).size, 137);
  });
}

test("community cursor rejects malformed and PostgREST-injected values", () => {
  for (const value of [null, "", "invalid", `${stamp}|${id(1)}|extra`, `${stamp}),post_id.neq.x|${id(1)}`, `${stamp}|wrong`]) assert.equal(parseCommunityCursor(value), undefined);
  assert.equal(communityPage([], 20).nextCursor, undefined);
  assert.equal(communityPage([{ id: id(1), created_at: stamp }], 20).nextCursor, undefined);
});

test("latest badge result wins over a late older response and disposal prevents updates", async () => {
  const pending = [], counts = [], failures = [];
  const loader = createUnreadCountLoader(() => new Promise((resolve) => pending.push(resolve)), (n) => counts.push(n), (v) => failures.push(v));
  const old = loader.refresh(), latest = loader.refresh();
  pending[1]({ count: 2, error: null }); await latest;
  pending[0]({ count: 8, error: null }); await old;
  assert.deepEqual(counts, [2]);
  assert.deepEqual(failures, [false]);
  const late = loader.refresh(); loader.dispose();
  pending[2]({ count: 7, error: null }); await late;
  assert.deepEqual(counts, [2]);
});

test("badge failures preserve known count and expose an unavailable state", async () => {
  const counts = [], failures = [];
  const loader = createUnreadCountLoader(async () => ({ count: null, error: { message: "private" } }), (n) => counts.push(n), (v) => failures.push(v));
  await loader.refresh();
  assert.deepEqual(counts, []); assert.deepEqual(failures, [true]);
  const thrown = createUnreadCountLoader(async () => { throw Error("private"); }, () => assert.fail(), (v) => failures.push(v));
  await thrown.refresh(); assert.deepEqual(failures, [true, true]);
});

test("notification mutation results require confirmed affected-row count", () => {
  assert.equal(notificationReadSucceeded(null, 1, true), true);
  assert.equal(notificationReadSucceeded(null, 0, true), false);
  assert.equal(notificationReadSucceeded(null, null, true), false);
  assert.equal(notificationReadSucceeded({ message: "private" }, 1, true), false);
  assert.equal(notificationReadSucceeded(null, 0, false), true);
});

for (const language of ["CN", "KR"]) test(`notification links preserve language and target related content (${language})`, () => {
  const path = notificationTarget({ type: "comment_reply", postId: id(1), commentId: id(2) }, language);
  const url = new URL(path, "https://kcny.example");
  assert.equal(url.pathname, `/posts/${id(1)}`);
  assert.equal(url.searchParams.get("comment"), id(2));
  assert.equal(url.searchParams.get("lang"), language);
  assert.equal(url.hash, `#comment-${id(2)}`);
  assert.equal(notificationTarget({ type: "new_follower", postId: null, actor: { username: "韩 user" } }, language), `/u/${encodeURIComponent("韩 user")}?lang=${language}`);
  assert.equal(notificationTarget({ type: "new_follower", postId: null }, language), notificationsHref(language));
  const focused = new URL(commentPageHref(id(1), language, undefined, id(2)), "https://kcny.example");
  assert.equal(focused.searchParams.get("comment"), id(2));
  assert.equal(commentErrorMessage("private backend details", language), undefined);
  assert.ok(commentErrorMessage("reply_failed", language));
});

// Execute actual Server Action bodies with framework and database dependencies mocked.
// This checks query ownership and success/failure paths without a network request.
let moduleNumber = 0;
async function actionFixture({ count = 1, error = null, reject = false, userId = id(10) } = {}) {
  const calls = [], revalidated = [];
  const chain = {
    update(...args) { calls.push(["update", ...args]); return chain; },
    eq(...args) { calls.push(["eq", ...args]); return chain; },
    is(...args) { calls.push(["is", ...args]); return chain; },
    then(resolve, fail) { return (reject ? Promise.reject(Error("private")) : Promise.resolve({ count, error })).then(resolve, fail); },
  };
  const key = `__kcnyActionTest${++moduleNumber}`;
  globalThis[key] = {
    createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: userId } } }) }, from: (table) => { calls.push(["from", table]); return chain; } }),
    normalizeLanguage: (value) => value === "KR" ? "KR" : "CN",
    isLanguage: (value) => value === "CN" || value === "KR",
    notificationReadSucceeded,
    revalidatePath: (path) => revalidated.push(path),
    redirect: (path) => { throw Error(`REDIRECT:${path}`); },
  };
  const source = read("app/notifications/actions.ts").replace(/^import .*;\r?\n/gm, "");
  const prelude = `const {createClient,normalizeLanguage,isLanguage,notificationReadSucceeded,revalidatePath,redirect}=globalThis[${JSON.stringify(key)}];\n`;
  const compiled = ts.transpileModule(prelude + source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const actions = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
  delete globalThis[key];
  const form = new FormData(); form.set("language", "CN"); form.set("notificationId", id(2)); form.set("recipientId", id(99));
  return { actions, calls, revalidated, form };
}

test("single read mutation uses session recipient and confirmed row, ignoring forged recipient", async () => {
  const f = await actionFixture();
  assert.deepEqual(await f.actions.markNotificationRead({ status: "idle" }, f.form), { status: "success" });
  assert.ok(f.calls.some((c) => c[0] === "eq" && c[1] === "recipient_id" && c[2] === id(10)));
  assert.ok(f.calls.some((c) => c[0] === "eq" && c[1] === "id" && c[2] === id(2)));
  assert.ok(!f.calls.some((c) => c.includes(id(99))));
  assert.deepEqual(f.revalidated, ["/notifications"]);
});

test("mark all is recipient-scoped and only touches unread rows; empty success is valid", async () => {
  const f = await actionFixture({ count: 0 });
  assert.deepEqual(await f.actions.markAllNotificationsRead({ status: "idle" }, f.form), { status: "success" });
  assert.ok(f.calls.some((c) => c[0] === "is" && c[1] === "read_at" && c[2] === null));
  assert.ok(f.calls.some((c) => c[0] === "eq" && c[1] === "recipient_id" && c[2] === id(10)));
});

for (const options of [{ count: 0 }, { error: { message: "private DB detail" } }, { reject: true }]) test(`single read failure is safe and never revalidated: ${JSON.stringify(options)}`, async () => {
  const f = await actionFixture(options);
  assert.deepEqual(await f.actions.markNotificationRead({ status: "idle" }, f.form), { status: "error" });
  assert.deepEqual(f.revalidated, []);
});

test("invalid notification id never writes, and anonymous caller redirects before writes", async () => {
  const invalid = await actionFixture(); invalid.form.set("notificationId", "bad");
  assert.deepEqual(await invalid.actions.markNotificationRead({ status: "idle" }, invalid.form), { status: "error" });
  assert.equal(invalid.calls.length, 0);
  const loggedOut = await actionFixture({ userId: null });
  await assert.rejects(loggedOut.actions.markAllNotificationsRead({ status: "idle" }, loggedOut.form), /REDIRECT:\/auth\/login/);
  assert.equal(loggedOut.calls.length, 0);
});

test("UI wiring includes pending/error state, safe reply focus and stable bounded queries", () => {
  const client = read("components/NotificationsPageClient.tsx");
  assert.match(client, /useActionState/); assert.match(client, /disabled=\{pending\}/); assert.match(client, /role="alert"/);
  assert.match(client, /NOTIFICATIONS_READ_EVENT/);
  const page = read("app/posts/[id]/page.tsx");
  assert.match(page, /\.eq\("post_id", id\)\.eq\("id", comment\)/);
  assert.match(read("components/PostDetailClient.tsx"), /id=\{`comment-\$\{comment.id\}`\}/);
  for (const path of ["app/page.tsx", "app/notifications/page.tsx"]) {
    const source = read(path);
    assert.match(source, /\.order\("id", \{ ascending: false \}\)/);
    assert.match(source, /olderThanFilter\(cursor\)/);
  }
});

async function notificationPageFixture(result, throwQuery = false) {
  const calls = [];
  const query = {
    select(...args) { calls.push(["select", ...args]); return query; },
    eq(...args) { calls.push(["eq", ...args]); return query; },
    order(...args) { calls.push(["order", ...args]); return query; },
    limit(...args) { calls.push(["limit", ...args]); return query; },
    or(...args) { calls.push(["or", ...args]); return query; },
    then(resolve, reject) { return (throwQuery ? Promise.reject(Error("private backend detail")) : Promise.resolve(result)).then(resolve, reject); },
  };
  const key = `__kcnyPageTest${++moduleNumber}`;
  globalThis[key] = {
    React: { createElement: (type, props) => ({ type, props }) },
    NotificationsPageClient: () => {},
    createClient: async () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: id(10) } } }) }, from: (table) => table === "profiles" ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { username: "synthetic" } }) }) }) } : query }),
    isLanguage: (lang) => lang === "CN" || lang === "KR", normalizeLanguage: () => "CN",
    communityPage, NOTIFICATION_PAGE_SIZE, olderThanFilter, parseCommunityCursor,
    logServiceFailure: () => {}, redirect: () => { throw Error("Unexpected redirect"); },
  };
  const source = read("app/notifications/page.tsx").replace(/^import .*;\r?\n/gm, "");
  const prelude = `const {${Object.keys(globalThis[key]).join(",")}}=globalThis[${JSON.stringify(key)}];\n`;
  const compiled = ts.transpileModule(prelude + source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const { default: Page } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
  delete globalThis[key];
  return { page: await Page({ searchParams: Promise.resolve({ lang: "KR" }) }), calls };
}

test("notification page maps comment targets and recipient-scoped 50-row pages", async () => {
  const data = Array.from({ length: 51 }, (_, i) => ({ id: id(100 - i), type: "comment_reply", post_id: id(1), comment_id: id(2), created_at: stamp, read_at: null, actor: { username: "actor" } }));
  const { page, calls } = await notificationPageFixture({ data, error: null });
  assert.equal(page.props.notifications.length, 50);
  assert.equal(page.props.notifications[0].commentId, id(2));
  assert.ok(page.props.nextCursor);
  assert.equal(page.props.unavailable, false);
  assert.ok(calls.some((c) => c[0] === "eq" && c[1] === "recipient_id" && c[2] === id(10)));
});

test("notification query failure is unavailable, not an empty-state success", async () => {
  for (const thrown of [false, true]) {
    const { page } = await notificationPageFixture({ data: null, error: { message: "private" } }, thrown);
    assert.equal(page.props.unavailable, true);
    assert.deepEqual(page.props.notifications, []);
  }
  const empty = await notificationPageFixture({ data: [], error: null });
  assert.equal(empty.page.props.unavailable, false);
});
