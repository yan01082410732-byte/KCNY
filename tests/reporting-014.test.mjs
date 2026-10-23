import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canSubmitReport, canTransitionReviewStatus, isReportTarget, reportHref, validateReportInput, REPORT_PERSISTENCE_AVAILABLE } from "../lib/reporting.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const id = "550e8400-e29b-41d4-a716-446655440000";

test("report targets are bounded to existing public identifiers", () => {
  assert.equal(isReportTarget("post", id), true);
  assert.equal(isReportTarget("comment", id), true);
  assert.equal(isReportTarget("reply", id), true);
  assert.equal(isReportTarget("profile", "minji_01"), true);
  assert.equal(isReportTarget("profile", "../admin"), false);
  assert.equal(isReportTarget("post", "not-a-uuid"), false);
  assert.equal(reportHref("post", "bad", "CN"), undefined);
  assert.match(reportHref("post", id, "KR"), /lang=KR/);
});

test("report and complaint input validation has safe bounds", () => {
  assert.equal(validateReportInput({ kind: "report", targetType: "post", targetId: id, reason: "spam", description: "" }).ok, true);
  assert.equal(validateReportInput({ kind: "complaint", targetType: "", targetId: "", reason: "other", description: "A clear complaint" }).ok, true);
  assert.equal(validateReportInput({ kind: "complaint", targetType: "", targetId: "", reason: "other", description: "short" }).ok, false);
  assert.equal(validateReportInput({ kind: "report", targetType: "post", targetId: id, reason: "unknown", description: "" }).ok, false);
  assert.equal(validateReportInput({ kind: "report", targetType: "post", targetId: id, reason: "other", description: "x".repeat(2001) }).ok, false);
});

test("duplicate submit lock and future status transitions are conservative", () => {
  assert.equal(canSubmitReport(false, false), true);
  assert.equal(canSubmitReport(true, false), false);
  assert.equal(canSubmitReport(false, true), false);
  assert.equal(canTransitionReviewStatus("pending", "under_review"), true);
  assert.equal(canTransitionReviewStatus("pending", "resolved"), false);
  assert.equal(canTransitionReviewStatus("under_review", "resolved"), true);
  assert.equal(canTransitionReviewStatus("resolved", "pending"), false);
});

test("submission checks verified claims and never writes without an approved contract", () => {
  const action = read("app/reports/actions.ts");
  assert.match(action, /auth\.getClaims\(\)/);
  assert.match(action, /reason: "login_required"/);
  assert.equal(REPORT_PERSISTENCE_AVAILABLE, false);
  assert.doesNotMatch(action, /\.insert\(|service_role|auth\.admin/);
  assert.match(action, /reportsEnvironmentEnabled\(process\.env\)/);
  assert.match(action, /\.rpc\("submit_report"/);
  assert.match(read("components/ReportForm.tsx"), /disabled=\{pending \|\| !enabled/);
});

test("report status requires authentication and never exposes fabricated records", () => {
  const page = read("app/reports/page.tsx");
  assert.match(read("lib/report-server.ts"), /auth\.getClaims\(\)/);
  assert.match(page, /redirect\(`\/auth\/login/);
  assert.match(page, /\.eq\("reporter_id", ctx\.userId\)/);
});

test("AI suggestion and human decision have separate typed provenance", () => {
  const contract = read("lib/report-ai-contract.ts");
  assert.match(contract, /source: "ai_suggestion"/);
  assert.match(contract, /source: "human_decision"/);
  assert.doesNotMatch(contract, /fetch\(|service_role/);
});

test("report entry points and bilingual copy are present", () => {
  assert.match(read("components/PostCard.tsx"), /reportHref\("post"/);
  assert.match(read("components/PostDetailClient.tsx"), /reportHref\(reply \? "reply" : "comment"/);
  assert.match(read("components/ProfilePageClient.tsx"), /reportHref\("profile"/);
  const form = read("components/ReportForm.tsx");
  assert.match(form, /举报与投诉/);
  assert.match(form, /신고 및 민원/);
  assert.match(form, /role="alert"/);
});
