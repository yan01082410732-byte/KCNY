import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { attemptSignOut, classifyAuthError, contentLoadState } from "../lib/service-errors.ts";
import { searchHref } from "../lib/search.ts";
import { COMMENT_PAGE_SIZE, encodeCommentCursor, parseCommentCursor, sliceCommentPage, pageWithParentContext, commentCursorFilter } from "../lib/comment-pagination.ts";
import { groupCommentThreads } from "../lib/comments.ts";

const read = (path) => readFileSync(new URL("../"+path, import.meta.url),"utf8");
for (const [label,error,expected] of [
  ["invalid credentials",{code:"invalid_credentials",status:400},"invalid_credentials"],
  ["configuration",{code:"configuration"},"configuration"],
  ["service outage",{status:503},"service_unavailable"],
  ["network error",new TypeError("private backend detail"),"service_unavailable"],
  ["rate limit",{status:429},"rate_limit"],
  ["unknown error",{code:"unrecognized",message:"private"},"auth_unknown"],
]) test("auth classification: "+label,()=>assert.equal(classifyAuthError(error),expected));
test("logout success",async()=>assert.deepEqual(await attemptSignOut(async()=>({error:null})),{ok:true}));
test("logout returned error is failure",async()=>assert.deepEqual(await attemptSignOut(async()=>({error:{status:503}})),{ok:false,category:"service_unavailable"}));
test("logout thrown error is failure",async()=>assert.equal((await attemptSignOut(async()=>{throw new TypeError("private");})).ok,false));
test("successful 0 rows differs from failed 0 rows",()=>{assert.equal(contentLoadState(null,0),"empty");assert.equal(contentLoadState({code:"backend"},0),"unavailable");assert.equal(contentLoadState(null,3),"ready");});
test("home failed query uses safe error UI before empty state",()=>{assert.match(read("app/page.tsx"),/const \{ data, error \} = await query/);assert.match(read("components/HomePageClient.tsx"),/contentUnavailable \?/);assert.match(read("components/HomePageClient.tsx"),/暂时无法加载内容/);assert.match(read("components/HomePageClient.tsx"),/콘텐츠를 불러올 수 없습니다/);});
test("all category explicitly clears category while preserving feed and lang",()=>{const source=read("components/HomePageClient.tsx");assert.match(source,/href=\{followingFeedHref\(language, feed\)\}/);assert.match(source,/href=\{followingFeedHref\(language, feed, item\)\}/);});
for (const lang of ["CN","KR"]) test("search URL preserves query and type in "+lang,()=>{const url=new URL(searchHref(lang,"users","中文 한국어 & test"),"https://kcny.example");assert.equal(url.searchParams.get("lang"),lang);assert.equal(url.searchParams.get("q"),"中文 한국어 & test");assert.equal(url.searchParams.get("type"),"users");});
test("search uses URL language and server document language on reload",()=>{const source=read("components/SearchPageClient.tsx");assert.doesNotMatch(source,/useState|setLanguage/);assert.match(source,/languageHref=\{languageHref\}/);assert.match(read("app/layout.tsx"),/htmlLanguage\(language\)/);});
const id=(n)=>"550e8400-e29b-41d4-a716-"+String(n).padStart(12,"0");
const comment=(n,parent=null)=>({id:id(n),postId:id(999),parentCommentId:parent,content:"comment",createdAt:"2026-10-14T00:00:00.123456+00:00",author:{username:"author",displayName:null},canDelete:false});
test(">200 synthetic comments are accessible across bounded pages without duplicate or omission",()=>{const all=Array.from({length:257},(_,n)=>comment(n+1));let remaining=all,seen=[];while(remaining.length){const page=sliceCommentPage(remaining.slice(0,COMMENT_PAGE_SIZE+1));assert.ok(page.items.length<=50);seen.push(...page.items.map(x=>x.id));const cursor=page.nextCursor&&parseCommentCursor(page.nextCursor);if(!cursor)break;remaining=remaining.filter(x=>x.id>cursor.id);}assert.equal(seen.length,257);assert.equal(new Set(seen).size,257);});
test("cursor keeps submillisecond timestamp and rejects injected query syntax",()=>{const cursor=encodeCommentCursor(comment(1));assert.equal(parseCommentCursor(cursor).createdAt,comment(1).createdAt);assert.equal(parseCommentCursor("2026-10-14T00:00:00Z),post_id.neq.x|"+id(1)),undefined);assert.equal(parseCommentCursor("invalid"),undefined);assert.match(commentCursorFilter(parseCommentCursor(cursor)),/id.gt/);});
test("reply on a later page includes parent context once and targets correct author",()=>{const parent=comment(1);const reply=comment(251,parent.id);const rows=pageWithParentContext([reply],[parent,parent]);const threads=groupCommentThreads(rows);assert.equal(threads[0].replies[0].id,reply.id);assert.equal(threads[0].comment.id,parent.id);});
test("same-time comments have stable id ordering",()=>{const threads=groupCommentThreads([comment(2),comment(1)]);assert.deepEqual(threads.map(x=>x.comment.id),[id(1),id(2)]);});
test("total count is independent from loaded page length",()=>{const source=read("app/posts/[id]/page.tsx");assert.match(source,/count: "exact", head: true/);assert.match(source,/commentCount=\{count \?\? 0\}/);assert.doesNotMatch(source,/commentCount=\{publicComments.length\}/);});
