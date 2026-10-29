import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canSubmitCommentDraft, commentDraftKey, commentErrorMessage } from "../lib/comments.ts";
import { profilePostsHref } from "../lib/profile.ts";
import { communityPage } from "../lib/community-pagination.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const action = read("app/posts/[id]/comment-actions.ts");
const form = read("components/CommentDraftForm.tsx");
const profilePage = read("app/u/[username]/page.tsx");
const profileClient = read("components/ProfilePageClient.tsx");

test("comment and reply drafts are scoped to viewer and target", () => {
  assert.notEqual(commentDraftKey("viewer-a", "post-a"), commentDraftKey("viewer-b", "post-a"));
  assert.notEqual(commentDraftKey("viewer-a", "post-a"), commentDraftKey("viewer-a", "post-a", "parent-a"));
  assert.notEqual(commentDraftKey("viewer-a", "post-a", "parent-a"), commentDraftKey("viewer-a", "post-a", "parent-b"));
});
test("duplicate and empty submissions are refused", () => {
  assert.equal(canSubmitCommentDraft(" hello ", false, false), true);
  assert.equal(canSubmitCommentDraft(" ", false, false), false);
  assert.equal(canSubmitCommentDraft("hello", true, false), false);
  assert.equal(canSubmitCommentDraft("hello", false, true), false);
  assert.equal(canSubmitCommentDraft("x".repeat(1001), false, false), false);
});
test("submission errors are bilingual and do not expose backend details", () => {
  for (const reason of ["auth_required", "invalid_post", "permission", "network_failed", "reply_failed"]) {
    assert.ok(commentErrorMessage(reason, "CN"));
    assert.ok(commentErrorMessage(reason, "KR"));
    assert.doesNotMatch(commentErrorMessage(reason, "CN"), /SQL|Supabase|stack|42501/i);
  }
});
test("server actions return failure state and only signal success after insert", () => {
  assert.match(action, /createComment\(_previous: CommentSubmitState, formData: FormData\)/);
  assert.match(action, /createCommentReply\(_previous: CommentSubmitState, formData: FormData\)/);
  assert.match(action, /if \(error\) return commentRequestFailure/);
  assert.match(action, /revalidateCommentViews\(validation\.value\.postId\)/);
  assert.match(action, /const result = commentRequestResult\(data, requestId\)/);
});
test("draft survives errors/remount and clears only on confirmed success", () => {
  assert.match(form, /sessionStorage\.getItem\(key\)/);
  assert.match(form, /sessionStorage\.setItem\(key/);
  assert.match(form, /if \(state\.status === "success"\)/);
  assert.match(form, /sessionStorage\.removeItem\(key\)/);
  assert.match(form, /submitting\.current/);
  assert.match(form, /role="alert"/);
});
test("profile post links encode cursor and language", () => {
  const href = profilePostsHref("测试用户", "KR", "2026-10-20T00:00:00Z|id");
  assert.match(href, /^\/u\/%E6%B5%8B%E8%AF%95%E7%94%A8%E6%88%B7\?lang=KR&before=/);
  assert.match(href, /#posts$/);
});
test("profile pages use keyset pagination and distinguish errors from empty state", () => {
  assert.match(profilePage, /parseCommunityCursor\(before\)/);
  assert.match(profilePage, /olderThanFilter\(cursor\)/);
  assert.match(profilePage, /\.order\("id", \{ ascending: false \}\)/);
  assert.match(profilePage, /\.limit\(FEED_PAGE_SIZE \+ 1\)/);
  assert.match(profileClient, /postsUnavailable \?/);
  assert.match(profileClient, /nextCursor/);
  const page = communityPage(Array.from({ length: 21 }, (_, i) => ({ id: String(i), created_at: String(i) })), 20);
  assert.equal(page.items.length, 20);
  assert.ok(page.nextCursor);
});
test("community navigation still connects search, notifications, feed and profile to content", () => {
  assert.match(read("components/SearchPageClient.tsx"), /\/u\/\$\{encodeURIComponent\(user\.username\)\}/);
  assert.match(read("lib/notifications.ts"), /#comment-\$\{encodeURIComponent\(notification\.commentId\)\}/);
  assert.match(read("components/PostCard.tsx"), /postHref/);
  assert.match(profileClient, /<PostCard key=\{post\.id\}/);
  assert.match(read("components/PostDetailClient.tsx"), /commentPageHref\(post\.id/);
});
