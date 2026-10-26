import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as operations from '../lib/report-operations.ts';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const id = '10000000-0000-4000-8000-000000000001';
const requestId = '10000000-0000-4000-8000-000000000002';
const timestamp = '2026-10-26T00:00:00.000Z';
const ownRequest = { id: requestId, report_id: id, request_kind: 'access', details: 'Synthetic access request details', status: 'pending', public_response: '', version: 1, created_at: timestamp, updated_at: timestamp };
const candidate = { id, kind: 'complaint', status: 'resolved', version: 3, created_at: timestamp, updated_at: timestamp, review_version: 0, decision: null, hold: 'none', reason: '', next_review_at: null, cleared_at: null };
const overview = { retention: [candidate], selected: candidate, requests: [{ ...ownRequest, internal_reason: '', approval_reference: '' }], policy: { policy_approved: false, policy_version: null } };
const env = { KCNY_REPORTING_OPERATIONS_ENABLED: 'true', KCNY_REPORTS_ENABLED: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://kirvcbkbkvotnsqnbcyf.supabase.co', VERCEL_ENV: 'development' };

test('030 operations require both independent app gates and an exact project environment', () => {
  assert.equal(operations.operationsEnvironmentEnabled(env), true);
  for (const override of [{ KCNY_REPORTING_OPERATIONS_ENABLED: undefined }, { KCNY_REPORTING_OPERATIONS_ENABLED: 'false' }, { KCNY_REPORTS_ENABLED: 'false' }, { VERCEL_ENV: 'production' }, { NEXT_PUBLIC_SUPABASE_URL: 'https://unknown.supabase.co' }]) assert.equal(operations.operationsEnvironmentEnabled({ ...env, ...override }), false);
  assert.equal(operations.operationsEnvironmentEnabled({ ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://czcyarmramlpmilfhpqo.supabase.co', VERCEL_ENV: 'production' }), true);
  assert.equal(operations.operationsEnvironmentEnabled({ ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://czcyarmramlpmilfhpqo.supabase.co', VERCEL_ENV: 'preview' }), false);
});

test('030 requester DTO explicitly strips account identity and reviewer-only values', () => {
  const result = operations.parseDataRequest({ ...ownRequest, requester_id: 'PRIVATE', internal_reason: 'PRIVATE', approval_reference: 'PRIVATE', extra: 'PRIVATE' });
  assert.deepEqual(result, ownRequest);
  assert.doesNotMatch(operations.DATA_REQUEST_FIELDS, /requester_id|internal_reason|approval_reference/);
});
test('030 malformed request rows are rejected instead of displayed as successful records', () => {
  for (const row of [null, {}, { ...ownRequest, id: 'x' }, { ...ownRequest, status: 'deleted' }, { ...ownRequest, version: 0 }, { ...ownRequest, updated_at: 'not-a-date' }]) assert.equal(operations.parseDataRequest(row), null);
});
test('030 overview accepts nullable first-review metadata without leaking unknown fields', () => {
  assert.deepEqual(operations.parseOperationsOverview(overview), overview);
  assert.equal(operations.parseRetentionCandidate({ ...candidate, description: 'not-for-due-list' }).description, undefined);
  assert.equal(operations.parseRetentionCandidate({ ...candidate, decision: 'cleared', cleared_at: timestamp }).decision, 'cleared');
});
test('030 overview is bounded and malformed queue data never becomes a zero count', () => {
  for (const value of [null, {}, { ...overview, retention: Array(21).fill(candidate) }, { ...overview, requests: Array(21).fill(overview.requests[0]) }, { ...overview, selected: {} }, { ...overview, requests: [ownRequest] }, { ...overview, policy: { policy_approved: 'true', policy_version: null } }]) assert.equal(operations.parseOperationsOverview(value), null);
});
test('030 request input validates stable IDs and bounded meaningful descriptions', () => {
  assert.deepEqual(operations.parseDataRequestInput({ reportId: id, requestId, kind: 'correction', details: '  Fix synthetic text  ' }), { reportId: id, requestId, kind: 'correction', details: 'Fix synthetic text' });
  for (const extra of [{ reportId: 'bad' }, { requestId: '' }, { kind: 'export-all' }, { details: 'short' }, { details: 'a'.repeat(1001) }]) assert.equal(operations.parseDataRequestInput({ reportId: id, requestId, kind: 'access', details: ownRequest.details, ...extra }), null);
});
test('030 retention review requires current versions, reason and a bounded future review date', () => {
  const input = { reportId: id, caseVersion: '3', reviewVersion: '0', decision: 'retain', hold: 'appeal', reason: 'Pending synthetic appeal', nextReviewAt: '2026-10-27T00:00:00Z' };
  const now = Date.parse(timestamp);
  assert.equal(operations.parseRetentionInput(input, now).reviewVersion, 0);
  for (const extra of [{ caseVersion: '0' }, { reviewVersion: '-1' }, { reason: ' ' }, { nextReviewAt: timestamp }, { nextReviewAt: '2028-10-27T00:00:00Z' }, { decision: 'eligible_for_clear' }]) assert.equal(operations.parseRetentionInput({ ...input, ...extra }, now), null);
});
test('030 data-request review has no UI path to false fulfillment or direct deletion', () => {
  assert.deepEqual(operations.dataRequestTransitions('pending'), ['under_review']);
  assert.deepEqual(operations.dataRequestTransitions('under_review'), ['approved', 'rejected']);
  for (const state of ['approved', 'rejected', 'fulfilled']) assert.deepEqual(operations.dataRequestTransitions(state), []);
  const value = { requestId, version: '1', nextStatus: 'approved', publicResponse: 'Approved for separate execution', internalReason: 'Synthetic owner approval checked', approvalReference: 'APPROVAL-030' };
  assert.ok(operations.parseDataRequestReviewInput(value));
  for (const extra of [{ nextStatus: 'fulfilled' }, { approvalReference: '' }, { approvalReference: 'space not allowed' }, { approvalReference: 'A'.repeat(121) }, { internalReason: '' }, { internalReason: 'a'.repeat(1001) }, { publicResponse: '' }, { version: '1.5' }]) assert.equal(operations.parseDataRequestReviewInput({ ...value, ...extra }), null);
});
test('030 safe error mapping handles optimistic conflicts without disclosing raw SQL messages', () => {
  assert.equal(operations.operationsFailure({ code: 'PT409', message: 'private conflict data' }), 'conflict');
  assert.equal(operations.operationsFailure({ code: '42501' }), 'forbidden');
  assert.equal(operations.operationsFailure({ code: 'PT400' }), 'invalid_input');
  assert.equal(operations.operationsFailure({ message: 'report_rate_limited' }), 'rate_limited');
  assert.equal(operations.operationsFailure({ message: 'private SQL detail' }), 'unavailable');
});
test('030 labels distinguish approval, execution and cleanup candidacy in both languages', () => {
  for (const language of ['CN', 'KR']) {
    for (const kind of operations.DATA_REQUEST_KINDS) assert.ok(operations.dataRequestKindLabel(kind, language));
    for (const status of operations.DATA_REQUEST_STATUSES) assert.ok(operations.dataRequestStatusLabel(status, language));
    assert.notEqual(operations.dataRequestStatusLabel('approved', language), operations.dataRequestStatusLabel('fulfilled', language));
    assert.notEqual(operations.retentionDecisionLabel('eligible_for_clear', language), operations.retentionDecisionLabel('retain', language));
    for (const hold of ['none', 'appeal', 'legal', 'investigation']) assert.ok(operations.retentionHoldLabel(hold, language));
  }
});

function serverActions(options = {}) {
  const calls = [];
  const supabase = { auth: { getUser: async () => { calls.push('getUser'); return { data: { user: options.noUser ? null : { id: options.mismatchedUser ? 'wrong' : 'viewer-A', is_anonymous: Boolean(options.anonymous) } }, error: options.authError ?? null }; } },
    rpc: async (name, args) => { calls.push({ name, args }); return { data: options.response === undefined ? requestId : options.response, error: options.error ?? null }; } };
  const output = ts.transpileModule(read('app/reports/operations/actions.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    if (name === 'next/cache') return { revalidatePath: path => { calls.push({ refresh: path }); if (options.refreshFailure) throw Error('refresh failure'); } };
    if (name === '@/lib/report-server') return { reportingContext: async () => { calls.push('context'); return { supabase, userId: 'viewer-A', enabled: options.dbDisabled !== true, reviewer: options.reviewer === true }; } };
    if (name === '@/lib/report-operations') return operations;
    throw Error('Unexpected test dependency');
  }, module, module.exports);
  return { ...module.exports, calls };
}
function form(value) { const data = new FormData(); for (const [key, v] of Object.entries(value)) data.set(key, String(v)); return data; }
async function withEnv(overrides, run) {
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries({ ...env, ...overrides })) value === undefined ? delete process.env[key] : process.env[key] = value;
  try { return await run(); } finally { for (const [key, value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value; }
}
const requestForm = () => form({ reportId: id, requestId, kind: 'access', details: ownRequest.details, requesterId: 'attacker-controlled' });
const reviewForm = () => form({ requestId, version: 1, nextStatus: 'under_review', publicResponse: '', internalReason: 'Synthetic review rationale', approvalReference: '' });
const retentionForm = () => form({ reportId: id, caseVersion: 3, reviewVersion: 0, decision: 'retain', hold: 'appeal', reason: 'Synthetic pending appeal', nextReviewAt: new Date(Date.now() + 86400000).toISOString() });

test('030 disabled operations block every action before auth or database calls', () => withEnv({ KCNY_REPORTING_OPERATIONS_ENABLED: 'false' }, async () => {
  const actions = serverActions({ reviewer: true });
  for (const [name, values] of [['submitDataRequest', requestForm()], ['recordRetention', retentionForm()], ['reviewDataRequest', reviewForm()]]) assert.deepEqual(await actions[name]({ status: 'idle' }, values), { status: 'error', reason: 'unavailable' });
  assert.deepEqual(actions.calls, []);
}));
test('030 actions require a fresh real user matching the reporting context', () => withEnv({}, async () => {
  for (const options of [{ noUser: true }, { anonymous: true }, { mismatchedUser: true }]) {
    const actions = serverActions(options);
    assert.deepEqual(await actions.submitDataRequest({ status: 'idle' }, requestForm()), { status: 'error', reason: 'login_required' });
    assert.ok(actions.calls.includes('getUser')); assert.equal(actions.calls.filter(value => typeof value === 'object' && value.name).length, 0);
  }
}));
test('030 disabled database reporting gate blocks authenticated actions', () => withEnv({}, async () => {
  const actions = serverActions({ dbDisabled: true });
  assert.equal((await actions.submitDataRequest({ status: 'idle' }, requestForm())).reason, 'unavailable');
  assert.ok(!actions.calls.some(value => value.name));
}));
test('030 transient auth failures are unavailable errors, not fictional expired sessions', () => withEnv({}, async () => {
  for (const authError of [{ status: 503 }, { status: 0 }, {}]) assert.equal((await serverActions({ authError }).submitDataRequest({ status: 'idle' }, requestForm())).reason, 'unavailable');
  assert.equal((await serverActions({ authError: { status: 401 } }).submitDataRequest({ status: 'idle' }, requestForm())).reason, 'login_required');
}));
test('030 submit returns a persisted request ID without trusting a client requester identity', () => withEnv({}, async () => {
  const actions = serverActions(); const result = await actions.submitDataRequest({ status: 'idle' }, requestForm());
  assert.deepEqual(result, { status: 'success', entityId: requestId });
  const call = actions.calls.find(value => value.name); assert.equal(call.name, 'submit_report_data_request');
  assert.deepEqual(Object.keys(call.args).sort(), ['p_details', 'p_kind', 'p_report_id', 'p_request_id']);
}));
test('030 submit never acknowledges a missing persisted UUID or an RPC failure', () => withEnv({}, async () => {
  for (const options of [{ response: null }, { response: {} }, { error: { code: 'PT409' } }]) {
    const actions = serverActions(options); assert.equal((await actions.submitDataRequest({ status: 'idle' }, requestForm())).status, 'error');
  }
}));
test('030 reviewer-only actions reject ordinary users without privileged RPC calls', () => withEnv({}, async () => {
  const actions = serverActions();
  for (const [name, values] of [['recordRetention', retentionForm()], ['reviewDataRequest', reviewForm()]]) assert.equal((await actions[name]({ status: 'idle' }, values)).reason, 'forbidden');
  assert.ok(!actions.calls.some(value => value.name));
}));
test('030 retention success requires matching decision, next time and incremented review version', () => withEnv({}, async () => {
  const values = retentionForm(); const response = { review_version: 1, decision: 'retain', next_review_at: values.get('nextReviewAt') };
  const actions = serverActions({ reviewer: true, response });
  assert.deepEqual(await actions.recordRetention({ status: 'idle' }, values), { status: 'success', entityId: id, version: 1 });
  const call = actions.calls.find(value => value.name); assert.equal(call.name, 'record_report_retention'); assert.equal(call.args.p_expected_case_version, 3); assert.equal(call.args.p_expected_review_version, 0);
  for (const bad of [{ ...response, review_version: 0 }, { ...response, decision: 'eligible_for_clear' }, { ...response, next_review_at: timestamp }]) assert.equal((await serverActions({ reviewer: true, response: bad }).recordRetention({ status: 'idle' }, values)).status, 'error');
}));
test('030 data request review confirms a fresh version and sends no reviewer account ID', () => withEnv({}, async () => {
  const actions = serverActions({ reviewer: true, response: 2 });
  assert.deepEqual(await actions.reviewDataRequest({ status: 'idle' }, reviewForm()), { status: 'success', entityId: requestId, version: 2 });
  assert.doesNotMatch(JSON.stringify(actions.calls.find(value => value.name).args), /actor_id|reviewer_id/);
  assert.equal((await serverActions({ reviewer: true, response: 1 }).reviewDataRequest({ status: 'idle' }, reviewForm())).status, 'error');
}));
test('030 optimistic conflicts are explicit errors and do not refresh as successful saves', () => withEnv({}, async () => {
  const actions = serverActions({ reviewer: true, error: { code: 'PT409', message: 'report_operation_review_conflict' } });
  assert.deepEqual(await actions.reviewDataRequest({ status: 'idle' }, reviewForm()), { status: 'error', reason: 'conflict' });
  assert.ok(!actions.calls.some(value => value.refresh));
}));
test('030 cache refresh failure cannot turn a confirmed commit into false save failure', () => withEnv({}, async () => {
  const actions = serverActions({ refreshFailure: true });
  assert.equal((await actions.submitDataRequest({ status: 'idle' }, requestForm())).status, 'success');
}));
test('030 privacy page uses owner-scoped bounded stable keyset pagination', () => {
  const code = read('app/reports/privacy/page.tsx');
  assert.match(code, /\.eq\("requester_id", ctx\.userId\)/); assert.match(code, /\.limit\(DATA_REQUEST_PAGE_SIZE \+ 1\)/);
  assert.match(code, /\.order\("created_at",/); assert.match(code, /\.order\("id",/); assert.match(code, /olderThanFilter\(cursor\)/);
  assert.match(code, /parseDataRequest/); assert.match(code, /auth\.getUser/); assert.match(code, /force-dynamic/);
});
test('030 operations queue requires a fresh authenticated reviewer and exact selected-case UUID', () => {
  const code = read('app/reports/operations/page.tsx');
  assert.match(code, /auth\.getUser/); assert.match(code, /!ctx\.reviewer/); assert.match(code, /isOperationsId\(params.case\)/);
  assert.match(code, /p_case_id: selectedId \?\? null/); assert.match(code, /parseOperationsOverview/);
});
test('030 forms retain controlled in-memory drafts and synchronously prevent duplicate submissions', () => {
  const code = read('components/ReportOperations.tsx');
  assert.match(code, /pending \|\| locked.current \|\| state.status === "success"/);
  for (const field of ['details', 'reason', 'nextReviewAt', 'internalReason', 'approvalReference', 'publicResponse']) assert.ok(code.includes(`value={${field}}`));
  assert.doesNotMatch(code, /sessionStorage|localStorage|dangerouslySetInnerHTML|service_role|user_metadata/);
  assert.match(code, /state.status === "success"\) setDetails\(""\)/);
});
test('030 bounded metadata-only due list does not render complaint bodies or imply actual erasure', () => {
  const code = read('components/ReportOperations.tsx');
  const due = code.slice(code.indexOf('<section aria-labelledby="retention-due"'), code.indexOf('<section aria-labelledby="data-request-review"'));
  assert.doesNotMatch(due, /description|details|reason/);
  assert.match(code, /未执行实际清理/); assert.match(code, /아직 미실행|실제 자료 처리는 별도 승인/);
  assert.match(code, /不能执行实际清理/); assert.match(code, /不代表待办为0/);
});
test('030 accessible bilingual controls retain minimum mobile tap targets', () => {
  const code = read('components/ReportOperations.tsx'); const css = read('app/globals.css');
  assert.match(code, /role="alert"/); assert.match(code, /aria-busy=\{pending\}/); assert.match(code, /htmlFor="privacy-request-details"/);
  assert.match(code, /韩国时间|한국 시간/); assert.match(css, /reporting-operations[\s\S]*min-height: 44px/);
});
test('030 acknowledged review feedback survives server revalidation with stable identity keys', () => {
  const code = read('components/ReportOperations.tsx');
  assert.match(code, /RetentionReviewForm key=\{overview\.selected\.id\}/);
  assert.match(code, /DataRequestReviewForm key=\{request\.id\}/);
  assert.doesNotMatch(code, /key=\{[^\n]*\.version/);
  // A retained unsaved draft must not silently adopt a concurrently refreshed
  // record version. Its original version must conflict instead of overwrite.
  assert.match(code, /\[caseVersion\] = useState\(candidate\.version\)/);
  assert.match(code, /\[reviewVersion\] = useState\(candidate\.review_version\)/);
  assert.match(code, /\[expectedVersion\] = useState\(request\.version\)/);
  assert.match(code, /name="caseVersion" value=\{caseVersion\}/);
  assert.match(code, /name="version" value=\{expectedVersion\}/);
  assert.match(code, /state.status === "success"[\s\S]*刷新核对保存结果/);
});
test('030 management acceptance is isolated, rollback-only and covers all sensitive payload categories', () => {
  const sql = read('tests/sql/reporting-operations-030.sql');
  assert.match(sql, /^BEGIN;/); assert.match(sql, /ROLLBACK;\s*$/);
  assert.match(sql, /current_setting\('kcny\.test_project', true\) IS DISTINCT FROM 'kirvcbkbkvotnsqnbcyf'/);
  assert.match(sql, /current_setting\('kcny\.test_user_a'\)::uuid/);
  assert.match(sql, /current_setting\('kcny\.test_reviewer'\)::uuid/);
  for (const category of ['reporting_private.requests', 'reporting_private.review_events', 'reporting_private.data_request_keys', 'reporting_private.data_request_reviews', 'reporting_private.retention_reviews']) assert.ok(sql.includes(category));
  assert.match(sql, /test030_aftercall_rollback_changed_fixture/);
  assert.match(sql, /test030_audit_id_order_state_time_or_sensitive_fields_mismatch/);
  assert.doesNotMatch(sql, /disable trigger|session_replication_role|\bCOMMIT;/i);
  const uuidLiterals = sql.match(/'[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}'/gi) ?? [];
  assert.deepEqual(uuidLiterals, ["'00000000-0000-0000-0000-000000000000'"]);
});
