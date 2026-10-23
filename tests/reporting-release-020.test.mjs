import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reportsEnvironmentEnabled} from '../lib/reporting.ts';
const prod={NEXT_PUBLIC_SUPABASE_URL:'https://czcyarmramlpmilfhpqo.supabase.co',VERCEL_ENV:'production'};
const isolated={NEXT_PUBLIC_SUPABASE_URL:'https://kirvcbkbkvotnsqnbcyf.supabase.co'};
test('reporting production is disabled by default and requires explicit opt-in',()=>{
 assert.equal(reportsEnvironmentEnabled(prod),false);
 assert.equal(reportsEnvironmentEnabled({...prod,KCNY_REPORTS_ENABLED:'false'}),false);
 assert.equal(reportsEnvironmentEnabled({...prod,KCNY_REPORTS_ENABLED:'true'}),true);
});
test('reporting production project is refused in preview and local environments',()=>{
 for(const VERCEL_ENV of [undefined,'preview','development'])assert.equal(reportsEnvironmentEnabled({...prod,VERCEL_ENV,KCNY_REPORTS_ENABLED:'true'}),false);
});
test('reporting test project cannot enable a production deployment',()=>{
 assert.equal(reportsEnvironmentEnabled({...isolated,KCNY_REPORTS_ENABLED:'true'}),true);
 assert.equal(reportsEnvironmentEnabled({...isolated,VERCEL_ENV:'production',KCNY_REPORTS_ENABLED:'true'}),false);
 assert.equal(reportsEnvironmentEnabled({...prod,NEXT_PUBLIC_SUPABASE_URL:'https://unknown.supabase.co',KCNY_REPORTS_ENABLED:'true'}),false);
});
test('release checker exposes only reporting activation boolean and does not query case data',()=>{
 const code=readFileSync(new URL('../app/api/release-check/route.ts',import.meta.url),'utf8');
 assert.match(code,/applicationEnabled: reportsEnvironmentEnabled\(process.env\)/);
 assert.doesNotMatch(code,/\.from\(|\.rpc\(|auth\.get/);
});
