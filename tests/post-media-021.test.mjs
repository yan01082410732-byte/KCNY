import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {initializeImageMagick} from '@imagemagick/magick-wasm';
import {sanitizePostImage} from '../lib/media-codec.ts';
import {MEDIA_MAX_BYTES,mediaReadsAvailable,mediaWritesAvailable,mediaFileError,imageSignature,mediaErrorMessage,mediaUuid} from '../lib/post-media-policy.ts';
const require=createRequire(import.meta.url),sharp=require('sharp');
await initializeImageMagick(readFileSync(require.resolve('@imagemagick/magick-wasm/magick.wasm')));
const env={NEXT_PUBLIC_SUPABASE_URL:'https://kirvcbkbkvotnsqnbcyf.supabase.co',KCNY_MEDIA_ENVIRONMENT:'test',KCNY_MEDIA_DEPLOYMENT_ENV:'development'};
test('media is default off; production requires its complete explicit configuration',()=>{
 assert.equal(mediaWritesAvailable(env),false);assert.equal(mediaWritesAvailable({...env,KCNY_POST_IMAGES_ENABLED:'true'}),true);
 assert.equal(mediaWritesAvailable({...env,VERCEL_ENV:'production',KCNY_POST_IMAGES_ENABLED:'true'}),false);
 assert.equal(mediaWritesAvailable({NEXT_PUBLIC_SUPABASE_URL:'https://czcyarmramlpmilfhpqo.supabase.co',KCNY_POST_IMAGES_ENABLED:'true'}),false);
 assert.equal(mediaReadsAvailable(env),true);assert.equal(mediaReadsAvailable({}),false);
 assert.equal(mediaWritesAvailable({NEXT_PUBLIC_SUPABASE_URL:'https://czcyarmramlpmilfhpqo.supabase.co',VERCEL_ENV:'production',KCNY_MEDIA_DEPLOYMENT_ENV:'production',KCNY_MEDIA_ENVIRONMENT:'production',KCNY_POST_IMAGES_ENABLED:'true'}),true);
});
test('file limits use exactly 5 MiB, reject unsupported formats and empty input',()=>{
 for(const mime of ['image/jpeg','image/png','image/webp'])assert.equal(mediaFileError(MEDIA_MAX_BYTES,mime),null);
 assert.equal(mediaFileError(MEDIA_MAX_BYTES+1,'image/png'),'file_size');assert.equal(mediaFileError(0,'image/png'),'file_size');
 for(const mime of ['image/svg+xml','image/gif','image/heic','video/mp4','text/html'])assert.equal(mediaFileError(1,mime),'file_type');
});
for(const [format,mime] of [['jpeg','image/jpeg'],['png','image/png'],['webp','image/webp']])test(`actual ${format} decode/re-encode strips metadata`,async()=>{
 const input=await sharp({create:{width:64,height:48,channels:3,background:'#ee7755'}}).withMetadata().toFormat(format).toBuffer();
 assert.equal(imageSignature(input),mime);const image=sanitizePostImage(input,mime);
 const metadata=await sharp(image.bytes).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);assert.equal(metadata.xmp,undefined);assert.equal(metadata.icc,undefined);assert.equal(image.width,64);assert.equal(image.height,48);
});
test('spoofed MIME and corrupt/HTML/SVG bodies cannot become attachments',async()=>{
 const input=await sharp({create:{width:32,height:32,channels:3,background:'#ee7755'}}).png().toBuffer();
 assert.throws(()=>sanitizePostImage(input,'image/jpeg'),/image_mime/);
 for(const text of ['<svg onload="alert(1)"></svg>','GIF89a fabricated payload','not an image payload'])assert.throws(()=>sanitizePostImage(Buffer.from(text),'image/png'));
 assert.throws(()=>sanitizePostImage(input.subarray(0,35),'image/png'));
});
test('pixel bomb is rejected before full decode',async()=>{
 const input=await sharp({create:{width:3000,height:2000,channels:3,background:'#ee7755'}}).png().toBuffer();
 assert.throws(()=>sanitizePostImage(input,'image/png'),/image_dimensions/);
});
test('media errors bilingual; IDs reject paths and URLs',()=>{
 for(const code of ['file_size','file_type','image_mime','image_corrupt','authentication_required','media_disabled','rate_limited','unknown']){
  assert.ok(mediaErrorMessage(code,'CN'));assert.ok(mediaErrorMessage(code,'KR'));assert.notEqual(mediaErrorMessage(code,'CN'),mediaErrorMessage(code,'KR'));
 }
 assert.equal(mediaUuid(crypto.randomUUID()),true);for(const id of ['../other','https://evil.invalid/a','../../a',''])assert.equal(mediaUuid(id),false);
});
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const migration=source('supabase/migrations/20261024162328_post_image_lifecycle.sql');
const guards=source('supabase/migrations/20261024164540_post_image_cleanup_guards.sql');
const worker=source('supabase/functions/kcny-post-media/index.ts');
test('new buckets private and restricted; no SQL mutation of managed object metadata',()=>{
 assert.match(migration,/false,5242880/);assert.match(migration,/as restrictive for all to anon,authenticated/);
 assert.doesNotMatch(migration+guards,/delete\s+from\s+storage\.objects|drop\s+(?:schema|table|bucket)/i);
 assert.doesNotMatch(migration,/alter table public\.posts add.*image_path/i);
});
test('private media state and worker RPC deny direct ordinary clients',()=>{
 assert.equal((migration.match(/enable row level security/g)??[]).length,6);
 assert.match(migration,/revoke all on schema media_private from public,anon,authenticated/);
 assert.match(migration,/revoke all on function public.media_service\(text,uuid,jsonb\) from public,anon,authenticated/);
 assert.match(worker,/viewer.auth.getUser\(token\)/);assert.doesNotMatch(worker,/user_metadata|app_metadata/);
});
test('attachment association uses lease and version CAS; stable identity guarded',()=>{
 assert.match(migration,/s.version<>u.expected_version/);assert.match(migration,/u.lease is distinct from/);
 assert.match(migration,/public.posts where id=post_key and author_id=p_actor for update/);
 assert.match(guards,/media_post_identity_immutable/);assert.match(guards,/slots ms join media_private.uploads mu/);
});
test('cleanup is bounded, retryable and retains paths after post deletion',()=>{
 assert.match(migration,/before delete on public.posts/);assert.match(guards,/limit 20 for update skip locked/);
 assert.match(guards,/not exists\(select 1 from media_private.cleanup q/);
 assert.match(migration,/not exists\(select 1 from media_private.slots a join public.posts/);
 assert.match(worker,/\.remove\(\[task.path\]\)/);assert.match(worker,/success: !error/);
 assert.match(migration,/storage_delete_failed/);assert.match(migration,/interval '3 hours'/);
});
test('upload is direct, never a file-valued Server Action; no upsert or arbitrary URL',()=>{
 const picker=source('components/PostImageControls.tsx'),api=source('app/api/post-media/route.ts');
 const input=picker.match(/<input ref=\{input\}[^>]+/)[0];assert.doesNotMatch(input,/\sname=/);
 assert.match(source('lib/post-media-client.ts'),/uploadToSignedUrl/);assert.doesNotMatch(worker,/upsert: true/);
 assert.match(api,/mediaWritesAvailable/);assert.match(api,/32768/);assert.match(api,/invalid_origin/);
 assert.doesNotMatch(api,/SUPABASE_SERVICE_ROLE_KEY/);assert.match(worker,/\["path","url","bucket","ownerId","actorId","state"\]/);
});
test('validated reads are visibility checked, short-lived and shared by all post cards',()=>{
 assert.match(worker,/viewer.from\("posts"\).select\("id"\)/);assert.match(worker,/createSignedUrl\(image.path, 60\)/);
 assert.match(source('components/PostCard.tsx'),/<PostImage postId=\{post.id\}/);
 assert.match(source('components/PostDetailClient.tsx'),/<PostImage postId=\{post.id\}/);
 assert.match(source('components/PostImage.tsx'),/start \+= 20/);assert.match(source('components/PostImage.tsx'),/pending.get\(id\)/);
});
test('draft and original attachment survive upload/replacement failures',()=>{
 const composer=source('components/PostComposer.tsx'),manager=source('components/PostImageControls.tsx');
 assert.match(composer,/creationPayload.current/);assert.match(composer,/pendingKey \+ ":request"/);assert.match(composer,/sessionStorage.setItem\(pendingKey, postId\)/);
 assert.match(composer,/operation: savedPostId \? "save" : "create"/);assert.match(manager,/Keep the last confirmed image/);
});
