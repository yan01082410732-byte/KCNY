import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import ts from 'typescript';
import {mediaEnvironment,mediaReadsAvailable,mediaWritesAvailable,MEDIA_TEST_URL,MEDIA_PRODUCTION_URL} from '../lib/post-media-policy.ts';
import {maintainMediaBatch} from '../lib/media-maintenance.ts';
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const production={SUPABASE_URL:MEDIA_PRODUCTION_URL,KCNY_MEDIA_ENVIRONMENT:'production',KCNY_MEDIA_DEPLOYMENT_ENV:'production'};
const isolated={SUPABASE_URL:MEDIA_TEST_URL,KCNY_MEDIA_ENVIRONMENT:'test',KCNY_MEDIA_DEPLOYMENT_ENV:'development'};
for(const [name,env,want] of [
 ['production',production,'production'],['test',isolated,'test'],['test Preview',{...isolated,VERCEL_ENV:'preview',KCNY_MEDIA_DEPLOYMENT_ENV:'preview'},'test'],
 ['production URL/test config',{...isolated,SUPABASE_URL:MEDIA_PRODUCTION_URL},null],
 ['test URL/production config',{...production,SUPABASE_URL:MEDIA_TEST_URL},null],
 ['missing all',{},null],['missing environment',{...isolated,KCNY_MEDIA_ENVIRONMENT:undefined},null],
 ['missing deployment',{...isolated,KCNY_MEDIA_DEPLOYMENT_ENV:undefined},null],
 ['conflicting URLs',{...isolated,NEXT_PUBLIC_SUPABASE_URL:MEDIA_PRODUCTION_URL},null],
 ['Preview production',{...production,VERCEL_ENV:'preview'},null],
 ['URL suffix spoof',{...production,SUPABASE_URL:MEDIA_PRODUCTION_URL+'.invalid'},null],
 ['invalid environment',{...isolated,KCNY_MEDIA_ENVIRONMENT:'admin'},null],
]) test(`026 exact environment: ${name}`,()=>assert.equal(mediaEnvironment(env),want));
test('026 writes default off, reads independent, invalid config cannot be overridden by flag',()=>{
 for(const env of [production,isolated]){assert.equal(mediaWritesAvailable(env),false);assert.equal(mediaReadsAvailable(env),true);assert.equal(mediaWritesAvailable({...env,KCNY_POST_IMAGES_ENABLED:'true'}),true);}
 assert.equal(mediaWritesAvailable({...production,VERCEL_ENV:'preview',KCNY_POST_IMAGES_ENABLED:'true'}),false);
});
function worker(env){
 let handler;const calls=[];
 const admin={rpc:async(name,args)=>{calls.push({name,args});return{data:name==='media_maintenance_begin_v2'?{runId:'run',lease:'lease',after:null}:name==='media_maintenance_candidates'?[]:name==='media_maintenance_finish'?{status:'completed'}:true,error:null};}};
 const compiled=ts.transpileModule(source('supabase/functions/kcny-media-maintenance/index.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports','Deno',compiled)(name=>name==='@supabase/supabase-js'?{createClient:()=>admin}:name.includes('post-media-policy')?{mediaEnvironment}:{maintainMediaBatch},module,module.exports,{env:{get:name=>env[name]},serve:fn=>{handler=fn;}});
 return{handler,calls};
}
const signed={'x-kcny-maintenance-id':crypto.randomUUID(),'x-kcny-maintenance-time':String(Math.floor(Date.now()/1000)),'x-kcny-maintenance-signature':'0'.repeat(64)};
for(const env of [production,isolated])test(`026 maintenance uses trusted ${env.KCNY_MEDIA_ENVIRONMENT} identity, not request body/header`,async()=>{
 const w=worker(env);const r=await w.handler(new Request('http://unit',{method:'POST',headers:{...signed,'x-kcny-environment':'forged'},body:JSON.stringify({environment:'forged',project_url:'https://forged.invalid'})}));
 assert.equal(r.status,200);assert.equal(w.calls[0].name,'media_maintenance_begin_v2');assert.equal(w.calls[0].args.p_environment,env.KCNY_MEDIA_ENVIRONMENT);assert.equal(w.calls[0].args.p_project_url,env.SUPABASE_URL);
});
for(const env of [{}, {...production,KCNY_MEDIA_ENVIRONMENT:'test'}, {...isolated,KCNY_MEDIA_DEPLOYMENT_ENV:'production'}])test('026 maintenance denies missing/mismatched config before RPC',async()=>{
 const w=worker(env);assert.equal((await w.handler(new Request('http://unit',{method:'POST',headers:signed}))).status,403);assert.equal(w.calls.length,0);
});
const path='11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.webp';
function cleanup(data,ackError=false){
 const progress=[],acks=[];let removed=0;
 const admin={rpc:async(name,args)=>{if(args.p_operation==='cleanup_ack'){acks.push(args);return{data:{},error:ackError?Error('injected'):null};}return{data:name==='media_maintenance_candidates'?[{owner_id:'owner'}]:args.p_operation==='cleanup_claim'?[{id:'job',lease:'lease',bucket:'kcny-post-images',path}]:{},error:null};},storage:{from:()=>({remove:async()=>{removed++;return{data,error:null};}})}};
 return{run:()=>maintainMediaBatch(admin,null,{progress:async value=>progress.push({...value})}),progress,acks,get removed(){return removed;}};
}
test('026 actual deletion, already absent, and acknowledgement counters are distinct',async()=>{
 const present=await cleanup([{name:path}]).run(),absent=await cleanup([]).run();
 assert.deepEqual([present.physicalDeleted,present.alreadyAbsent,present.acknowledged],[1,0,1]);
 assert.deepEqual([absent.physicalDeleted,absent.alreadyAbsent,absent.acknowledged],[0,1,1]);
});
test('026 known physical outcome is persisted before ack failure, durable lease not falsely acknowledged',async()=>{
 const f=cleanup([{name:path}],true);await assert.rejects(f.run(),/maintenance_ack_failed/);assert.equal(f.progress[0].physicalDeleted,1);assert.equal(f.progress[0].acknowledged,0);assert.equal(f.removed,1);
});
for(const response of [undefined,null,[{name:'wrong'}],[{name:path},{name:path}]])test('026 ambiguous Storage result never invents deletion or ack',async()=>{
 const f=cleanup(response);await assert.rejects(f.run(),/maintenance_removal_result_unknown/);assert.equal(f.acks.length,0);
});
test('026 SQL binds project, environment, source, nonce and expiry; v1 execution revoked',()=>{
 const sql=source('supabase/migrations/20261025095904_post_media_production_adaptation_026.sql');
 assert.match(sql,/p_project_url is distinct from s.project_url/);assert.match(sql,/d.source\|\|':'\|\|p_timestamp/);
 assert.match(sql,/status='queued' for update/);assert.match(sql,/maintenance_begin\(uuid,text,text\) from public,anon,authenticated,service_role/);
 assert.match(sql,/kcny_media_maintenance_026_/);assert.match(sql,/physical_deleted integer/);assert.doesNotMatch(sql,/delete\s+from\s+storage.objects|drop schema|update reporting_private/i);
});
test('026 production/test installers create independent secrets and leave cron paused without enabling upload',()=>{
 for(const env of ['production','test']){const sql=source(`supabase/maintenance/install-${env}-026.sql`);assert.match(sql,new RegExp('kcny_media_maintenance_026_'+env));assert.match(sql,/gen_random_bytes\(32\)/);assert.match(sql,/active:=false/);assert.doesNotMatch(sql,/update media_private.configuration set enabled=true|decrypted_secret/);}
});
test('026 complete Edge relative import closure exists in candidate source',()=>{
 const visited=new Set();function visit(url){if(visited.has(url.href))return;visited.add(url.href);assert.ok(existsSync(url),url.pathname);const text=readFileSync(url,'utf8');for(const match of text.matchAll(/from\s+["'](\.[^"']+)["']/g))visit(new URL(match[1],url));}
 for(const name of ['kcny-post-media','kcny-media-maintenance'])visit(new URL(`../supabase/functions/${name}/index.ts`,import.meta.url));
 assert.ok(visited.size>=6);
});
