// Preparation only. Never connects to a database or grants a role.
import {readFile,writeFile} from 'node:fs/promises';
import {verifyReviewerBindingReceipt,buildReviewerGrantDraft} from '../lib/reviewer-binding.ts';
const args=process.argv.slice(2),values={};
for(let i=0;i<args.length;i+=2){if(!['--receipt-file','--project-ref','--origin','--approved-owner-id','--approval-reference','--output'].includes(args[i])||!args[i+1]||values[args[i]])throw Error('Invalid named arguments');values[args[i]]=args[i+1];}
try{
 if(Object.keys(values).length!==6)throw Error('missing');
 const receipt=verifyReviewerBindingReceipt((await readFile(values['--receipt-file'],'utf8')).trim(),process.env.KCNY_REVIEWER_BINDING_SECRET??'',{projectRef:values['--project-ref'],origin:values['--origin']});
 if(!receipt)throw Error('proof');
 const draft=buildReviewerGrantDraft(receipt,values['--approved-owner-id'],values['--approval-reference']);
 await writeFile(values['--output'],draft,{flag:'wx'});
 console.log(JSON.stringify({status:'DRAFT_PREPARED',databaseConnected:false,roleGranted:false,expiresAt:new Date(receipt.expiresAt).toISOString()}));
}catch{console.error('BINDING_PREPARATION_REJECTED: verify current receipt, exact project/origin, independent owner approval and private output path. No role granted.');process.exitCode=1;}
