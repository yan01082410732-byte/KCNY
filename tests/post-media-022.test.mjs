import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {commitMedia,MediaOutcomeUnknown} from '../lib/media-commit.ts';
import {mediaReadsAvailable,mediaWritesAvailable,mediaSavedMessage} from '../lib/post-media-policy.ts';
import {maintainMediaBatch} from '../lib/media-maintenance.ts';
import ts from 'typescript';
const source=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
for(const operation of ['finalize','remove'])for(const fault of ['discovery','claim','ack'])test(`${operation} acknowledged commit survives cleanup ${fault} failure`,async()=>{
 const saved={imageId:operation==='remove'?null:crypto.randomUUID(),version:3};let commits=0;
 const result=await commitMedia({commit:async()=>{commits++;return saved;},uncertain:()=>false,reconcile:async()=>{throw Error('must_not_reconcile');},cleanup:async()=>{throw Error(fault);}});
 assert.equal(commits,1);assert.deepEqual({imageId:result.imageId,version:result.version},saved);assert.equal(result.committed,true);assert.equal(result.cleanup.state,'pending');
});
test('real business rejection is not converted into successful cleanup warning',async()=>{
 let cleaned=false;const failure=Error('image_conflict');
 await assert.rejects(commitMedia({commit:async()=>{throw failure;},uncertain:()=>false,reconcile:async()=>({state:'unknown'}),cleanup:async()=>{cleaned=true;}}),e=>e===failure);assert.equal(cleaned,false);
});
test('lost commit response reconciles identifier without replaying mutation',async()=>{
 let calls=0;const result=await commitMedia({commit:async()=>{calls++;throw Error('transport');},uncertain:()=>true,reconcile:async()=>({state:'committed',result:{version:4,imageId:'confirmed'}}),cleanup:async()=>({deleted:0,failed:0})});
 assert.equal(calls,1);assert.equal(result.imageId,'confirmed');assert.equal(result.cleanup.state,'checked');
});
for(const state of ['unknown','not_committed'])test(`unconfirmed ${state} outcome remains a failure`,async()=>{
 await assert.rejects(commitMedia({commit:async()=>{throw Error('transport');},uncertain:()=>true,reconcile:async()=>({state}),cleanup:async()=>{throw Error('must_not_clean');}}),MediaOutcomeUnknown);
});
test('lookup failure does not claim saved or reject a possibly committed upload',async()=>{
 await assert.rejects(commitMedia({commit:async()=>{throw Error('transport');},uncertain:()=>true,reconcile:async()=>{throw Error('lookup_failed');},cleanup:async()=>({deleted:0,failed:0})}),MediaOutcomeUnknown);
 const worker=source('supabase/functions/kcny-post-media/index.ts');assert.ok(worker.indexOf('return Response.json(await afterCommit("finish"')>worker.indexOf('service("reject"'));
});
test('Storage deletion failures remain visible and do not claim all cleanup complete',async()=>{
 const result=await commitMedia({commit:async()=>({version:2}),uncertain:()=>false,reconcile:async()=>({state:'unknown'}),cleanup:async()=>({deleted:1,failed:1})});
 assert.equal(result.cleanup.state,'pending');assert.equal(result.cleanup.failed,1);
});
test('production and test environment combinations use the same exact allowlist',()=>{
 const production={NEXT_PUBLIC_SUPABASE_URL:'https://czcyarmramlpmilfhpqo.supabase.co',VERCEL_ENV:'production',KCNY_MEDIA_DEPLOYMENT_ENV:'production',KCNY_MEDIA_ENVIRONMENT:'production'};
 assert.equal(mediaReadsAvailable(production),true);assert.equal(mediaWritesAvailable(production),false);assert.equal(mediaWritesAvailable({...production,KCNY_POST_IMAGES_ENABLED:'true'}),true);
 for(const change of [{VERCEL_ENV:'preview'},{KCNY_MEDIA_ENVIRONMENT:'test'},{KCNY_MEDIA_DEPLOYMENT_ENV:undefined},{NEXT_PUBLIC_SUPABASE_URL:production.NEXT_PUBLIC_SUPABASE_URL+'.evil.invalid'},{NEXT_PUBLIC_SUPABASE_URL:'https://kirvcbkbkvotnsqnbcyf.supabase.co'}])assert.equal(mediaReadsAvailable({...production,...change}),false);
 assert.equal(mediaReadsAvailable({SUPABASE_URL:production.NEXT_PUBLIC_SUPABASE_URL,KCNY_MEDIA_ENVIRONMENT:'production',KCNY_MEDIA_DEPLOYMENT_ENV:'production'}),true);
});
test('function JWT setting is declarative without weakening real user verification',()=>{
 assert.match(source('supabase/config.toml'),/\[functions\.kcny-post-media\][\s\S]*verify_jwt = false/);
 const worker=source('supabase/functions/kcny-post-media/index.ts');assert.match(worker,/viewer.auth.getUser\(token\)/);assert.match(worker,/viewer.from\("posts"\).select\("id"\)/);assert.doesNotMatch(worker,/user_metadata/);
});
test('cleanup warning is bilingual and UI retains the acknowledged result',()=>{
 for(const language of ['CN','KR'])assert.notEqual(mediaSavedMessage(true,language),mediaSavedMessage(false,language));
 const ui=source('components/PostImageControls.tsx');assert.match(ui,/setStatus\(result\)/);assert.match(ui,/mediaSavedMessage\(result.cleanup\?\.state === "pending"/);assert.match(ui,/removalId.current \|\|/);
 const client=source('lib/post-media-client.ts');assert.match(client,/operation: "outcome"/);assert.match(client,/throw new MediaRequestError\("outcome_unknown"\)/);
});
test('trusted maintenance uses bounded discovery and Storage API; ordinary global endpoint absent',async()=>{
 const calls=[];const admin={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='media_maintenance_candidates'?[{owner_id:'owner'}]:name==='media_service'&&args.p_operation==='cleanup_claim'?[{id:'job',lease:'lease',bucket:'kcny-post-staging',path:'11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333/original'}]:{},error:null};},storage:{from:()=>({remove:async paths=>({data:paths.map(name=>({name})),error:null})})}};
 const result=await maintainMediaBatch(admin);assert.equal(result.deleted,1);assert.equal(calls[0].args.p_limit,20);assert.ok(calls.some(x=>x.args.p_operation==='cleanup_ack'));
 const sql=source('supabase/migrations/20261024182118_post_image_outcomes_maintenance_022.sql');
 assert.match(sql,/status='deleting' and c.lease_until<now\(\)/);assert.match(sql,/u.state='processing' and coalesce\(u.lease_until/);assert.match(sql,/late_object_observed/);assert.match(sql,/storage.objects/);assert.doesNotMatch(sql,/delete\s+from\s+storage\.objects/i);assert.match(sql,/revoke all on function public.media_maintenance_candidates\(uuid,integer\) from public,anon,authenticated/);
 assert.doesNotMatch(source('app/api/post-media/route.ts'),/"maintenance"/);
});
test('interrupted maintenance acknowledgement leaves a retryable failure, never false success',async()=>{
 const admin={rpc:async(name,args)=>({data:name==='media_maintenance_candidates'?[{owner_id:'owner'}]:args.p_operation==='cleanup_claim'?[{bucket:'kcny-post-images',path:'11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/33333333-3333-3333-3333-333333333333.webp'}]:{},error:args.p_operation==='cleanup_ack'?Error('ack'):null}),storage:{from:()=>({remove:async paths=>({data:paths.map(name=>({name})),error:null})})}};
 await assert.rejects(maintainMediaBatch(admin),/maintenance_ack_failed/);
});
function clientWithFetch(fetch){
 const module={exports:{}};
 const compiled=ts.transpileModule(source('lib/post-media-client.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const require=name=>name.includes('supabase/client')?{createClient:()=>({storage:{from:()=>({uploadToSignedUrl:async()=>({error:null})})}})}:{mediaFileError:()=>null};
 new Function('require','module','exports','fetch',compiled)(require,module,module.exports,fetch);return module.exports;
}
test('client lost response reads authoritative outcome, not a second mutation',async()=>{
 const calls=[];const client=clientWithFetch(async(_url,request)=>{const body=JSON.parse(request.body);calls.push(body.operation);if(body.operation==='finalize')throw Error('disconnected');return Response.json({state:'committed',result:{imageId:'image',version:2}});});
 const result=await client.requestMedia({operation:'finalize',uploadId:'upload'});assert.equal(result.committed,true);assert.deepEqual(calls,['finalize','outcome']);
});
test('client retry of an unknown remove queries same request, even when visible version changed',async()=>{
 const calls=[];let recover=false;const client=clientWithFetch(async(_url,request)=>{const body=JSON.parse(request.body);calls.push(body);if(!recover)throw Error('disconnected');return Response.json({state:'committed',result:{imageId:null,version:2}});});
 await assert.rejects(client.requestMedia({operation:'remove',requestId:'same',expectedVersion:1}),/outcome_unknown/);recover=true;
 const result=await client.requestMedia({operation:'remove',requestId:'same',expectedVersion:2});assert.equal(result.imageId,null);assert.deepEqual(calls.map(x=>x.operation),['remove','outcome','outcome']);assert.equal(calls.at(-1).requestId,'same');
});
test('upload retry preserves its original allocation and reconciles before reserving again',async()=>{
 const calls=[];let recover=false;const client=clientWithFetch(async(_url,request)=>{const body=JSON.parse(request.body);calls.push(body);if(body.operation==='reserve')return Response.json({uploadId:'upload',path:'path',token:'synthetic-test-capability'});if(!recover)throw Error('disconnected');return Response.json({state:'committed',result:{imageId:'upload',version:2}});});
 const file=new File(['synthetic'],'fixture.png',{type:'image/png'});
 await assert.rejects(client.uploadPostImage('post',file,1,'same',()=>{}),/outcome_unknown/);recover=true;
 const result=await client.uploadPostImage('post',file,2,'same',()=>{});assert.equal(result.version,2);assert.deepEqual(calls.map(x=>x.operation),['reserve','finalize','outcome','outcome']);
});
test('client preserves explicit permission/business errors rather than fabricating saved result',async()=>{
 const calls=[];const client=clientWithFetch(async(_url,request)=>{calls.push(JSON.parse(request.body).operation);return Response.json({error:'image_conflict'},{status:409});});
 await assert.rejects(client.requestMedia({operation:'remove',requestId:'same'}),/image_conflict/);assert.deepEqual(calls,['remove']);
});
test('foreign upload outcome remains a 404, not a fabricated indeterminate owner result',()=>{
 assert.match(source('supabase/functions/kcny-post-media/index.ts'),/error.code === "PT404" \? "upload_not_found" : "outcome_unknown"/);
});
