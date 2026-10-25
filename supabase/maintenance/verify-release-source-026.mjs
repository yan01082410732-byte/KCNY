// Read-only source verification. No environment files, credentials, network or DB calls.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const git=(...args)=>execFileSync('git',['-c',`safe.directory=${root.replace(/[\\/]$/,'')}`,...args],{cwd:root,encoding:null,stdio:['pipe','pipe','pipe']});
const base='6f392fc616c1d44b2fe437297f6277933ebdd8a9';
git('merge-base','--is-ancestor','e54588d5b5d9ff9ddae64a004ab2b9bc3f0c52ba',base);
const hash=data=>createHash('sha256').update(data).digest('hex').toUpperCase();
const original=[
 ['20261024162328_post_image_lifecycle.sql','B84541E23FAF0CF3D6A82A5FED567659F290F860B04655EDF6799060936D485E'],
 ['20261024164540_post_image_cleanup_guards.sql','A387E8367ACF4D1542CA1BF704A941823CC23F4ED880AE1D7207369F6824A176'],
 ['20261024182118_post_image_outcomes_maintenance_022.sql','5EC587AE2A70A36D6C647885D7782E5C7C135A21203F213D5C2E83FE7AB8C6A0'],
 ['20261025061601_post_media_scheduled_maintenance_024.sql','C6F1EAE377CC1146D6AF0014C98AB1F37929084990D3A0800A44F63AE1BCB510'],
 ['20261025062825_post_media_maintenance_status_024.sql','364199EB2BA80C4BE3A641F6C9C17B5F0FA70665ECF4721DC7A1421A424E82D6'],
];
const migrations=original.map(([name,handoffSHA256])=>{
 const path='supabase/migrations/'+name,current=readFileSync(new URL('../../'+path,import.meta.url));
 const blob=git('show',base+':'+path),normalized=Buffer.from(current.toString('utf8').replace(/\r\n/g,'\n'));
 if(!normalized.equals(blob))throw Error('ORIGINAL_MIGRATION_CHANGED:'+name);
 if(hash(blob)!==handoffSHA256)throw Error('HANDOFF_HASH_NOT_RECONCILED:'+name);
 return{path,gitBlobSHA256:hash(blob),workingSHA256:hash(current),historicalOriginalSHA256:handoffSHA256,unchangedFromAcceptedBase:true};
});
const paths=[...original.map(([f])=>'supabase/migrations/'+f),
 'supabase/migrations/20261025095904_post_media_production_adaptation_026.sql',
 'supabase/config.toml','supabase/functions/kcny-post-media/index.ts','supabase/functions/kcny-post-media/deno.json',
 'supabase/functions/kcny-media-maintenance/index.ts','supabase/functions/kcny-media-maintenance/deno.json',
 'lib/post-media-policy.ts','lib/media-codec.ts','lib/media-commit.ts','lib/media-maintenance.ts',
 'supabase/maintenance/install-production-026.sql','supabase/maintenance/install-test-026.sql','supabase/maintenance/schedule-control-026.sql',
 'supabase/maintenance/production-media.env.example','supabase/maintenance/test-media.env.example',
 'supabase/maintenance/verify-release-source-026.mjs','supabase/functions/runtime-check.d.ts','supabase/functions/tsconfig.check.json',
 'tests/post-media-021.test.mjs','tests/post-media-022.test.mjs','tests/post-media-maintenance-024.test.mjs',
 'tests/post-media-release-026.test.mjs','tests/sql/media-maintenance-026.sql',
 'package.json','package-lock.json','pnpm-lock.yaml'];
const files=paths.sort().map(path=>({path,sha256:hash(Buffer.from(readFileSync(new URL('../../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n')))}));
console.log(JSON.stringify({base,head:git('rev-parse','HEAD').toString().trim(),canonicalEncoding:'UTF-8 LF / Git blob',originalMigrations:migrations,files,
 sourceSetSHA256:hash(JSON.stringify(files)),environmentFilesRead:false,secretsIncluded:false},null,2));
