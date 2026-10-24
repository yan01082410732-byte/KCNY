// Requires an approved repo-external fixture module; never writes credentials or browser state.
import {createClient} from '@supabase/supabase-js';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomFillSync} from 'node:crypto';
if(!process.env.KCNY_E2E_FIXTURE_MODULE||!process.env.KCNY_E2E_OUT)throw Error('BLOCKED: approved external fixtures and evidence directory required');
const fixture=await import(pathToFileURL(resolve(process.env.KCNY_E2E_FIXTURE_MODULE)).href);
const {accounts,testConfig,playwrightModule,executablePath}=fixture;
if(testConfig.url!=='https://kirvcbkbkvotnsqnbcyf.supabase.co')throw Error('ISOLATION_GUARD');
const {chromium,expect}=await import(playwrightModule),sharp=createRequire(import.meta.url)('sharp');
const base='http://localhost:3101',off='http://localhost:3102';
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),out=join(resolve(process.env.KCNY_E2E_OUT),stamp+'-'+(process.argv[2]??'main'));
await mkdir(out,{recursive:true});
const state=process.env.KCNY_E2E_STATE?JSON.parse(await readFile(process.env.KCNY_E2E_STATE,'utf8')):{project:'kirvcbkbkvotnsqnbcyf',posts:[],uploads:[]};
if(state.project!=='kirvcbkbkvotnsqnbcyf')throw Error('STATE_TARGET_GUARD');
const results=[],pageErrors=[],http5xx=[],api=[],contexts=[],pages=[];
let browser;
const assert=(value,message)=>{if(!value)throw Error(message);};
function safe(error){return fixture.safe(error).replace(/([?&](?:token|signature|apikey)=)[^\s"'<>]+/gi,'$1[REDACTED]').replace(/https:\/\/[^\s"'<>]+\/storage\/v1\/object\/sign\/[^\s"'<>]+/g,'[SIGNED_IMAGE_URL]');}
async function save(){await writeFile(join(out,'results.json'),JSON.stringify({stamp,project:state.project,results,pageErrors,http5xx},null,2));await writeFile(join(out,'state.json'),JSON.stringify(state,null,2));}
async function check(name,kind,fn){try{const evidence=await fn();results.push({name,kind,status:'PASS',evidence});}catch(error){results.push({name,kind,status:'FAIL',reason:safe(error)});}await save();console.log(results.at(-1).status+' '+name);return results.at(-1);}
async function call(index,body){const r=await api[index].functions.invoke('kcny-post-media',{body});if(r.error){const value=await r.error.context?.json().catch(()=>null);return{status:r.error.context?.status??503,error:value?.error??'request_failed'};}return{status:200,data:r.data};}
const success=(r,op)=>{assert(r.status===200,`${op}_${r.status}_${r.error}`);return r.data;};
const payload=label=>({title:`021 ${stamp} ${label}`,content:'合成测试内容 / 합성 테스트. No real user media.',category:'other',language:'CN'});
async function create(index,label){const data=success(await call(index,{operation:'create',requestId:crypto.randomUUID(),payload:payload(label)}),'create');state.posts.push({id:data.postId,owner:index});return data.postId;}
async function status(index,postId){return success(await call(index,{operation:'status',postId}),'status');}
async function reserve(index,postId,mime,size,expectedVersion,requestId=crypto.randomUUID()){
 const r=await call(index,{operation:'reserve',postId,mime,size,expectedVersion,requestId});const data=success(r,'reserve');
 if(!state.uploads.some(x=>x.id===data.uploadId))state.uploads.push({id:data.uploadId,postId,owner:index});return data;
}
async function put(index,reservation,bytes,mime){if(reservation.completed||reservation.uploaded)return;const r=await api[index].storage.from('kcny-post-staging').uploadToSignedUrl(reservation.path,reservation.token,bytes,{contentType:mime,upsert:false});assert(!r.error,'storage_upload_failed');}
async function attach(index,postId,bytes,mime,expectedVersion){const r=await reserve(index,postId,mime,bytes.length,expectedVersion);await put(index,r,bytes,mime);return success(await call(index,{operation:'finalize',uploadId:r.uploadId}),'finalize');}
async function readImage(index,postId){const r=success(await call(index,{operation:'read',ids:[postId]}),'read');return r.images[0]??null;}
async function bytes(format){return sharp({create:{width:360,height:240,channels:3,background:'#e97451'}}).withMetadata().toFormat(format).toBuffer();}
async function imageVisible(page){const image=page.locator('figure.post-image img').first();await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);}
async function login(page,index){await page.goto(base+'/auth/login?lang=CN');await page.locator('#email').fill(accounts[index].email);await page.locator('#password').fill(accounts[index].password);await page.locator('form').filter({has:page.locator('#password')}).locator('button[type=submit]').click();await page.waitForURL(u=>u.pathname==='/');await expect(page.locator('.user-menu-trigger')).toBeVisible();}
async function init(){
 browser=await chromium.launch({headless:true,executablePath});
 for(let i=0;i<2;i++){
  const client=createClient(testConfig.url,testConfig.key,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=await client.auth.signInWithPassword({email:accounts[i].email,password:accounts[i].password});assert(!auth.error&&auth.data.user,'TEST_ACCOUNT_LOGIN_FAILED');api.push(client);
  const context=await browser.newContext({viewport:{width:1280,height:900}});contexts.push(context);
  await context.route('**/*',route=>{const url=new URL(route.request().url());return ['localhost','kirvcbkbkvotnsqnbcyf.supabase.co','fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)?route.continue():route.abort('blockedbyclient');});
  const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>pageErrors.push(safe(e)));page.on('response',r=>{if(r.status()>=500)http5xx.push({path:new URL(r.url()).pathname,status:r.status()});});pages.push(page);await login(page,i);
 }
}
async function close(){
 for(const page of pages){try{await page.goto(base+'/?lang=CN');if(await page.locator('.user-menu-trigger').count()){await page.locator('.user-menu-trigger').click();await page.locator('form[action="/auth/signout"] button').click();await expect(page.locator('a.signin').filter({hasText:'登录'})).toBeVisible();}}catch(e){results.push({name:'session_logout',kind:'browser',status:'FAIL',reason:safe(e)});}}
 for(const client of api)await client.auth.signOut({scope:'local'});if(browser)await browser.close();await save();
 console.log(JSON.stringify({out,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,pageerrors:pageErrors.length,http5xx:http5xx.length}));
}
try{
 await check('two_real_isolated_user_sessions','browser',async()=>{await init();return{accounts:2,independentContexts:2};});
 if(api.length!==2||pages.length!==2)throw Error('STOP: legitimate sessions unavailable');
 if(process.argv[2]==='recheck'){
  await check('oversize_client_feedback_targeted_recheck','browser',async()=>{await pages[0].goto(base+'/posts/new?lang=CN');await pages[0].locator('#post-image-file').setInputFiles({name:'over.png',mimeType:'image/png',buffer:Buffer.alloc(5242881)});await expect(pages[0].locator('p.auth-error[role="alert"]')).toContainText('5 MiB');return{maxBytes:5242880,rejectedBytes:5242881};});
  await check('upload_failure_retry_targeted_recheck','browser_fault_injection',async()=>{
   const page=pages[0],title=`021 ${stamp} targeted retry`,file=await bytes('png');let aborted=0,phase='setup';
   const pattern='**/storage/v1/object/upload/sign/kcny-post-staging/**';
   try {
    await page.goto(base+'/posts/new?lang=CN');await page.locator('#title').fill(title);await page.locator('#content').fill('Retained after a controlled failed upload.');await page.locator('#post-image-file').setInputFiles({name:'retry.png',mimeType:'image/png',buffer:file});
    await contexts[0].route(pattern,route=>{aborted++;return route.abort('failed');});phase='first-submit';
    await page.getByRole('button',{name:'发布帖子',exact:true}).click({noWaitAfter:true});phase='failure-feedback';
    await expect(page.locator('p.auth-error[role="alert"]')).toBeVisible({timeout:90000});assert(aborted>0,'FAULT_NOT_OBSERVED');
    await expect(page.locator('#title')).toHaveValue(title);await expect(page.locator('#content')).toHaveValue('Retained after a controlled failed upload.');
    await contexts[0].unroute(pattern);phase='retry-submit';await page.getByRole('button',{name:'发布帖子',exact:true}).click({noWaitAfter:true});phase='retry-navigation';
    await page.waitForURL(u=>/^\/posts\/[a-f0-9-]{36}$/.test(u.pathname),{timeout:90000});await imageVisible(page);const id=new URL(page.url()).pathname.split('/')[2];state.posts.push({id,owner:0});
    const count=await api[0].from('posts').select('id').eq('title',title);assert(count.data.length===1,'RETRY_CREATED_DUPLICATE');return{postId:id,abortedRequests:aborted,postCount:1};
   } catch(error){throw Error(`${phase}: ${safe(error)}`);} finally{await contexts[0].unroute(pattern);}
  });
 }else if(process.argv[2]==='controls'){
  await check('database_switch_blocks_direct_worker_upload','real_api',async()=>{const r=await call(0,{operation:'reserve',postId:state.protectedPostId,requestId:crypto.randomUUID(),mime:'image/png',size:100,expectedVersion:0});assert(r.status===403&&r.error==='media_disabled','DB_SWITCH_NOT_ENFORCED');return{status:r.status};});
  await check('existing_validated_image_remains_readable_with_writes_off','real_api',async()=>{const image=await readImage(0,state.protectedPostId);assert(image,'DISABLEMENT_LOST_IMAGE');const response=await fetch(image.url);assert(response.ok,'DISABLEMENT_LOST_OBJECT');return{http:response.status};});
  await check('anonymous_local_api_upload_rejected','real_api',async()=>{const anon=await browser.newContext();try{const r=await anon.request.post(base+'/api/post-media',{data:{operation:'reserve',postId:state.protectedPostId}});assert(r.status()===401,'ANON_LOCAL_API_ALLOWED');return{http:r.status()};}finally{await anon.close();}});
  await check('direct_post_identity_change_cannot_orphan_media','real_api',async()=>{const r=await api[0].from('posts').update({id:crypto.randomUUID()}).eq('id',state.protectedPostId).select('id');assert(r.error?.code==='PT409','POST_IDENTITY_MUTATED');const original=await api[0].from('posts').select('id').eq('id',state.protectedPostId).maybeSingle();assert(original.data,'ORIGINAL_POST_LOST');return{code:r.error.code};});
 }else if(process.argv[2]==='cleanup'){
  await check('bounded_storage_api_cleanup_retry','real_api',async()=>{const r=success(await call(0,{operation:'cleanup'}),'cleanup');return{deleted:r.deleted,failed:r.failed};});
  if(process.env.KCNY_EXPECT_CLEANUP_FAILURE==='true')assert(results.at(-1).evidence?.failed>0,'FAILURE_CONTROL_NOT_OBSERVED');
  await check('currently_referenced_image_is_never_deleted','real_api',async()=>{const image=await readImage(0,state.protectedPostId);assert(image,'CURRENT_IMAGE_LOST');const response=await fetch(image.url);assert(response.ok,'CURRENT_OBJECT_LOST');return{http:response.status};});
 }else if(process.argv[2]==='delete-fixtures'){
  await check('delete_only_this_run_synthetic_posts','real_api',async()=>{for(const post of state.posts){const r=await api[post.owner].from('posts').delete().eq('id',post.id).select('id');assert(!r.error,'SYNTHETIC_DELETE_FAILED');}return{knownPosts:state.posts.length};});
 }else if(process.argv[2]==='cleanup-all'){
  await check('retry_cleanup_after_deletion_without_post_ownership_loss','real_api',async()=>{let deleted=0;for(let n=0;n<5;n++)for(let i=0;i<2;i++){const r=success(await call(i,{operation:'cleanup'}),'cleanup');assert(r.failed===0,'CLEANUP_FAILED');deleted+=r.deleted;}return{deleted,maxPerCall:20};});
 }else{
  const images={};
  for(const [format,mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']])await check(`${format}_browser_upload_refresh_feed_detail`,'browser',async()=>{
   const page=pages[0],file=await bytes(format),title=`021 ${stamp} UI ${format}`;
   await page.goto(base+'/posts/new?lang=CN');await page.locator('#title').fill(title);await page.locator('#content').fill('仅合成图片 / 합성 이미지 전용');
   await page.locator('#post-image-file').setInputFiles({name:`synthetic.${format}`,mimeType:mime,buffer:file});await expect(page.locator('.post-image-preview')).toBeVisible();
   await page.getByRole('button',{name:'发布帖子',exact:true}).click({noWaitAfter:true});await page.waitForURL(u=>/^\/posts\/[a-f0-9-]{36}$/.test(u.pathname),{timeout:90000});
   const postId=new URL(page.url()).pathname.split('/')[2];state.posts.push({id:postId,owner:0});images[format]=postId;
   await imageVisible(page);await page.reload();await imageVisible(page);const current=await status(0,postId);state.uploads.push({id:current.imageId,postId,owner:0});
   const image=await readImage(0,postId),download=await fetch(image.url),metadata=await sharp(Buffer.from(await download.arrayBuffer())).metadata();assert(metadata.format==='webp'&&!metadata.exif&&!metadata.icc&&!metadata.xmp,'METADATA_NOT_STRIPPED');
   await page.goto(base+'/?lang=CN');await expect(page.locator('.post-card').filter({hasText:title}).locator('figure.post-image img')).toBeVisible();return{postId,input:format,output:metadata.format,metadataRemoved:true};
  });
  if(!images.jpeg||!images.png||!images.webp)throw Error('STOP: core browser upload failed');
  await check('near_5_MiB_valid_png_actual_validation','real_api',async()=>{const postId=await create(0,'near-limit');const data=randomFillSync(Buffer.alloc(1300*1340*3));const file=await sharp(data,{raw:{width:1300,height:1340,channels:3}}).png({compressionLevel:0}).toBuffer();assert(file.length>5_000_000&&file.length<=5242880,'NEAR_LIMIT_FIXTURE_INVALID');await attach(0,postId,file,'image/png',0);return{postId,inputBytes:file.length,maxBytes:5242880};});
  await check('oversize_rejected_client_server_and_storage','browser_and_real_api',async()=>{
   const r=await call(0,{operation:'reserve',postId:images.png,requestId:crypto.randomUUID(),expectedVersion:1,mime:'image/png',size:5242881});assert(r.status===400&&r.error==='file_size','RESERVE_SIZE_NOT_ENFORCED');
   const reservation=await reserve(0,images.png,'image/png',100,1);const upload=await api[0].storage.from('kcny-post-staging').uploadToSignedUrl(reservation.path,reservation.token,Buffer.alloc(5242881),{contentType:'image/png'});assert(upload.error,'BUCKET_SIZE_NOT_ENFORCED');
   await pages[0].goto(base+'/posts/new?lang=CN');await pages[0].locator('#post-image-file').setInputFiles({name:'over.png',mimeType:'image/png',buffer:Buffer.alloc(5242881)});await expect(pages[0].locator('p.auth-error[role="alert"]')).toContainText('5 MiB');return{reservedStatus:r.status,bucketRejected:true};
  });
  for(const [label,mime,file] of [['spoofed_mime','image/jpeg',await bytes('png')],['corrupt','image/png',Buffer.from('synthetic damaged png payload')],['svg_disguised_as_png','image/png',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>no()</script></svg>')]])await check(`${label}_rejected_without_replacing_old_image`,'real_api',async()=>{
   const before=await status(0,images.png),r=await reserve(0,images.png,mime,file.length,before.version);await put(0,r,file,mime);const result=await call(0,{operation:'finalize',uploadId:r.uploadId});assert(result.status===400,'INVALID_IMAGE_ACCEPTED');const after=await status(0,images.png);assert(after.imageId===before.imageId&&after.version===before.version,'OLD_IMAGE_CHANGED');return{status:result.status,reason:result.error};
  });
  await check('pixel_limit_rejected_in_actual_worker','real_api',async()=>{const postId=await create(0,'pixel-limit'),file=await sharp({create:{width:3000,height:2000,channels:3,background:'#ee7755'}}).png().toBuffer();const r=await reserve(0,postId,'image/png',file.length,0);await put(0,r,file,'image/png');const result=await call(0,{operation:'finalize',uploadId:r.uploadId});assert(result.status===400&&result.error==='image_dimensions','PIXEL_LIMIT_NOT_ENFORCED');return{status:result.status};});
  await check('unauthenticated_upload_and_illegal_path_rejected','real_api',async()=>{
   const anon=createClient(testConfig.url,testConfig.key,{auth:{persistSession:false}}),r=await anon.functions.invoke('kcny-post-media',{body:{operation:'reserve',postId:images.png}});assert(r.error?.context?.status===401,'ANON_UPLOAD_ALLOWED');
   const bad=await call(0,{operation:'reserve',postId:images.png,path:'../../victim',requestId:crypto.randomUUID(),size:100,mime:'image/png',expectedVersion:1});assert(bad.status===400,'CLIENT_PATH_ACCEPTED');return{anonymous:401,invalidPath:bad.status};
  });
  let staged;
  await check('private_staging_and_no_bucket_listing','real_api',async()=>{
   const before=await status(0,images.png),file=await bytes('png');staged=await reserve(0,images.png,'image/png',file.length,before.version);await put(0,staged,file,'image/png');
   const otherRead=await api[1].storage.from('kcny-post-staging').download(staged.path);assert(otherRead.error,'OTHER_USER_READ_RAW');
   for(const client of [api[0],api[1],createClient(testConfig.url,testConfig.key)]){const r=await client.storage.from('kcny-post-staging').list();assert(r.error||r.data.length===0,'BUCKET_LIST_EXPOSED');}
   return{crossUserRawDenied:true,listingDenied:true};
  });
  await check('cross_user_mount_replace_remove_and_delete_denied','real_api',async()=>{
   const current=await status(0,images.png);
   for(const body of [{operation:'reserve',postId:images.png,requestId:crypto.randomUUID(),mime:'image/png',size:100,expectedVersion:current.version},{operation:'finalize',uploadId:staged.uploadId},{operation:'remove',postId:images.png,requestId:crypto.randomUUID(),expectedVersion:current.version}]){const r=await call(1,body);assert([403,404].includes(r.status),'CROSS_USER_MUTATION_ALLOWED');}
   const view=await readImage(0,images.png),path=new URL(view.url).pathname.split('/kcny-post-images/')[1];await api[1].storage.from('kcny-post-images').remove([path]);assert((await fetch(view.url)).ok,'OTHER_USER_DELETED_IMAGE');return{deniedActions:4,originalPreserved:true};
  });
  await check('direct_database_validation_bypass_denied','real_api',async()=>{
   const adminCall=await api[0].rpc('media_service',{p_operation:'finish',p_actor:crypto.randomUUID(),p_request:{uploadId:staged.uploadId}});assert(adminCall.error,'WORKER_RPC_ACCESSIBLE');
   const update=await api[0].schema('media_private').from('uploads').update({state:'ready'}).eq('id',staged.uploadId);assert(update.error,'PRIVATE_STATE_WRITABLE');
   const direct=await api[0].from('posts').update({image_path:'unvalidated/forged'}).eq('id',images.png);assert(direct.error,'IMAGE_PATH_BYPASS');return{workerDenied:true,privateStateDenied:true,noWritableImagePath:true};
  });
  await check('failed_upload_preserves_text_then_retry_creates_one_post','browser_fault_injection',async()=>{
   const page=pages[0],title=`021 ${stamp} network retry`,file=await bytes('png');await page.goto(base+'/posts/new?lang=CN');await page.locator('#title').fill(title);await page.locator('#content').fill('Failure must preserve this draft.');await page.locator('#post-image-file').setInputFiles({name:'retry.png',mimeType:'image/png',buffer:file});
   const pattern='**/storage/v1/object/upload/sign/kcny-post-staging/**';await contexts[0].route(pattern,route=>route.abort('failed'));
   await page.getByRole('button',{name:'发布帖子',exact:true}).click({noWaitAfter:true});await expect(page.locator('p.auth-error[role="alert"]')).toBeVisible({timeout:45000});await expect(page.locator('#title')).toHaveValue(title);await expect(page.locator('#content')).toHaveValue('Failure must preserve this draft.');await contexts[0].unroute(pattern);
   await page.getByRole('button',{name:'发布帖子',exact:true}).click({noWaitAfter:true});await page.waitForURL(u=>/^\/posts\/[a-f0-9-]{36}$/.test(u.pathname),{timeout:90000});await imageVisible(page);
   const id=new URL(page.url()).pathname.split('/')[2];state.posts.push({id,owner:0});const count=await api[0].from('posts').select('id').eq('title',title);assert(count.data.length===1,'RETRY_CREATED_DUPLICATE_POST');return{postId:id,duplicates:0,fault:'controlled browser network abort'};
  });
  await check('failed_replacement_keeps_original_image_and_unsaved_text','browser',async()=>{
   const page=pages[0],before=await status(0,images.jpeg);await page.goto(base+`/posts/${images.jpeg}/edit?lang=CN`);await imageVisible(page);await page.locator('#title').fill(`021 ${stamp} retained edit`);await page.locator('#post-image-file').setInputFiles({name:'spoof.jpg',mimeType:'image/jpeg',buffer:await bytes('png')});await page.getByRole('button',{name:'上传图片／重试',exact:true}).click();await expect(page.locator('p.auth-error[role="alert"]')).toBeVisible({timeout:45000});await expect(page.locator('#title')).toHaveValue(`021 ${stamp} retained edit`);const after=await status(0,images.jpeg);assert(after.imageId===before.imageId,'OLD_IMAGE_LOST');await imageVisible(page);return{oldImagePreserved:true,draftPreserved:true};
  });
  await check('replace_then_remove_current_image','browser',async()=>{
   const page=pages[0],before=await status(0,images.jpeg);await page.locator('#post-image-file').setInputFiles({name:'replace.webp',mimeType:'image/webp',buffer:await bytes('webp')});await page.getByRole('button',{name:'上传图片／重试',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'图片变更已保存'})).toBeVisible({timeout:45000});await imageVisible(page);const replaced=await status(0,images.jpeg);assert(replaced.imageId!==before.imageId,'REPLACE_NOT_CONFIRMED');await page.getByRole('button',{name:'移除当前图片',exact:true}).click();await expect(page.locator('figure.post-image')).toHaveCount(0);const removed=await status(0,images.jpeg);assert(removed.imageId===null&&removed.version===before.version+2,'REMOVE_NOT_CONFIRMED');return{replacementVersion:replaced.version,removedVersion:removed.version};
  });
  await check('idempotent_create_reserve_and_finalize','real_api',async()=>{
   const requestId=crypto.randomUUID(),postPayload=payload('idempotency');const pair=await Promise.all([call(0,{operation:'create',requestId,payload:postPayload}),call(0,{operation:'create',requestId,payload:postPayload})]);const postId=success(pair[0],'create').postId;assert(success(pair[1],'create').postId===postId,'CREATE_DUPLICATE');state.posts.push({id:postId,owner:0});state.protectedPostId=postId;
   const conflict=await call(0,{operation:'create',requestId,payload:{...postPayload,title:'different'}});assert(conflict.status===409,'CREATE_KEY_CONFLICT_NOT_REJECTED');
   const uploadRequest=crypto.randomUUID(),file=await bytes('png');const r1=await reserve(0,postId,'image/png',file.length,0,uploadRequest),r2=await reserve(0,postId,'image/png',file.length,0,uploadRequest);assert(r1.uploadId===r2.uploadId,'RESERVE_DUPLICATE');await put(0,r1,file,'image/png');
   const resumed=await reserve(0,postId,'image/png',file.length,0,uploadRequest);assert(resumed.uploaded,'UPLOADED_RETRY_NOT_RECOGNIZED');
   success(await call(0,{operation:'finalize',uploadId:r1.uploadId}),'finalize');success(await call(0,{operation:'finalize',uploadId:r1.uploadId}),'finalize_retry');assert((await status(0,postId)).version===1,'ATTACH_DUPLICATED');return{postId,oneCase:true,oneAttachment:true,changedPayloadStatus:conflict.status};
  });
  await check('concurrent_replacements_use_compare_and_swap','real_api',async()=>{
   const postId=state.protectedPostId,before=await status(0,postId),file=await bytes('png');const one=await reserve(0,postId,'image/png',file.length,before.version),two=await reserve(0,postId,'image/png',file.length,before.version);await put(0,one,file,'image/png');await put(0,two,file,'image/png');
   const outcomes=await Promise.all([call(0,{operation:'finalize',uploadId:one.uploadId}),call(0,{operation:'finalize',uploadId:two.uploadId})]);assert(outcomes.filter(x=>x.status===200).length===1&&outcomes.filter(x=>x.status===409).length===1,'CONCURRENT_OVERWRITE');const after=await status(0,postId);assert(after.version===before.version+1,'VERSION_NOT_ATOMIC');return{success:1,conflict:1,version:after.version};
  });
  await check('post_delete_race_cannot_reattach','real_api',async()=>{const postId=await create(1,'delete-race'),file=await bytes('png'),r=await reserve(1,postId,'image/png',file.length,0);await put(1,r,file,'image/png');const pair=await Promise.all([call(1,{operation:'finalize',uploadId:r.uploadId}),api[1].from('posts').delete().eq('id',postId).select('id')]);assert(!pair[1].error,'DELETE_FAILED');assert([200,404,409].includes(pair[0].status),'UNEXPECTED_RACE_RESULT');assert(await readImage(1,postId)===null,'DELETED_POST_IMAGE_EXPOSED');return{finalizeStatus:pair[0].status,postAbsent:true};});
  await check('korean_mobile_upload_and_tablet_controls','browser_viewport_emulation',async()=>{const page=pages[0];await page.setViewportSize({width:390,height:844});await page.goto(base+`/posts/${images.webp}/edit?lang=KR`);await page.locator('#post-image-file').setInputFiles({name:'합성.jpg',mimeType:'image/jpeg',buffer:await bytes('jpeg')});await page.getByRole('button',{name:'이미지 업로드 / 다시 시도',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'이미지 변경을 저장했습니다'})).toBeVisible({timeout:45000});await imageVisible(page);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'MOBILE_OVERFLOW');await page.screenshot({path:join(out,'korean-mobile-editor.png'),fullPage:true});await page.setViewportSize({width:820,height:1180});await page.reload();await imageVisible(page);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'TABLET_OVERFLOW');await page.screenshot({path:join(out,'tablet-editor.png'),fullPage:true});return{mobile:'390x844',tablet:'820x1180',actualIpad:'PENDING'};});
  await check('app_switch_off_blocks_api_and_preserves_plain_text','browser_and_real_api',async()=>{const page=pages[0];const r=await contexts[0].request.post(off+'/api/post-media',{data:{operation:'reserve',postId:images.png,requestId:crypto.randomUUID(),mime:'image/png',size:100,expectedVersion:1}});assert(r.status()===403,'APP_GATE_BYPASSED');await page.goto(off+'/posts/new?lang=CN');await expect(page.locator('#post-image-file')).toHaveCount(0);await page.locator('#title').fill(`021 ${stamp} text only`);await page.locator('#content').fill('Plain text remains available without media.');await page.getByRole('button',{name:'发布帖子',exact:true}).click({noWaitAfter:true});await page.waitForURL(u=>/^\/posts\/[a-f0-9-]{36}$/.test(u.pathname));state.posts.push({id:new URL(page.url()).pathname.split('/')[2],owner:0});return{uploadStatus:403,pureTextPublished:true};});
  await check('malformed_json_and_forged_url_rejected','real_api',async()=>{const r=await contexts[0].request.post(base+'/api/post-media',{data:'{bad',headers:{'Content-Type':'application/json'}});assert(r.status()===400,'MALFORMED_JSON_NOT_400');const bad=await call(0,{operation:'reserve',postId:images.png,url:'https://untrusted.invalid/a',requestId:crypto.randomUUID(),size:100,mime:'image/png',expectedVersion:1});assert(bad.status===400,'EXTERNAL_URL_ACCEPTED');return{malformedStatus:r.status(),urlStatus:bad.status};});
 }
 await check('no_unhandled_browser_errors','browser',async()=>{assert(!pageErrors.length&&!http5xx.length,'UNEXPECTED_RUNTIME_ERRORS');return{pageerrors:pageErrors.length,http5xx:http5xx.length};});
}catch(error){results.push({name:'execution_boundary',kind:'control',status:'FAIL',reason:safe(error)});}finally{await close();}
if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
