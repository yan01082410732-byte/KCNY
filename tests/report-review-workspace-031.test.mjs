import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as reporting from '../lib/reporting.ts';
import { parseReviewQuery, reviewQueryParams, reviewQueueHref, reviewCaseHref, reviewCursorFilter, reviewSummaryArgs, parseReviewSummary, nextReviewScope } from '../lib/report-review-workspace.ts';
import { communityPage } from '../lib/community-pagination.ts';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const id = '10000000-0000-4000-8000-000000000001';
const timestamp = '2026-10-26T09:00:00.000Z';
const query = extra => parseReviewQuery(extra ?? {}, timestamp);

test('031 workspace defaults are newest bounded snapshot, with no fabricated filters', () => {
  const q = query(); assert.equal(q.valid, true); assert.equal(q.order, 'newest'); assert.equal(q.age, 'all'); assert.equal(q.asOf, timestamp); assert.equal(q.olderThan, undefined);
});
test('031 valid filters map to the precise summary scope, excluding status and cursor', () => {
  const q = query({ kind: 'complaint', reason: 'privacy', status: 'pending', age: '7d', order: 'oldest', id });
  assert.equal(q.valid, true); assert.deepEqual(reviewSummaryArgs(q), { p_kind: 'complaint', p_reason: 'privacy', p_report_id: id, p_as_of: timestamp, p_older_than: '2026-10-19T09:00:00.000Z' });
});
for (const invalid of [{ kind: 'private' }, { reason: 'password' }, { status: 'admin' }, { age: '3years' }, { order: 'random' }, { id: 'or(id.not.is.null)' }, { before: 'invalid' }, { kind: ['report', 'complaint'] }, { asOf: 'tomorrow' }, { asOf: '2027-10-26T09:00:00Z' }]) {
  test('031 rejects malformed or injection-like query ' + JSON.stringify(invalid), () => assert.equal(query(invalid).valid, false));
}
test('031 cursor validates timestamp and UUID before composing either tuple direction', () => {
  const q = query({ before: `2026-10-01T09:00:00.123456+00:00|${id}` }); assert.equal(q.valid, true);
  assert.equal(reviewCursorFilter(q.before, 'newest'), `created_at.lt.2026-10-01T09:00:00.123456+00:00,and(created_at.eq.2026-10-01T09:00:00.123456+00:00,id.lt.${id})`);
  assert.match(reviewCursorFilter(q.before, 'oldest'), /created_at.gt.[\s\S]*id.gt/);
  assert.equal(query({ before: `2027-10-01T09:00:00Z|${id}` }).valid, false);
});
test('031 ascending and descending tie-break pages have no duplicate IDs', () => {
  const rows = Array.from({ length: 43 }, (_, i) => ({ id: `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`, created_at: timestamp }));
  for (const order of ['oldest', 'newest']) {
    const sorted = [...rows].sort((a, b) => (order === 'oldest' ? 1 : -1) * a.id.localeCompare(b.id)); let remaining = sorted, all = [];
    while (remaining.length) { const p = communityPage(remaining, 20); all.push(...p.items); if (!p.nextCursor) break; const q = query({ before: p.nextCursor }); remaining = sorted.filter(row => order === 'oldest' ? row.id > q.before.id : row.id < q.before.id); }
    assert.equal(all.length, 43); assert.equal(new Set(all.map(x => x.id)).size, 43);
  }
});
test('031 links preserve validated scope and cursor without arbitrary return destinations', () => {
  const q = query({ kind: 'report', reason: 'spam', status: 'under_review', age: '24h', order: 'oldest', before: `${timestamp}|${id}` });
  for (const language of ['CN', 'KR']) {
    const params = reviewQueryParams(q, language); const reparsed = parseReviewQuery(Object.fromEntries(params), timestamp); assert.deepEqual(reparsed, q);
    assert.ok(reviewCaseHref(id, q, language).startsWith(`/reports/review/${id}?`)); assert.ok(reviewQueueHref(q, language).startsWith('/reports/review?'));
  }
  assert.equal(reviewCaseHref('//evil.test', q, 'CN'), undefined);
});
test('031 next pending query drops exact ID/status only and advances from real current case', () => {
  const q = query({ kind: 'report', reason: 'spam', status: 'resolved', id, order: 'oldest', age: '7d' });
  const next = nextReviewScope(q, { id, created_at: '2026-10-18T09:00:00Z' });
  assert.equal(next.id, undefined); assert.equal(next.status, undefined); assert.equal(next.kind, q.kind); assert.equal(next.reason, q.reason); assert.equal(next.asOf, q.asOf); assert.equal(next.olderThan, q.olderThan); assert.equal(next.before.id, id);
});
test('031 malformed and failed summaries never become fabricated zero counts', () => {
  const good = { counts: { pending: 3, under_review: 2, resolved: 1, dismissed: 0 }, oldest_open_created_at: timestamp };
  assert.deepEqual(parseReviewSummary(good), good);
  for (const bad of [null, {}, { ...good, counts: null }, { ...good, counts: { ...good.counts, pending: -1 } }, { ...good, counts: { ...good.counts, pending: '3' } }, { ...good, oldest_open_created_at: 'bad' }]) assert.equal(parseReviewSummary(bad), null);
});
test('031 reviewer routes gate direct access before queue, summary, detail and internal history', () => {
  for (const file of ['app/reports/review/page.tsx', 'app/reports/review/[id]/page.tsx']) {
    const code = read(file); assert.ok(code.indexOf('!ctx.reviewer') < code.indexOf('ctx.supabase.from(')); assert.match(code, /force-dynamic/);
  }
  const queue = read('app/reports/review/page.tsx'); assert.match(queue, /\.limit\(REPORT_PAGE_SIZE \+ 1\)/); assert.match(queue, /\.lte\("created_at", filters.asOf\)/); assert.match(queue, /\.in\("status", \["pending", "under_review"\]\)/); assert.match(queue, /parseReviewSummary/);
  assert.match(read('app/reports/review/[id]/page.tsx'), /\.limit\(1\)/);
});
test('031 conflict refresh retains controlled private drafts and explicitly adopts new version', () => {
  const code = read('components/ReportReviewForm.tsx');
  assert.match(code, /\[expectedVersion, setExpectedVersion\] = useState\(report.version\)/);
  assert.match(code, /if \(!refreshRequested \|\| report.version === expectedVersion\) return/);
  assert.match(code, /setExpectedVersion\(report.version\)/); assert.match(code, /router.refresh\(\)/);
  for (const field of ['nextStatus', 'publicResolution', 'decisionReason', 'internalNote']) assert.ok(code.includes(`value={${field}}`));
  assert.doesNotMatch(code, /sessionStorage|localStorage|location.reload|dangerouslySetInnerHTML/);
  const detail = read('app/reports/review/[id]/page.tsx'); assert.match(detail, /ReportReviewForm key=\{id\}/); assert.doesNotMatch(detail, /key=\{data.version\}/); assert.match(detail, /data-case-version/);
});
test('031 saved feedback survives revalidation and requires conscious next-step navigation', () => {
  const code = read('components/ReportReviewForm.tsx'); assert.match(code, /state.caseVersion/); assert.match(code, /href=\{continueHref\}/); assert.match(code, /state.status === "success" \|\| !choices.length/);
});
test('031 workstation labels, error states and mobile tap targets support both languages', () => {
  const code = read('components/ReportReviewWorkspace.tsx'); assert.match(code, /role="alert"/); assert.match(code, /不能视为零案件/); assert.match(code, /0건으로 간주하지/);
  for (const name of ['kind', 'reason', 'status', 'age', 'order', 'id']) assert.ok(code.includes(`name="${name}"`));
  const css = read('app/globals.css'); assert.match(css, /review-workspace[\s\S]*min-height: 44px/); assert.match(css, /repeat\(3, minmax\(0, 1fr\)\)/); assert.match(css, /max-width: 450px/);
});

function actions(options = {}) {
  const calls = []; const db = { auth: { getClaims: async () => ({ data: { claims: options.noUser ? null : { sub: 'real-user' } } }) }, rpc: async (name, args) => { calls.push({ name, args }); return { data: options.response ?? 4, error: options.error ?? null }; } };
  const output = ts.transpileModule(read('app/reports/actions.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; new Function('require', 'module', 'exports', output)(name => name === '@/lib/supabase/server' ? { createClient: async () => db } : name === 'next/cache' ? { revalidatePath: path => { calls.push({ path }); if (options.refreshFailure) throw Error('cache unavailable'); } } : reporting, module, module.exports); return { ...module.exports, calls };
}
function values() { const f = new FormData(); for (const [key, value] of Object.entries({ reportId: id, version: '3', nextStatus: 'resolved', publicResolution: 'human resolution', decisionReason: 'reviewed evidence', internalNote: 'private synthetic note' })) f.set(key, value); return f; }
async function inEnvironment(run) {
  const keys = ['KCNY_REPORTS_ENABLED', 'NEXT_PUBLIC_SUPABASE_URL', 'VERCEL_ENV']; const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, { KCNY_REPORTS_ENABLED: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://kirvcbkbkvotnsqnbcyf.supabase.co', VERCEL_ENV: 'development' });
  try { return await run(); } finally { for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
}
test('031 acknowledged review uses actual incremented version and survives cache failure', () => inEnvironment(async () => {
  const a = actions({ refreshFailure: true }); assert.deepEqual(await a.reviewReport({ status: 'idle' }, values()), { status: 'success', reportId: id, caseVersion: 4 }); assert.equal(a.calls[0].args.p_expected_version, 3); assert.doesNotMatch(JSON.stringify(a.calls[0]), /reviewer_id|actor_id/);
}));
test('031 stale conflicts and incorrect save acknowledgements never claim success', () => inEnvironment(async () => {
  assert.deepEqual(await actions({ error: { code: 'PT409', message: 'report_review_conflict' } }).reviewReport({ status: 'idle' }, values()), { status: 'error', reason: 'conflict' });
  for (const response of [3, 5, '4']) assert.equal((await actions({ response }).reviewReport({ status: 'idle' }, values())).status, 'error');
  assert.equal((await actions({ noUser: true }).reviewReport({ status: 'idle' }, values())).reason, 'login_required');
}));
