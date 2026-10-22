import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validatePostInput } from "../lib/posts.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const actions = read("app/posts/actions.ts");
const composer = read("components/PostComposer.tsx");
const editor = read("components/PostEditor.tsx");
const draft = read("lib/post-drafts.ts");
const draftHook = read("components/usePostDraft.ts");
const detail = read("components/PostDetailClient.tsx");
const detailPage = read("app/posts/[id]/page.tsx");
const profile = read("components/ProfilePageClient.tsx");

test("post input validation rejects unsafe publishing fields", () => {
  const valid = { title: "你好", content: "안녕하세요", category: "culture", language: "KR" };
  assert.equal(validatePostInput(valid).error, null);
  assert.equal(validatePostInput({ ...valid, title: " " }).error, "invalid_title");
  assert.equal(validatePostInput({ ...valid, content: "x".repeat(5001) }).error, "invalid_content");
  assert.equal(validatePostInput({ ...valid, category: "private" }).error, "invalid_category");
  assert.equal(validatePostInput({ ...valid, language: "en" }).error, "invalid_language");
});

test("create, edit and delete actions derive identity from the server session", () => {
  assert.equal((actions.match(/auth\.getClaims\(\)/g) ?? []).length, 3);
  assert.match(actions, /author_id: userId/);
  assert.equal((actions.match(/\.eq\("author_id", userId\)/g) ?? []).length, 2);
  assert.doesNotMatch(actions, /formData\.get\("author_id"\)/);
});

test("edit and delete require a returned row before reporting success", () => {
  assert.match(actions, /delete\(\)\.eq\("id", postId\)\.eq\("author_id", userId\)\.select\("id"\)\.maybeSingle\(\)/);
  assert.match(actions, /if \(error \|\| !deleted\)/);
  assert.match(actions, /if \(error \|\| !updated\)/);
  assert.match(actions, /&deleted=1/);
  assert.match(actions, /&updated=1/);
});

test("draft storage is scoped to user and create-versus-edit and validates restored shape", () => {
  assert.match(draft, /userId.*postId \?\? "new"/);
  assert.match(draft, /JSON\.parse/);
  assert.match(draft, /isPostCategory\(record\.category\)/);
  assert.match(draft, /record\.title\.length > 120/);
  assert.match(draft, /record\.content\.length > 5000/);
  assert.match(draftHook, /sessionStorage\.getItem\(key\)/);
  assert.match(draftHook, /sessionStorage\.setItem\(key, JSON\.stringify\(draft\)\)/);
  assert.match(draftHook, /if \(!hydrated\) return/);
});

test("create and edit forms retain controlled content and report bilingual errors", () => {
  for (const form of [composer, editor]) {
    assert.match(form, /usePostDraft\(viewerId/);
    assert.match(form, /value=\{draft\.title\}/);
    assert.match(form, /value=\{draft\.content\}/);
    assert.match(form, /sessionStorage\.setItem\(postDraftKey\(viewerId/);
    assert.match(form, /role="alert"/);
    assert.match(form, /AuthSubmitButton/);
  }
  assert.match(composer, /草稿已保留/);
  assert.match(composer, /작성 중인 글은 보관됩니다/);
  assert.match(editor, /修改内容已保留/);
  assert.match(editor, /수정 내용은 보관됩니다/);
});

test("successful post navigation clears only the matching draft", () => {
  assert.match(actions, /&published=1/);
  assert.match(actions, /&updated=1/);
  assert.match(detailPage, /post\.author_id === currentUserId \? published === "1"/);
  assert.match(detail, /sessionStorage\.removeItem\(postDraftKey\(currentUserId, completedDraft === "edit" \? post\.id : undefined\)\)/);
});

test("delete confirmation warns of cascades and disables repeated submission", () => {
  assert.match(detail, /댓글과 관련 반응도 함께 삭제됩니다/);
  assert.match(detail, /删除评论及相关互动/);
  assert.match(detail, /useFormStatus\(\)/);
  assert.match(detail, /disabled=\{pending\}/);
  assert.match(profile, /게시글을 삭제했습니다/);
  assert.match(profile, /帖子已删除/);
});

test("media is not silently enabled without an approved storage contract", () => {
  assert.doesNotMatch(actions, /storage\.from|\.upload\(/);
  assert.match(composer, /仅支持纯文字/);
  assert.match(editor, /현재는 일반 텍스트만 지원합니다/);
});
