import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import {
  createNotificationRefreshController,
  NOTIFICATION_EVENT_COOLDOWN_MS,
  NOTIFICATION_MAX_BACKOFF_MS,
  NOTIFICATION_POLL_MS,
  NOTIFICATION_REQUEST_TIMEOUT_MS,
} from "../lib/notification-refresh.ts";
import * as notificationCounts from "../lib/notification-count.ts";
import { unreadBadge } from "../lib/notifications.ts";
const { createUnreadCountLoader, notificationCountLabel, NOTIFICATIONS_READ_EVENT } = notificationCounts;

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
test("038 default clock uses lexical wrappers for Window timer receiver safety", () => {
  const source=readFileSync('lib/notification-refresh.ts','utf8');
  assert.match(source,/setTimeout: \(callback: \(\) => void, delay: number\) => setTimeout\(callback, delay\)/);
  assert.match(source,/clearTimeout: \(timer: Timer\) => clearTimeout\(timer\)/);
});
function fakeClock() {
  let now = 0, nextId = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    size: () => timers.size,
    async advance(ms) {
      const target = now + ms;
      let iterations = 0;
      while (true) {
        const next = [...timers.entries()].filter(([, value]) => value.due <= target).sort((a, b) => a[1].due - b[1].due || a[0] - b[0])[0];
        if (!next) break;
        assert.ok(iterations++ < 1000, "no runaway timers");
        now = next[1].due;
        timers.delete(next[0]);
        next[1].callback();
        await flush();
      }
      now = target;
      await flush();
    },
  };
}
function harness() {
  const clock = fakeClock(), requests = [], updates = [];
  let visible = true;
  const controller = createNotificationRefreshController({
    clock,
    isVisible: () => visible,
    update: (state) => updates.push(state),
    load: (identity, signal) => new Promise((resolve, reject) => requests.push({ identity, signal, resolve, reject, at: clock.now() })),
  });
  return {
    clock, requests, updates, controller,
    visible(next) { visible = next; controller.visibilityChanged(); },
    latest: () => updates.at(-1),
    async respond(count, error = null, index = requests.length - 1) { requests[index].resolve({ count, error }); await flush(); },
  };
}

test("038 polling starts only with an authenticated identity and runs every 25 seconds", async () => {
  const h = harness();
  h.controller.refresh();
  await h.clock.advance(120_000);
  assert.equal(h.requests.length, 0);
  h.controller.setIdentity("account-a");
  assert.deepEqual(h.latest(), { count: null, unavailable: false });
  await h.clock.advance(0);
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].identity, "account-a");
  await h.respond(3);
  await h.clock.advance(NOTIFICATION_POLL_MS - 1);
  assert.equal(h.requests.length, 1);
  await h.clock.advance(1);
  assert.equal(h.requests.length, 2);
  h.controller.dispose();
});

test("038 a hidden tab has no polls and becomes immediately eligible on visibility", async () => {
  const h = harness();
  h.visible(false);
  h.controller.setIdentity("account-a");
  h.controller.refresh();
  await h.clock.advance(300_000);
  assert.equal(h.clock.size(), 0);
  assert.equal(h.requests.length, 0);
  h.visible(true);
  await h.clock.advance(0);
  assert.equal(h.requests.length, 1);
  await h.respond(4);
  h.visible(false);
  assert.equal(h.clock.size(), 0);
  await h.clock.advance(300_000);
  assert.equal(h.requests.length, 1);
  h.visible(true);
  await h.clock.advance(0);
  assert.equal(h.requests.length, 2);
  h.controller.dispose();
});

test("038 hiding aborts an in-flight request without clearing count or reporting a failure", async () => {
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0); await h.respond(5);
  await h.clock.advance(NOTIFICATION_POLL_MS);
  h.visible(false);
  assert.equal(h.requests[1].signal.aborted, true);
  assert.equal(h.clock.size(), 0);
  await h.respond(99, null, 1);
  assert.deepEqual(h.latest(), { count: 5, unavailable: false });
  h.controller.dispose();
});

test("038 identity switching immediately resets old count and discards old account responses", async () => {
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0); await h.respond(7);
  await h.clock.advance(NOTIFICATION_POLL_MS);
  h.controller.setIdentity("account-b");
  assert.deepEqual(h.latest(), { count: null, unavailable: false });
  assert.equal(h.requests[1].signal.aborted, true);
  await h.clock.advance(0);
  assert.equal(h.requests[2].identity, "account-b");
  await h.respond(2, null, 2);
  await h.respond(90, null, 1);
  assert.deepEqual(h.latest(), { count: 2, unavailable: false });
  h.controller.setIdentity(null);
  assert.deepEqual(h.latest(), { count: null, unavailable: false });
  assert.equal(h.clock.size(), 0);
  await h.clock.advance(300_000);
  assert.equal(h.requests.length, 3);
  h.controller.dispose();
});

test("038 logout cancels a live request and same-identity auth events do not duplicate polls", async () => {
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0);
  for (let i = 0; i < 30; i++) h.controller.setIdentity("account-a");
  assert.equal(h.requests.length, 1);
  h.controller.setIdentity(null);
  assert.equal(h.requests[0].signal.aborted, true);
  await h.respond(42);
  assert.deepEqual(h.latest(), { count: null, unavailable: false });
  assert.equal(h.clock.size(), 0);
  h.controller.dispose();
});

test("038 focus/read/online storms coalesce to one trailing request without overlap", async () => {
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0);
  for (let i = 0; i < 100; i++) h.controller.refresh();
  await h.clock.advance(500);
  assert.equal(h.requests.length, 1);
  await h.respond(5);
  await h.clock.advance(NOTIFICATION_EVENT_COOLDOWN_MS - 501);
  assert.equal(h.requests.length, 1);
  await h.clock.advance(1);
  assert.equal(h.requests.length, 2);
  await h.respond(4);
  await h.clock.advance(NOTIFICATION_POLL_MS - 1);
  assert.equal(h.requests.length, 2);
  await h.clock.advance(1);
  assert.equal(h.requests.length, 3);
  h.controller.dispose();
});

test("038 failed reads preserve last count and back off 50/100/120 seconds, then recover", async () => {
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0); await h.respond(6);
  await h.clock.advance(NOTIFICATION_POLL_MS);
  for (const delay of [50_000, 100_000, NOTIFICATION_MAX_BACKOFF_MS, NOTIFICATION_MAX_BACKOFF_MS]) {
    await h.respond(null, { message: "private error never rendered" });
    assert.deepEqual(h.latest(), { count: 6, unavailable: true });
    const before = h.requests.length;
    await h.clock.advance(delay - 1); assert.equal(h.requests.length, before);
    await h.clock.advance(1); assert.equal(h.requests.length, before + 1);
  }
  await h.respond(9);
  assert.deepEqual(h.latest(), { count: 9, unavailable: false });
  const before = h.requests.length;
  await h.clock.advance(NOTIFICATION_POLL_MS);
  assert.equal(h.requests.length, before + 1);
  h.controller.dispose();
});

test("038 successful zero is distinct from unknown or malformed count", async () => {
  for (const count of [null, -1, 1.5, NaN, Infinity]) {
    const h = harness();
    h.controller.setIdentity("account-a"); await h.clock.advance(0); await h.respond(count);
    assert.deepEqual(h.latest(), { count: null, unavailable: true });
    h.controller.dispose();
  }
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0); await h.respond(0);
  assert.deepEqual(h.latest(), { count: 0, unavailable: false });
  h.controller.dispose();
});

test("038 hung requests time out at ten seconds and recover after bounded backoff", async () => {
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0);
  await h.clock.advance(NOTIFICATION_REQUEST_TIMEOUT_MS - 1);
  assert.equal(h.requests[0].signal.aborted, false);
  await h.clock.advance(1);
  assert.equal(h.requests[0].signal.aborted, true);
  assert.deepEqual(h.latest(), { count: null, unavailable: true });
  await h.clock.advance(50_000);
  assert.equal(h.requests.length, 2);
  await h.respond(3, null, 1);
  await h.respond(99, null, 0);
  assert.deepEqual(h.latest(), { count: 3, unavailable: false });
  h.controller.dispose();
});

test("038 online/focus resync can recover before a long backoff ends", async () => {
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0);
  h.requests[0].reject(new Error("offline")); await flush();
  await h.clock.advance(2000);
  h.controller.refresh(); await h.clock.advance(0);
  assert.equal(h.requests.length, 2);
  await h.respond(8);
  assert.deepEqual(h.latest(), { count: 8, unavailable: false });
  h.controller.dispose();
});

test("038 dispose aborts requests, clears timers and makes every late event inert", async () => {
  const h = harness();
  h.controller.setIdentity("account-a"); await h.clock.advance(0);
  h.controller.refresh();
  h.controller.dispose(); h.controller.dispose();
  assert.equal(h.requests[0].signal.aborted, true);
  const updateCount = h.updates.length;
  await h.respond(99);
  h.controller.setIdentity("account-b"); h.controller.refresh(); h.visible(true); h.controller.unavailable();
  await h.clock.advance(300_000);
  assert.equal(h.requests.length, 1);
  assert.equal(h.updates.length, updateCount);
  assert.equal(h.clock.size(), 0);
});

test("038 two visible tabs have independent bounded polls and hidden tabs have none", async () => {
  const first = harness(), second = harness();
  first.controller.setIdentity("account-a"); second.controller.setIdentity("account-a");
  await first.clock.advance(0); await second.clock.advance(0);
  await first.respond(5); await second.respond(5);
  // A read invalidation does not supply or trust the other tab's count/identity.
  first.controller.refresh(); second.controller.refresh();
  await first.clock.advance(1000); await second.clock.advance(1000);
  await first.respond(4); await second.respond(4);
  second.visible(false);
  await first.clock.advance(NOTIFICATION_POLL_MS); await second.clock.advance(NOTIFICATION_POLL_MS);
  assert.equal(first.requests.length, 3);
  assert.equal(second.requests.length, 2);
  first.controller.dispose(); second.controller.dispose();
});

for (const language of ["CN", "KR"]) test(`038 ${language} labels distinguish unknown, unavailable, confirmed zero and stale values`, () => {
  const unknown = notificationCountLabel(language, null, false);
  const failed = notificationCountLabel(language, null, true);
  const zero = notificationCountLabel(language, 0, false);
  const stale = notificationCountLabel(language, 12, true);
  assert.equal(new Set([unknown, failed, zero, stale]).size, 4);
  assert.doesNotMatch(unknown, /0/);
  assert.doesNotMatch(failed, /0/);
  assert.match(zero, /0/);
  assert.match(stale, /12/);
});

test("038 legacy count loader also refuses to turn a missing count into zero", async () => {
  const counts = [], failures = [];
  const loader = createUnreadCountLoader(async () => ({ count: null, error: null }), (n) => counts.push(n), (v) => failures.push(v));
  await loader.refresh();
  assert.deepEqual(counts, []);
  assert.deepEqual(failures, [true]);
});

test("038 bell binds authenticated recipient, cancellation, lifecycle and non-secret cross-tab invalidation", () => {
  const bell = readFileSync(new URL("../components/NotificationBell.tsx", import.meta.url), "utf8");
  assert.match(bell, /\.eq\("recipient_id", recipientId\)/);
  assert.match(bell, /head: true/);
  assert.match(bell, /\.abortSignal\(signal\)/);
  assert.match(bell, /auth\.getSession\(\)/);
  assert.match(bell, /auth\.onAuthStateChange/);
  assert.match(bell, /subscription\.unsubscribe\(\)/);
  assert.match(bell, /loader\.dispose\(\)/);
  assert.match(bell, /channel\?\.close\(\)/);
  assert.match(bell, /channel\?\.postMessage\("read"\)/);
  assert.match(bell, /event\.data === "read"/);
  assert.match(bell, /snapshot\.path === pathname/);
  for (const event of ["focus", "online", "visibilitychange"]) {
    assert.match(bell, new RegExp(`addEventListener\\("${event}"`));
    assert.match(bell, new RegExp(`removeEventListener\\("${event}"`));
  }
  assert.doesNotMatch(bell, /postgres_changes|service_role|console\./);
});

// Execute the actual TSX effect with small React/DOM adapters. These tests cover
// auth races and browser wiring, not browser rendering (verified separately).
const bellJavaScript = ts.transpileModule(readFileSync(new URL("../components/NotificationBell.tsx", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
function channelHub() {
  const channels = new Set(), messages = [];
  return {
    channels, messages,
    Channel: class {
      constructor(name) { this.name = name; this.onmessage = null; channels.add(this); }
      postMessage(data) { messages.push(data); for (const other of channels) if (other !== this && other.name === this.name) other.onmessage?.({ data }); }
      close() { channels.delete(this); }
    },
  };
}
function bellHarness(hub = channelHub(), pollingEnabled = true) {
  const clock = fakeClock(), requests = [], sessions = [], hooks = [], effects = [];
  const window = new EventTarget(), document = new EventTarget();
  document.visibilityState = "visible";
  let path = "/", hookIndex = 0, authCallback, subscriptions = 0;
  const supabase = {
    auth: {
      onAuthStateChange(callback) { authCallback = callback; subscriptions++; return { data: { subscription: { unsubscribe() { subscriptions--; } } } }; },
      getSession() { return new Promise((resolve, reject) => sessions.push({ resolve, reject })); },
    },
    from(table) {
      const query = { table, filters: [] };
      const builder = {
        select(columns, options) { Object.assign(query, { columns, options }); return builder; },
        eq(column, value) { query.filters.push([column, value]); return builder; },
        is(column, value) { query.filters.push([column, value]); return builder; },
        abortSignal(signal) { return new Promise((resolve) => requests.push({ ...query, signal, resolve })); },
      };
      return builder;
    },
  };
  const imports = {
    react: {
      useState(initial) { const index = hookIndex++; if (!hooks[index]) hooks[index] = { value: initial }; return [hooks[index].value, (value) => { hooks[index].value = value; }]; },
      useEffect(effect, dependencies) {
        const index = hookIndex++;
        if (!hooks[index] || dependencies.some((value, i) => value !== hooks[index].dependencies[i])) {
          const previous = hooks[index];
          effects.push(() => { previous?.cleanup?.(); hooks[index] = { dependencies, cleanup: effect() }; });
        }
      },
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "next/navigation": { usePathname: () => path },
    "@/lib/supabase/client": { createClient: () => supabase },
    "@/lib/notifications": { unreadBadge },
    "@/lib/notification-count": notificationCounts,
    "@/lib/notification-refresh": { createNotificationRefreshController: (options) => createNotificationRefreshController({ ...options, clock }) },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", "window", "document", "BroadcastChannel", "process", bellJavaScript)(
    (name) => { assert.ok(imports[name], name); return imports[name]; }, module, module.exports, window, document, hub.Channel,
    { env: { NEXT_PUBLIC_KCNY_NOTIFICATION_POLLING_ENABLED: pollingEnabled ? "true" : undefined } },
  );
  const render = (language = "CN") => { hookIndex = 0; return module.exports.NotificationBell({ language }); };
  const commit = () => { while (effects.length) effects.shift()(); };
  render(); commit();
  return {
    clock, requests, sessions, render, commit, hub, window, document,
    subscriptions: () => subscriptions,
    auth(identity) { authCallback(identity ? "SIGNED_IN" : "SIGNED_OUT", identity ? { user: { id: identity } } : null); },
    path(next) { path = next; return render(); },
    async respond(count, index = requests.length - 1) { requests[index].resolve({ count, error: null }); await flush(); },
    async session(identity, index = sessions.length - 1) { sessions[index].resolve({ data: { session: identity ? { user: { id: identity } } : null }, error: null }); await flush(); },
    dispose() { for (const hook of hooks) hook.cleanup?.(); },
  };
}

test("038 actual bell ignores stale auth bootstrap and clears the rendered old account value", async () => {
  const h = bellHarness();
  h.auth("account-a"); await h.clock.advance(0); await h.respond(7);
  assert.match(h.render().props["aria-label"], /7/);
  h.auth("account-b");
  assert.equal(h.render().props["aria-label"], notificationCountLabel("CN", null, false));
  await h.session("account-a", 0);
  await h.clock.advance(0);
  assert.deepEqual(h.requests[1].filters, [["recipient_id", "account-b"], ["read_at", null]]);
  assert.deepEqual(h.requests[1].options, { count: "exact", head: true });
  await h.respond(2);
  assert.match(h.render("KR").props["aria-label"], /2개/);
  h.auth(null);
  assert.equal(h.render().props["aria-label"], notificationCountLabel("CN", null, false));
  h.dispose();
});

test("038 actual bell recovers failed session bootstrap on online without overlapping session loads", async () => {
  const h = bellHarness();
  h.sessions[0].reject(new Error("offline")); await flush();
  assert.equal(h.render().props["aria-label"], notificationCountLabel("CN", null, true));
  h.window.dispatchEvent(new Event("online"));
  for (let i = 0; i < 20; i++) h.window.dispatchEvent(new Event("focus"));
  assert.equal(h.sessions.length, 2);
  await h.session("account-a"); await h.clock.advance(0); await h.respond(4);
  assert.match(h.render().props["aria-label"], /4/);
  h.dispose();
});

test("038 actual bell broadcasts read invalidation once, re-reads own account and closes listeners", async () => {
  const hub = channelHub(), first = bellHarness(hub), second = bellHarness(hub);
  first.auth("account-a"); second.auth("account-b");
  await first.clock.advance(0); await second.clock.advance(0);
  await first.respond(5); await second.respond(8);
  first.window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
  await first.clock.advance(1000); await second.clock.advance(1000);
  assert.deepEqual(hub.messages, ["read"]);
  assert.equal(first.requests.length, 2); assert.equal(second.requests.length, 2);
  assert.deepEqual(second.requests[1].filters[0], ["recipient_id", "account-b"]);
  await first.respond(4); await second.respond(8);
  second.document.visibilityState = "hidden";
  second.document.dispatchEvent(new Event("visibilitychange"));
  first.window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
  await second.clock.advance(30_000);
  assert.equal(second.requests.length, 2);
  first.dispose(); second.dispose();
  assert.equal(hub.channels.size, 0);
  assert.equal(first.subscriptions(), 0); assert.equal(second.subscriptions(), 0);
  const messageCount = hub.messages.length;
  first.window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
  first.window.dispatchEvent(new Event("focus"));
  first.window.dispatchEvent(new Event("online"));
  assert.equal(hub.messages.length, messageCount);
  assert.equal(first.clock.size(), 0); assert.equal(second.clock.size(), 0);
});

test("038 actual bell hides old navigation snapshot before effect cleanup and aborts old request", async () => {
  const h = bellHarness();
  h.auth("account-a"); await h.clock.advance(0); await h.respond(11);
  await h.clock.advance(NOTIFICATION_POLL_MS);
  const nextRender = h.path("/notifications");
  assert.equal(nextRender.props["aria-label"], notificationCountLabel("CN", null, false));
  h.commit();
  assert.equal(h.requests[1].signal.aborted, true);
  await h.respond(99, 1);
  assert.equal(h.render().props["aria-label"], notificationCountLabel("CN", null, false));
  h.auth("account-b"); await h.clock.advance(0); await h.respond(1);
  assert.equal(h.render().props["aria-label"], notificationCountLabel("CN", 1, false));
  h.dispose();
});

test("040 absent polling opt-in performs no idle periodic reads but keeps authenticated read refresh", async () => {
  const h = bellHarness(channelHub(), false);
  h.auth("account-a"); await h.clock.advance(0); await h.respond(8);
  await h.clock.advance(3_600_000);
  assert.equal(h.requests.length, 1);
  h.window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
  await h.clock.advance(1000);
  assert.equal(h.requests.length, 2);
  assert.deepEqual(h.requests[1].filters[0], ["recipient_id", "account-a"]);
  await h.respond(7);
  h.auth(null); await h.clock.advance(120_000);
  assert.equal(h.requests.length, 2);
  h.dispose();
});

test("040 no opt-in does not schedule endless failure retries or discard confirmed state", async () => {
  const clock=fakeClock(),states=[];let calls=0;
  const controller=createNotificationRefreshController({periodicEnabled:false,clock,isVisible:()=>true,update:s=>states.push(s),load:async()=>{calls++;return calls===1?{count:5,error:null}:{count:null,error:new Error('temporary')};}});
  controller.setIdentity('A');await clock.advance(0);
  controller.refresh();await clock.advance(1000);
  assert.equal(states.at(-1).count,5);assert.equal(states.at(-1).unavailable,true);
  await clock.advance(3_600_000);assert.equal(calls,2);
  controller.dispose();assert.equal(clock.size(),0);
});
