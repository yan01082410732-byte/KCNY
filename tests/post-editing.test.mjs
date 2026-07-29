import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  isPostCategory,
  isSafePostId,
  validatePostInput,
} from "../lib/posts.ts";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const migration = read("supabase/migrations/202607290003_add_posts_update_policy.sql");
const actions = read("app/posts/actions.ts");
const editPage = read("app/posts/[id]/edit/page.tsx");
const detailClient = read("components/PostDetailClient.tsx");
const detailPage = read("app/posts/[id]/page.tsx");
const editor = read("components/PostEditor.tsx");
const styles = read("app/globals.css");

const validInput = (overrides = {}) => ({
  title: "A title",
  content: "A post body",
  category: "culture",
  language: "CN",
  ...overrides,
});

test("post edit migration creates an update policy", () => {
  assert.match(migration, /create policy "Users update own posts"/);
});

test("post edit migration targets posts", () => {
  assert.match(migration, /on public\.posts/);
});

test("post edit migration is authenticated only", () => {
  assert.match(migration, /to authenticated/);
});

test("post edit migration checks the authenticated author in using", () => {
  assert.match(migration, /using \(author_id = auth\.uid\(\)\)/);
});

test("post edit migration checks the authenticated author in with check", () => {
  assert.match(migration, /with check \(author_id = auth\.uid\(\)\)/);
});

test("post edit migration has no destructive statement", () => {
  assert.doesNotMatch(migration, /\b(drop|truncate)\b/i);
});

test("post input accepts a valid editable post", () => {
  assert.equal(validatePostInput(validInput()).error, null);
});

test("post input rejects an empty edit title", () => {
  assert.equal(validatePostInput(validInput({ title: " " })).error, "invalid_title");
});

test("post input rejects an overlong edit title", () => {
  assert.equal(validatePostInput(validInput({ title: "x".repeat(121) })).error, "invalid_title");
});

test("post input rejects an empty edit body", () => {
  assert.equal(validatePostInput(validInput({ content: " " })).error, "invalid_content");
});

test("post input rejects an overlong edit body", () => {
  assert.equal(validatePostInput(validInput({ content: "x".repeat(5001) })).error, "invalid_content");
});

test("post input rejects an invalid edit category", () => {
  assert.equal(validatePostInput(validInput({ category: "news" })).error, "invalid_category");
});

test("post input rejects an invalid edit language", () => {
  assert.equal(validatePostInput(validInput({ language: "zh" })).error, "invalid_language");
});

test("post categories include culture", () => {
  assert.equal(isPostCategory("culture"), true);
});

test("post categories include language", () => {
  assert.equal(isPostCategory("language"), true);
});

test("post categories include travel", () => {
  assert.equal(isPostCategory("travel"), true);
});

test("post categories include study", () => {
  assert.equal(isPostCategory("study"), true);
});

test("post categories include daily", () => {
  assert.equal(isPostCategory("daily"), true);
});

test("post categories include other", () => {
  assert.equal(isPostCategory("other"), true);
});

test("update action validates a safe post id", () => {
  assert.match(actions, /isSafePostId\(postId\)/);
  assert.equal(isSafePostId("not-a-post"), false);
});

test("update action reads the category field", () => {
  assert.match(actions, /category: formData\.get\("category"\)/);
});

test("update action limits its update payload to editable fields", () => {
  assert.match(actions, /\.update\(\{\s*title: result\.title,\s*content: result\.content,\s*category: result\.category,\s*language: result\.language,/s);
  assert.doesNotMatch(actions, /update\([\s\S]*author_id:/);
});

test("update action scopes updates to the current author", () => {
  assert.match(actions, /\.eq\("author_id", userId\)/);
});

test("edit page requires a signed-in user", () => {
  assert.match(editPage, /auth\.getClaims\(\)/);
  assert.match(editPage, /returnTo=\/posts\/\$\{id\}\/edit/);
});

test("edit page returns not found for a non-owner", () => {
  assert.match(editPage, /post\.author_id !== userId/);
  assert.match(editPage, /notFound\(\)/);
});

test("edit page only selects editable post fields and author id", () => {
  assert.match(editPage, /select\("id, author_id, title, content, category, language"\)/);
});

test("post editor submits a hidden post id", () => {
  assert.match(editor, /name="postId" value=\{post\.id\}/);
});

test("post editor has constrained title and content fields", () => {
  assert.match(editor, /maxLength=\{120\}/);
  assert.match(editor, /maxLength=\{5000\}/);
});

test("post editor uses the shared pending submit button", () => {
  assert.match(editor, /AuthSubmitButton/);
  assert.match(editor, /pendingText=\{text\.saving\}/);
});

test("post editor has both CN and KR copy", () => {
  assert.match(editor, /编辑帖子/);
  assert.match(editor, /게시글 수정/);
});

test("post detail only receives the edit permission from the server", () => {
  assert.match(detailPage, /canEdit=\{post\.author_id === currentUserId\}/);
  assert.match(detailClient, /canEdit &&/);
});

test("post detail edit link safely encodes the post id", () => {
  assert.match(detailClient, /\/posts\/\$\{encodeURIComponent\(post\.id\)\}\/edit\?lang=/);
});

test("post detail keeps delete and edit controls together", () => {
  assert.match(detailClient, /post-owner-actions/);
  assert.match(styles, /\.post-owner-actions/);
});

test("post editor mobile card styling is retained", () => {
  assert.match(styles, /\.post-composer-card \{ padding:24px; \}/);
});
