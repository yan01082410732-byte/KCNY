import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AI_CONTRACT_VERSION as version, AI_SERVICE_STATUS, parseAiRequest, parseAiResponse } from "../lib/ai-integration-contract.ts";
import { createMainSiteAiBoundary, recheckAiSearchVisibility } from "../lib/ai-main-site-boundary.ts";

// Synthetic contract fixtures only. No session, provider, database or model is involved.
const requestId = "550e8400-e29b-41d4-a716-446655440000";
const id = "550e8400-e29b-41d4-a716-446655440001";
const secondId = "550e8400-e29b-41d4-a716-446655440002";
const reference = { kind: "post", id };
const complaint = { reportId: id, language: "CN", category: "privacy", complaintText: "合成投诉原文。" };
const suggestion = { source: "ai_suggestion", category: "privacy", risk: "uncertain", summary: "合成测试摘要", recommendedReview: "由有权限的人工审核。", translatedText: "합성 테스트 번역" };
const inputs = {
  translation: { text: "保留中文原文。", sourceLanguage: "CN", targetLanguage: "KR", context: "post" },
  search: { query: "중한 교류", language: "KR", scope: "public_posts", limit: 2 },
  moderation: { contentType: "post", contentId: id, text: "合成帖子", task: "risk_review" },
  complaint,
};
const outputs = {
  translation: { translatedText: "중국어 원문을 보존합니다.", modelVersion: "synthetic-fixture-v1" },
  search: { items: [{ postId: id, rank: 1 }, { postId: secondId, rank: 2 }], indexVersion: "synthetic-index-v1", nextCursor: "synthetic_next_2" },
  moderation: { source: "ai_suggestion", category: "uncertain", risk: "uncertain", rationale: "合成依据，无法判断。", uncertain: true, modelVersion: "synthetic-fixture-v1" },
  complaint: { suggestion, priority: "uncertain", modelVersion: "synthetic-fixture-v1" },
};
const request = domain => ({ version, requestId, domain, input: structuredClone(inputs[domain]) });
const response = domain => ({ version, requestId, domain, status: "READY", output: structuredClone(outputs[domain]) });
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const clone = value => structuredClone(value);

for (const domain of Object.keys(inputs)) {
  test(`032 ${domain} accepts its independent versioned synthetic request and response`, () => {
    assert.deepEqual(parseAiRequest(request(domain)), { ok: true, value: request(domain) });
    assert.deepEqual(parseAiResponse(response(domain), request(domain)), { ok: true, value: response(domain) });
  });
  test(`032 ${domain} rejects extra sensitive request and response fields rather than forwarding`, () => {
    for (const field of ["password", "Authorization", "Cookie", "refresh_token", "reporterEmail", "reviewerId", "session"]) {
      const top = request(domain); top[field] = "SYNTHETIC-NOT-A-SECRET";
      const inner = request(domain); inner.input[field] = "SYNTHETIC-NOT-A-SECRET";
      const result = response(domain); result.output[field] = "SYNTHETIC-NOT-A-SECRET";
      assert.equal(parseAiRequest(top).ok, false, field);
      assert.equal(parseAiRequest(inner).ok, false, field);
      assert.equal(parseAiResponse(result, request(domain)).ok, false, field);
    }
  });
  test(`032 ${domain} rejects incompatible versions and mismatched response identity/domain`, () => {
    assert.equal(parseAiRequest({ ...request(domain), version: "kcny.ai.v2" }).error, "unsupported_version");
    assert.equal(parseAiResponse({ ...response(domain), version: "kcny.ai.v0" }, request(domain)).ok, false);
    assert.equal(parseAiResponse({ ...response(domain), requestId: secondId }, request(domain)).ok, false);
    assert.equal(parseAiResponse({ ...response(domain), domain: domain === "search" ? "translation" : "search" }, request(domain)).ok, false);
  });
  test(`032 ${domain} explicitly represents NOT_CONNECTED without fabricating inference`, () => {
    const value = { version, requestId, domain, status: "NOT_CONNECTED", error: "not_connected" };
    assert.equal(AI_SERVICE_STATUS, "NOT_CONNECTED");
    assert.deepEqual(parseAiResponse(value, request(domain)), { ok: true, value });
    assert.equal(parseAiResponse({ ...value, output: outputs[domain] }, request(domain)).ok, false);
    assert.equal(parseAiResponse({ ...value, error: "unavailable" }, request(domain)).ok, false);
  });
}

test("032 validators reject non-JSON-shaped values, accessor fields, empty/control text", () => {
  for (const invalid of [null, [], true, "request", new Date(), { ...request("translation"), input: null }]) assert.equal(parseAiRequest(invalid).ok, false);
  const accessor = request("translation");
  Object.defineProperty(accessor, "domain", { enumerable: true, get() { throw Error("must not execute getter"); } });
  assert.equal(parseAiRequest(accessor).ok, false);
  const hostile = new Proxy({}, { getPrototypeOf() { throw Error("untrusted object"); } });
  assert.equal(parseAiRequest(hostile).ok, false);
  assert.equal(parseAiResponse(hostile, request("translation")).ok, false);
  for (const text of ["", "  ", "x\u0000y", "x".repeat(8001)]) assert.equal(parseAiRequest({ ...request("translation"), input: { ...inputs.translation, text } }).ok, false);
});
test("032 Chinese/Korean values are exact and original authorized text is not rewritten", () => {
  const text = "  原文 \n한국어 원문  ";
  const parsed = parseAiRequest({ ...request("translation"), input: { ...inputs.translation, text } });
  assert.equal(parsed.value.input.text, text);
  for (const language of ["cn", "ko", "ZH", "EN", null]) {
    assert.equal(parseAiRequest({ ...request("search"), input: { ...inputs.search, language } }).ok, false);
    assert.equal(parseAiRequest({ ...request("complaint"), input: { ...complaint, language } }).ok, false);
  }
  assert.equal(parseAiRequest({ ...request("translation"), input: { ...inputs.translation, targetLanguage: "CN" } }).ok, false);
});
test("032 search input scope, query, pagination and cursor remain strictly bounded", () => {
  for (const limit of [0, -1, 21, 1.5, NaN, Infinity, "2"]) assert.equal(parseAiRequest({ ...request("search"), input: { ...inputs.search, limit } }).ok, false);
  for (const cursor of ["", "x".repeat(257), "../../private", "header.payload.signature", "https://example.invalid/token"]) assert.equal(parseAiRequest({ ...request("search"), input: { ...inputs.search, cursor } }).ok, false);
  assert.equal(parseAiRequest({ ...request("search"), input: { ...inputs.search, scope: "private_complaints" } }).ok, false);
  assert.equal(parseAiRequest({ ...request("search"), input: { ...inputs.search, query: "x".repeat(201) } }).ok, false);
});
test("032 search results reject duplicates, invalid ranks, excess pages and invented fields", () => {
  for (const items of [[{ postId: id, rank: 1 }, { postId: id, rank: 2 }], [{ postId: id, rank: 0 }], [{ postId: id, rank: 2 }, { postId: secondId, rank: 1 }], [{ postId: "bad", rank: 1 }], [{ postId: id, rank: Infinity }], [{ postId: id, rank: 1, score: 99 }]]) {
    assert.equal(parseAiResponse({ ...response("search"), output: { items, indexVersion: "synthetic-index-v1" } }, request("search")).ok, false);
  }
  assert.equal(parseAiResponse(response("search"), { ...request("search"), input: { ...inputs.search, limit: 1 } }).ok, false);
  assert.equal(parseAiResponse({ ...response("search"), output: { items: [], indexVersion: "synthetic-index-v1" } }, request("search")).ok, false);
  assert.equal(parseAiResponse({ ...response("search"), status: "NO_RESULTS", output: { items: [], indexVersion: "synthetic-index-v1" } }, request("search")).ok, true);
  assert.equal(parseAiResponse({ ...response("search"), output: { items: Array(1), indexVersion: "synthetic-index-v1" } }, request("search")).ok, false);
});
test("032 moderation is suggestion-only and uncertain output is explicit", () => {
  for (const patch of [{ source: "human_decision" }, { category: "ban_user" }, { risk: "certain" }, { uncertain: false }, { deletePost: true }, { reviewerId: id }]) {
    assert.equal(parseAiResponse({ ...response("moderation"), output: { ...outputs.moderation, ...patch } }, request("moderation")).ok, false);
  }
  assert.equal(parseAiRequest({ ...request("moderation"), input: { ...inputs.moderation, task: "automatic_punishment" } }).ok, false);
});
test("032 complaint reuses legacy suggestions and never accepts human decisions or audit updates", () => {
  const legacy = read("lib/report-ai-contract.ts");
  assert.match(legacy, /export type ComplaintAiInput/); assert.match(legacy, /source: "ai_suggestion"/); assert.match(legacy, /source: "human_decision"/);
  assert.match(read("lib/ai-integration-contract.ts"), /import type \{ ComplaintAiInput, ComplaintAiSuggestion, HumanReviewDecision \}/);
  const human = { source: "human_decision", reportId: id, reviewerId: secondId, status: "resolved", reason: "合成人工决定" };
  assert.equal(parseAiResponse({ ...response("complaint"), output: { ...outputs.complaint, suggestion: human } }, request("complaint")).ok, false);
  assert.equal(parseAiResponse({ ...response("complaint"), output: { ...outputs.complaint, status: "resolved" } }, request("complaint")).ok, false);
  assert.equal(parseAiResponse({ ...response("complaint"), output: { ...outputs.complaint, suggestion: { ...suggestion, internal_note: "not allowed" } } }, request("complaint")).ok, false);
  assert.equal(parseAiRequest({ ...request("complaint"), input: { ...complaint, complaintText: "x".repeat(2001) } }).ok, false);
  assert.equal(parseAiRequest({ ...request("complaint"), input: { ...complaint, evidenceText: "x".repeat(2001) } }).ok, false);
});

function fixtureAccess(overrides = {}) {
  const calls = [];
  return { calls, access: {
    authorize: async scope => { calls.push(["authorize", scope]); return true; },
    loadAuthorizedText: async ref => { calls.push(["text", ref]); return { text: "主站授权合成原文", language: "CN" }; },
    loadAuthorizedComplaint: async reportId => { calls.push(["complaint", reportId]); return clone(complaint); },
    ...overrides,
  } };
}
const commands = {
  translation: { requestId, reference, targetLanguage: "KR" },
  search: { requestId, ...inputs.search },
  moderation: { requestId, reference },
  complaint: { requestId, reportId: id },
};
for (const domain of Object.keys(commands)) {
  test(`032 ${domain} main-site adapter requires trusted authorization and stays NOT_CONNECTED`, async () => {
    const fixture = fixtureAccess();
    const result = await createMainSiteAiBoundary(fixture.access)[domain](clone(commands[domain]));
    assert.deepEqual(result, { status: "NOT_CONNECTED", error: "not_connected", version, requestId, domain });
    assert.equal(fixture.calls[0][0], "authorize");
    assert.doesNotMatch(JSON.stringify(result), /原文|complaintText|reporter|userId|reviewerId|Token/);
    let loaded = false;
    const denied = fixtureAccess({ authorize: async () => false, loadAuthorizedText: async () => { loaded = true; throw Error("must not read"); }, loadAuthorizedComplaint: async () => { loaded = true; throw Error("must not read"); } });
    assert.equal((await createMainSiteAiBoundary(denied.access)[domain](clone(commands[domain]))).error, "forbidden");
    assert.equal(loaded, false);
  });
  test(`032 ${domain} rejects caller privilege and payload injection before authorization`, async () => {
    for (const field of ["authorized", "reviewer", "viewerId", "text", "complaintText", "session", "token"]) {
      const fixture = fixtureAccess();
      assert.equal((await createMainSiteAiBoundary(fixture.access)[domain]({ ...clone(commands[domain]), [field]: "synthetic" })).error, "invalid_input");
      assert.equal(fixture.calls.length, 0);
    }
  });
  test(`032 ${domain} authorization service errors fail closed without leaking raw errors`, async () => {
    const fixture = fixtureAccess({ authorize: async () => { throw Error("SYNTHETIC_PRIVATE_DETAIL"); } });
    assert.deepEqual(await createMainSiteAiBoundary(fixture.access)[domain](clone(commands[domain])), { status: "REJECTED", error: "unavailable" });
  });
}
test("032 authorization is rechecked for every request; no stale reviewer permission cache", async () => {
  let allowed = true; let authorizationCount = 0;
  const fixture = fixtureAccess({ authorize: async () => { authorizationCount++; return allowed; } });
  const boundary = createMainSiteAiBoundary(fixture.access);
  assert.equal((await boundary.complaint(commands.complaint)).status, "NOT_CONNECTED");
  allowed = false;
  assert.equal((await boundary.complaint(commands.complaint)).error, "forbidden");
  assert.equal(authorizationCount, 2);
});
test("032 untrusted or unavailable authoritative text and case mismatches are rejected", async () => {
  assert.equal((await createMainSiteAiBoundary(fixtureAccess({ loadAuthorizedText: async () => null }).access).translation(commands.translation)).error, "forbidden");
  assert.equal((await createMainSiteAiBoundary(fixtureAccess({ loadAuthorizedText: async () => ({ text: "x".repeat(8001), language: "CN" }) }).access).moderation(commands.moderation)).error, "invalid_input");
  assert.equal((await createMainSiteAiBoundary(fixtureAccess({ loadAuthorizedComplaint: async () => ({ ...complaint, reportId: secondId }) }).access).complaint(commands.complaint)).error, "forbidden");
  assert.equal((await createMainSiteAiBoundary(fixtureAccess({ loadAuthorizedComplaint: async () => ({ ...complaint, reporterEmail: "synthetic@example.invalid" }) }).access).complaint(commands.complaint)).error, "invalid_input");
});
test("032 search consumer rechecks every ID and removes invisible results without inventing ranking", async () => {
  const checked = [];
  const result = await recheckAiSearchVisibility(response("search"), request("search"), { authorize: async () => true, isPostCurrentlyVisible: async postId => { checked.push(postId); return postId === secondId; } });
  assert.deepEqual(checked, [id, secondId]);
  assert.deepEqual(result, { status: "READY", items: [{ postId: secondId, rank: 2 }], indexVersion: "synthetic-index-v1", nextCursor: "synthetic_next_2" });
});
test("032 search visibility is current per call and fails closed on loader errors or lost permission", async () => {
  const expected = request("search"); const input = response("search"); let checks = 0;
  const denied = await recheckAiSearchVisibility(input, expected, { authorize: async () => false, isPostCurrentlyVisible: async () => { checks++; return true; } });
  assert.equal(denied.error, "forbidden"); assert.equal(checks, 0);
  const unavailable = await recheckAiSearchVisibility(input, expected, { authorize: async () => true, isPostCurrentlyVisible: async () => { throw Error("private failure"); } });
  assert.deepEqual(unavailable, { status: "REJECTED", error: "unavailable" });
  const absent = await recheckAiSearchVisibility(input, expected, { authorize: async () => true, isPostCurrentlyVisible: async () => false });
  assert.equal(absent.status, "NO_RESULTS"); assert.deepEqual(absent.items, []);
  const fresh = await recheckAiSearchVisibility(input, expected, { authorize: async () => true, isPostCurrentlyVisible: async () => true });
  assert.equal(fresh.items.length, 2);
});
test("032 a malformed provider response cannot reach main-site visibility lookups", async () => {
  let called = false;
  const result = await recheckAiSearchVisibility({ ...response("search"), output: { ...outputs.search, items: [{ postId: "../../private", rank: 1 }] } }, request("search"), { authorize: async () => { called = true; return true; }, isPostCurrentlyVisible: async () => { called = true; return true; } });
  assert.equal(result.error, "invalid_response"); assert.equal(called, false);
});
test("032 no provider, database, model training, real credentials, route or punishment is connected", () => {
  for (const path of ["lib/ai-integration-contract.ts", "lib/ai-main-site-boundary.ts"]) {
    const source = read(path);
    assert.doesNotMatch(source, /\bfetch\s*\(|\.rpc\s*\(|\.from\s*\(|process\.env|service_role|auth\.admin|openai|anthropic|createClient|\btrain\s*\(/);
  }
  assert.doesNotMatch(read("lib/ai-main-site-boundary.ts"), /reviewReport|review_report|HumanReviewDecision|revalidatePath|"use client"/);
});
