import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reportsEnvironmentEnabled, reportFailure, isReviewStatus, canTransitionReviewStatus, REPORT_FIELDS, reportErrorMessage, reportKindLabel, reportReasonLabel, reportTargetLabel } from "../lib/reporting.ts";
const read = f => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261023124108_reports_complaints_review.sql");

test("reporting activation fails closed without a recognized opted-in environment", () => {
  assert.equal(reportsEnvironmentEnabled({}), false);
  assert.equal(reportsEnvironmentEnabled({ KCNY_REPORTS_ENABLED: "true", NEXT_PUBLIC_SUPABASE_URL: "https://czcyarmramlpmilfhpqo.supabase.co" }), false);
  assert.equal(reportsEnvironmentEnabled({ KCNY_REPORTS_ENABLED: "true", NEXT_PUBLIC_SUPABASE_URL: "https://kirvcbkbkvotnsqnbcyf.supabase.co" }), true);
  assert.equal(reportsEnvironmentEnabled({ KCNY_REPORTS_ENABLED: "false", NEXT_PUBLIC_SUPABASE_URL: "https://kirvcbkbkvotnsqnbcyf.supabase.co" }), false);
});
test("report error messages are bounded, bilingual and never expose raw database errors", () => {
  for (const [message,expected] of [["report_request_conflict","conflict"],["report_review_conflict","conflict"],["report_rate_limited","rate_limited"],["report_invalid_target","invalid_target"],["report_review_forbidden","forbidden"],["PRIVATE DETAILS","unavailable"]]) {
    assert.equal(reportFailure(message), expected);
    assert.ok(reportErrorMessage(expected, "CN")); assert.ok(reportErrorMessage(expected, "KR"));
    assert.equal(reportErrorMessage(expected,"CN").includes(message),false);
  }
});
test("report lifecycle has no terminal reopening or skipped acceptance", () => {
  const states=["pending","under_review","resolved","dismissed"];
  for (const from of states) for(const to of states) assert.equal(canTransitionReviewStatus(from,to), (from==="pending"&&to==="under_review")||(from==="under_review"&&["resolved","dismissed"].includes(to)));
  assert.equal(isReviewStatus("admin"),false);
});
test("public case contract excludes internal reviewer identity and notes", () => {
  assert.doesNotMatch(REPORT_FIELDS,/reporter_id|actor_id|internal_note|decision_reason/);
  assert.match(read("app/reports/[id]/page.tsx"),/\.eq\("reporter_id", ctx\.userId\)/);
  assert.doesNotMatch(read("app/reports/[id]/page.tsx"),/report_review_history/);
});
test("case lists use bounded keyset ordering and preserve review status", () => {
  for(const file of ["app/reports/page.tsx","app/reports/review/page.tsx"]){const source=read(file);assert.match(source,/\.limit\(REPORT_PAGE_SIZE \+ 1\)/);assert.match(source,/\.order\("id",/);}
  assert.match(read("app/reports/page.tsx"),/olderThanFilter\(cursor\)/);
  assert.match(read("app/reports/review/page.tsx"),/reviewCursorFilter\(filters.before, filters.order\)/);
  assert.match(read("components/ReportCases.tsx"),/before: nextCursor/);
});
test("reviewers are private members rather than mutable JWT metadata", () => {
  assert.match(migration,/create table reporting_private\.reviewers/);
  assert.doesNotMatch(migration,/user_metadata|raw_user_meta_data|service_role/);
  assert.match(migration,/revoke all on schema reporting_private from public, anon, authenticated/);
});
test("database enforces request identity, conflicts, bounds and target type checks", () => {
  assert.match(migration,/primary key \(reporter_id,request_id\)/);
  assert.match(migration,/old_request\.payload is distinct from payload/);
  assert.match(migration,/return old_request\.report_id/);
  assert.match(migration,/pg_advisory_xact_lock/);
  assert.match(migration,/>=10/);
  assert.match(migration,/where username=p_target_ref/);
  assert.match(migration,/p_target_type='reply' and parent_id is null/);
});
test("database review locks the expected version and writes append-only audit atomically", () => {
  assert.match(migration,/where id=p_report_id for update/);
  assert.match(migration,/old_case\.version<>p_expected_version/);
  assert.match(migration,/old_case\.status='pending' and p_next_status='under_review'/);
  assert.match(migration,/insert into reporting_private\.review_events/);
  assert.match(migration,/before update or delete on reporting_private\.review_events/);
  assert.match(migration,/revoke all on public\.reports from public,anon,authenticated/);
  assert.match(migration,/grant select on public\.reports to authenticated/);
  assert.doesNotMatch(migration,/references public\.(posts|comments|profiles)/);
});
test("report actions use real claims and request IDs with no reviewer ID trust", () => {
  const source=read("app/reports/actions.ts");
  assert.match(source,/auth\.getClaims/);assert.match(source,/p_request_id: requestId/);
  assert.doesNotMatch(source,/formData\.get\("(?:reporterId|reviewerId)"\)|auth\.admin|service_role/);
  assert.match(read("components/ReportForm.tsx"),/state\.status === "success"/);
});
test("business review conflicts use HTTP 409 rather than retryable serialization errors", () => {
  const fix=read("supabase/migrations/20261023125936_reporting_review_http_conflict.sql");
  assert.match(fix,/raise sqlstate 'PT409'/);
  assert.doesNotMatch(fix,/errcode='40001'/);
  assert.match(fix,/for update/); assert.match(fix,/insert into reporting_private\.review_events/);
});
test("case detail labels are localized rather than raw enum codes", () => {
  for(const language of ["CN","KR"]){
    assert.notEqual(reportKindLabel("complaint",language),"complaint");
    assert.notEqual(reportReasonLabel("privacy",language),"privacy");
    assert.notEqual(reportTargetLabel("reply",language),"reply");
  }
});
test("review drafts stay controlled across failed server action form resets", () => {
  const source=read("components/ReportReviewForm.tsx");
  for(const field of ["nextStatus","publicResolution","decisionReason","internalNote"])assert.ok(source.includes(`value={${field}}`));
  assert.match(read("app/reports/review/[id]/page.tsx"),/ReportReviewForm key=\{id\}/);
  assert.match(source,/name="version" value=\{expectedVersion\}/);
  assert.doesNotMatch(source,/sessionStorage|localStorage/);
});
