import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const userId = '10000000-0000-4000-8000-000000000001';
const requestId = '10000000-0000-4000-8000-000000000002';
const attackerId = '10000000-0000-4000-8000-000000000003';
const testEnvironment = { projectRef: 'isolated-fixture-project', origin: 'http://localhost:3133', secret: 'unit-test-only-not-a-production-secret-033' };
const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);

function compiledActions(options = {}) {
  const calls = [];
  const user = options.noUser ? null : {
    id: userId, email: 'synthetic-private-email@example.invalid',
    is_anonymous: Boolean(options.anonymous),
    ...(options.unconfirmed ? {} : options.confirmedAtOnly ? { confirmed_at: '2026-10-26T00:00:00Z' } : { email_confirmed_at: '2026-10-26T00:00:00Z' }),
    user_metadata: { reviewer: true, secret_fixture: 'never-return-this' },
  };
  const supabase = {
    auth: { getUser: async () => { calls.push({ getUser: true }); return { data: { user }, error: options.authError ?? null }; } },
    from: () => { calls.push({ forbiddenDatabaseWrite: true }); throw Error('Unexpected table access'); },
    rpc: () => { calls.push({ forbiddenDatabaseWrite: true }); throw Error('Unexpected RPC'); },
  };
  const helper = {
    BINDING_TTL_MS: 15 * 60 * 1000,
    reviewerBindingEnvironment: () => { calls.push({ gate: true }); return options.disabled ? null : testEnvironment; },
    isBindingUuid: isUuid,
    createReviewerBindingReceipt: (value, secret, now) => {
      calls.push({ receipt: value, secretMatched: secret === testEnvironment.secret, now });
      if (options.receiptFailure) throw Error('Signing failed');
      return options.emptyReceipt ? '' : 'UNIT_TEST_SYNTHETIC_SIGNED_IDENTITY_RECEIPT';
    },
  };
  const output = ts.transpileModule(read('app/reports/reviewer-binding/actions.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    if (name === '@/lib/supabase/server') return { createClient: async () => { calls.push({ createClient: true }); if (options.clientFailure) throw Error('Unavailable'); return options.noConfig ? null : supabase; } };
    if (name === '@/lib/reviewer-binding') return helper;
    throw Error('Unexpected dependency in binding test');
  }, module, module.exports);
  return { ...module.exports, calls };
}
function confirmation(overrides = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ requestId, confirmSelf: 'yes', ...overrides })) if (value !== undefined) form.set(key, String(value));
  return form;
}
const idle = { status: 'idle' };

test('033 disabled binding gate rejects before session or database calls', async () => {
  const actions = compiledActions({ disabled: true });
  assert.deepEqual(await actions.confirmReviewerIdentity(idle, confirmation()), { status: 'error', reason: 'unavailable' });
  assert.deepEqual(actions.calls, [{ gate: true }]);
});
test('033 missing local configuration never creates an identity receipt', async () => {
  const actions = compiledActions({ noConfig: true });
  assert.deepEqual(await actions.confirmReviewerIdentity(idle, confirmation()), { status: 'error', reason: 'unavailable' });
  assert.ok(!actions.calls.some(call => call.receipt));
});
test('033 identity action requires fresh getUser and rejects a missing session', async () => {
  const actions = compiledActions({ noUser: true });
  assert.deepEqual(await actions.confirmReviewerIdentity(idle, confirmation()), { status: 'error', reason: 'login_required' });
  assert.ok(actions.calls.some(call => call.getUser));
  assert.ok(!actions.calls.some(call => call.receipt));
});
test('033 anonymous and unconfirmed accounts cannot produce binding evidence', async () => {
  for (const options of [{ anonymous: true }, { unconfirmed: true }]) {
    const actions = compiledActions(options);
    assert.deepEqual(await actions.confirmReviewerIdentity(idle, confirmation()), { status: 'error', reason: 'login_required' });
    assert.ok(!actions.calls.some(call => call.receipt));
  }
});
test('033 a confirmed_at-only genuine account remains eligible for identity confirmation', async () => {
  const actions = compiledActions({ confirmedAtOnly: true });
  assert.equal((await actions.confirmReviewerIdentity(idle, confirmation())).status, 'success');
});
test('033 missing confirmation, unchecked value or bad request UUID cannot sign a receipt', async () => {
  for (const input of [{ confirmSelf: undefined }, { confirmSelf: 'false' }, { requestId: 'bad-id' }, { requestId: undefined }]) {
    const actions = compiledActions();
    assert.deepEqual(await actions.confirmReviewerIdentity(idle, confirmation(input)), { status: 'error', reason: 'confirmation_required' });
    assert.ok(!actions.calls.some(call => call.receipt));
  }
});
test('033 signed identity uses only current session UUID and server project/origin', async () => {
  const actions = compiledActions();
  const result = await actions.confirmReviewerIdentity(idle, confirmation({ userId: attackerId, role: 'superadmin', projectRef: 'production-forgery', origin: 'https://attacker.invalid', email: 'forged@example.invalid' }));
  assert.equal(result.status, 'success');
  const signing = actions.calls.find(call => call.receipt);
  assert.deepEqual(signing.receipt, { userId, projectRef: testEnvironment.projectRef, origin: testEnvironment.origin, requestId });
  assert.equal(signing.secretMatched, true);
  assert.equal(Date.parse(result.expiresAt), signing.now + 15 * 60 * 1000);
  assert.doesNotMatch(JSON.stringify(result), /email|metadata|secret_fixture|never-return-this|superadmin|production-forgery/);
  assert.ok(!actions.calls.some(call => call.forbiddenDatabaseWrite));
});
test('033 signing failure never displays a fictional confirmation receipt', async () => {
  for (const options of [{ receiptFailure: true }, { emptyReceipt: true }, { clientFailure: true }]) assert.deepEqual(await compiledActions(options).confirmReviewerIdentity(idle, confirmation()), { status: 'error', reason: 'unavailable' });
});
test('033 auth service outage is unavailable; rejected session requires login', async () => {
  assert.equal((await compiledActions({ authError: { status: 503 } }).confirmReviewerIdentity(idle, confirmation())).reason, 'unavailable');
  assert.equal((await compiledActions({ authError: { status: 401 } }).confirmReviewerIdentity(idle, confirmation())).reason, 'login_required');
});
test('033 binding is independent of reporting feature gates and never grants a role', () => {
  const source = read('app/reports/reviewer-binding/actions.ts');
  assert.doesNotMatch(source, /reportingContext|reportsEnvironmentEnabled|KCNY_REPORTS_ENABLED|\.rpc\(|\.from\(|auth\.admin|service_role|user_metadata/);
  assert.doesNotMatch(source, /formData\.get\("(?:userId|role|projectRef|origin|email)"\)/);
  assert.match(source, /auth\.getUser\(\)/);
});
test('033 identity page is dynamic and sends only its real UUID to the client', () => {
  const source = read('app/reports/reviewer-binding/page.tsx');
  assert.match(source, /force-dynamic/); assert.match(source, /reviewerBindingEnvironment\(process.env\)/);
  assert.match(source, /auth\.getUser\(\)/); assert.match(source, /user\.is_anonymous/);
  assert.match(source, /ReviewerBindingConfirmation language=\{language\} userId=\{user.id\}/);
  assert.doesNotMatch(source, /user=\{user\}|email=|metadata=|user_metadata|JSON.stringify\(user\)/);
});
test('033 UI has explicit self confirmation and a readonly success-only receipt', () => {
  const source = read('components/ReviewerBindingConfirmation.tsx');
  assert.match(source, /name="confirmSelf"[\s\S]*value="yes"[\s\S]*checked=\{confirmed\}/);
  assert.match(source, /state.status === "success"/); assert.match(source, /id="reviewer-binding-receipt" value=\{state.receipt\} readOnly/);
  assert.match(source, /pending \|\| locked.current \|\| !requestId \|\| !confirmed/);
  assert.match(source, /min-height: 44px/); assert.match(source, /htmlFor="reviewer-binding-confirm"/);
  assert.match(source, /aria-busy=\{pending\}/); assert.match(source, /role="alert"/);
});
test('033 bilingual explanation never describes receipt generation as reviewer permission', () => {
  const source = read('components/ReviewerBindingConfirmation.tsx');
  for (const text of ['不是登录凭据，也不会授予审核权限', '로그인 자격 증명이 아니며 검토자 권한을 부여하지 않습니다', '安全渠道', '안전한 경로', '回执已到期', '영수증이 만료']) assert.ok(source.includes(text));
  assert.doesNotMatch(source, /sessionStorage|localStorage|console\.|navigator.clipboard|fetch\(/);
  assert.match(source, /clearTimeout\(timer\)/);
});
