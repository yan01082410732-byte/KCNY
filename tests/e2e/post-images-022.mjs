import {createRequire} from 'node:module';import {createInterface} from 'node:readline';import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
if(!process.env.KCNY_E2E_FIXTURE_MODULE||!process.env.KCNY_E2E_OUT)throw Error('Approved external fixtures/output required');
const {accounts,testConfig,safe,playwrightModule,executablePath}=await import(pathToFileURL(process.env.KCNY_E2E_FIXTURE_MODULE).href);
const require=createRequire(new URL('../../package.json',import.meta.url));const {createClient}=require('@supabase/supabase-js'),sharp=require('sharp');
if(testConfig.url!=='https://kirvcbkbkvotnsqnbcyf.supabase.co')throw Error('ISOLATION');
const {chromium,expect}=await import(playwrightModule),base='http://localhost:3101',stamp=new Date().toISOString().replace(/[:.]/g,'-');
const out=new URL(stamp+'/',pathToFileURL(process.env.KCNY_E2E_OUT.replace(/[\\/]*$/,'/') ).href);await mkdir(out,{recursive:true});
const results=[],posts=[],api=[],pages=[],contexts=[];const bytes=await sharp({create:{width:120,height:80,channels:3,background:'#e97744'}}).png().toBuffer();
const assert=(v,m)=>{if(!v)throw Error(m);};let browser;
async function check(name,fn){try{results.push({name,status:'PASS',evidence:await fn()});}catch(e){results.push({name,status:'FAIL',reason:safe(e).slice(0,1400)});}await save();console.log(JSON.stringify(results.at(-1)));}
async function save(){await writeFile(new URL('results.json',out),JSON.stringify({project:'kirvcbkbkvotnsqnbcyf',stamp,results},null,2));await writeFile(new URL('state.json',out),JSON.stringify({project:'kirvcbkbkvotnsqnbcyf',posts},null,2));}
async function call(who,body){const r=await api[who].functions.invoke('kcny-post-media',{body});if(r.error){const v=await r.error.context?.json().catch(()=>null);return {status:r.error.context?.status??503,error:v?.error};}return {status:200,data:r.data};}
function ok(r){assert(r.status===200,'API_'+r.status+'_'+r.error);return r.data;}
async function create(label){const r=ok(await call(0,{operation:'create',requestId:crypto.randomUUID(),payload:{title:'022 '+stamp+' '+label,content:'Synthetic targeted test only / 합성 테스트.',category:'other',language:'CN'}}));posts.push({id:r.postId,label});await save();return r.postId;}
async function attach(id){const status=ok(await call(0,{operation:'status',postId:id}));const a=ok(await call(0,{operation:'reserve',postId:id,requestId:crypto.randomUUID(),expectedVersion:status.version,mime:'image/png',size:bytes.length}));assert(!(await api[0].storage.from('kcny-post-staging').uploadToSignedUrl(a.path,a.token,bytes,{contentType:'image/png',upsert:false})).error,'PUT_FAILED');return ok(await call(0,{operation:'finalize',uploadId:a.uploadId}));}
async function visible(page){await expect.poll(()=>page.locator('figure.post-image img').first().evaluate(n=>n.complete&&n.naturalWidth>0).catch(()=>false)).toBe(true);}
async function init(){browser=await chromium.launch({headless:true,executablePath});for(let i=0;i<2;i++){
 const client=createClient(testConfig.url,testConfig.key,{auth:{persistSession:false,autoRefreshToken:false}});assert(!(await client.auth.signInWithPassword({email:accounts[i].email,password:accounts[i].password})).error,'LOGIN_BLOCKED');api.push(client);
 const context=await browser.newContext({viewport:{width:820,height:1180}});contexts.push(context);await context.route('**/*',route=>['localhost','kirvcbkbkvotnsqnbcyf.supabase.co','fonts.googleapis.com','fonts.gstatic.com'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
 const page=await context.newPage();page.setDefaultTimeout(90000);pages.push(page);await page.goto(base+'/auth/login?lang=CN');await page.locator('#email').fill(accounts[i].email);await page.locator('#password').fill(accounts[i].password);await page.locator('form').filter({has:page.locator('#password')}).locator('button[type=submit]').click();await page.waitForURL(u=>u.pathname==='/');await expect(page.locator('.user-menu-trigger')).toBeVisible();}
}
await init();console.log('READY '+JSON.stringify({out:out.pathname}));
for await(const line of createInterface({input:process.stdin,terminal:false})){try{const cmd=JSON.parse(line);
 if(cmd.op==='prepare')await check('prepare_six_real_image_cases',async()=>{for(const fault of ['discovery','claim','ack'])for(const operation of ['finalize','remove']){const id=await create(fault+'-'+operation);await attach(id);}return {posts:posts.length};});
 else if(cmd.op==='fault')for(const operation of cmd.operation?[cmd.operation]:['finalize','remove'])await check(`${operation}_committed_cleanup_${cmd.kind}_fails`,async()=>{
  const id=posts.find(p=>p.label===cmd.kind+'-'+operation).id,page=pages[0];await page.goto(base+`/posts/${id}/edit?lang=CN`);await visible(page);
  let response;const listener=async r=>{if(new URL(r.url()).pathname==='/api/post-media'&&r.request().method()==='POST'){const body=r.request().postDataJSON();if(body.operation===(operation==='finalize'?'finalize':'remove'))response={status:r.status(),data:await r.json()};}};page.on('response',listener);
  if(operation==='finalize'){await page.locator('#post-image-file').setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:bytes});await page.getByRole('button',{name:'上传图片／重试',exact:true}).click({noWaitAfter:true});}
  else await page.getByRole('button',{name:'移除当前图片',exact:true}).click({noWaitAfter:true});
  await expect(page.locator('.post-image-management [role="status"]').filter({hasText:'已保存'})).toContainText('清理待重试');
  await expect.poll(()=>response?.data?.committed).toBe(true);page.off('response',listener);assert(response.status===200&&response.data.cleanup.state==='pending','FALSE_FAILURE');
  const s=ok(await call(0,{operation:'status',postId:id}));assert(s.version===response.data.version,'VERSION_MISMATCH');assert(s.imageId===response.data.imageId,'IMAGE_MISMATCH');
  if(operation==='finalize')await visible(page);await page.screenshot({path:new URL(`${cmd.kind}-${operation}.png`,out).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});
  return {httpStatus:response.status,committed:true,cleanup:response.data.cleanup.state,dbVersion:s.version,imagePresent:!!s.imageId};
 });
 else if(cmd.op==='controls'){
 await check('missing_forged_expired_claim_credentials_rejected',async()=>{const postId=posts[0].id;const expiredClaim=['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',Buffer.from(JSON.stringify({exp:1,role:'authenticated',sub:crypto.randomUUID()})).toString('base64url'),'invalidsignature'].join('.');for(const credential of ['', 'not-a-token', expiredClaim]){const r=await fetch(testConfig.url+'/functions/v1/kcny-post-media',{method:'POST',headers:{apikey:testConfig.key,'content-type':'application/json',...(credential?{authorization:'Bearer '+credential}:{})},body:JSON.stringify({operation:'status',postId})});assert(r.status===401,'AUTH_'+r.status);}return{denied:3,naturallyExpiredSignedCredential:'NOT_AVAILABLE',expiredClaimIsAlsoForged:true};});
 await check('cross_user_outcome_and_state_denied',async()=>{const id=posts.find(p=>p.label==='discovery-finalize').id;const r=await call(1,{operation:'status',postId:id});assert([403,404].includes(r.status),'CROSS_USER_ACCESS');for(const name of ['media_maintenance_candidates','media_operation_outcome'])assert((await api[1].rpc(name,name==='media_maintenance_candidates'?{p_after:null,p_limit:20}:{p_actor:crypto.randomUUID(),p_request:{kind:'remove',requestId:crypto.randomUUID()}})).error,'PRIVILEGED_RPC_ALLOWED');return{ordinaryDenied:true};});
 await check('commit_response_loss_reconciles_without_false_failure',async()=>{const id=await create('lost-response');const r=await attach(id);assert(r.committed&&r.imageId,'LOST_RESPONSE_NOT_RECOVERED');return {committed:r.committed,version:r.version};});
 }else if(cmd.op==='abandoned')await check('abandoned_allocation_no_finalize',async()=>{const id=await create('abandoned');const r=ok(await call(0,{operation:'reserve',postId:id,requestId:crypto.randomUUID(),expectedVersion:0,mime:'image/png',size:bytes.length}));assert(!(await api[0].storage.from('kcny-post-staging').uploadToSignedUrl(r.path,r.token,bytes,{contentType:'image/png',upsert:false})).error,'ABANDONED_PUT');return {postId:id,uploadId:r.uploadId};});
 else if(cmd.op==='leave')await check('owner_left_before_management_maintenance',async()=>{await api[0].auth.signOut({scope:'local'});await contexts[0].close();return{ownerSignedOut:true,maintenanceMustNotUseOwnerSession:true};});
 else if(cmd.op==='read')await check('active_images_after_maintenance',async()=>{const ids=posts.filter(p=>p.label.endsWith('finalize')).map(p=>p.id);const images=ok(await call(1,{operation:'read',ids})).images;assert(images.length===ids.length,'ACTIVE_IMAGE_LOST');for(const image of images)assert((await fetch(image.url)).status===200,'ACTIVE_FILE_MISSING');return{readable:images.length};});
 else if(cmd.op==='finish'){
  if(!(await api[0].auth.getUser()).data.user)assert(!(await api[0].auth.signInWithPassword({email:accounts[0].email,password:accounts[0].password})).error,'CLEANUP_LOGIN_BLOCKED');
  for(const post of posts)await api[0].from('posts').delete().eq('id',post.id);for(const context of contexts)await context.close().catch(()=>{});for(const client of api)await client.auth.signOut({scope:'local'});await browser.close();await save();console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,out:out.pathname,accountsSignedOut:true}));break;
 }
 }catch(e){await check('command_failure',async()=>{throw e;});}}
