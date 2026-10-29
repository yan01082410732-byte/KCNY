"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { isSafeCommentRelatedId, validateCommentInput, validateCommentReplyInput } from "@/lib/comments";
import { commentRequestFailure, commentRequestResult, isCommentRequestId } from "@/lib/comment-idempotency";
import type { CommentSubmitState } from "@/lib/comment-idempotency";
import { isSafePostId } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

function postUrl(postId: string, language: "CN" | "KR", error?: string) {
  const query = error ? `?lang=${language}&error=${error}` : `?lang=${language}`;
  return `/posts/${postId}${query}#comments`;
}

function loginUrl(postId: string, language: "CN" | "KR") {
  return `/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/posts/${postId}`)}`;
}

function revalidateCommentViews(postId: string) {
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/");
  revalidatePath("/u/[username]", "page");
}

export type { CommentSubmitState } from "@/lib/comment-idempotency";

async function currentUserId() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: undefined };
  const { data: claimsData } = await supabase.auth.getClaims();
  return { supabase, userId: claimsData?.claims?.sub };
}

async function submitCommentRequest(formData: FormData, reply: boolean): Promise<CommentSubmitState> {
  const rawLanguage = formData.get("language");
  const rawContent = formData.get("content");
  const input = { postId: formData.get("postId"), content: rawContent, language: rawLanguage };
  const validation = reply ? validateCommentReplyInput({ ...input, parentCommentId: formData.get("parentCommentId") }) : validateCommentInput(input);
  const rawPostId = formData.get("postId");
  if (!isLanguage(rawLanguage) || validation.error || !isSafePostId(rawPostId)) return { status: "error", reason: validation.error ?? "invalid_language" };
  const requestId = formData.get("requestId");
  if (!isCommentRequestId(requestId)) return { status: "error", reason: "invalid_request" };
  // Bind the untrimmed original, not merely its display-normalized validation.
  if (typeof rawContent !== "string" || rawContent.length > 1000) return { status: "error", reason: "invalid_comment", requestId };
  try {
    const { supabase, userId } = await currentUserId();
    if (!supabase) return { status: "error", reason: "configuration", requestId };
    if (!userId) return { status: "error", reason: "auth_required", requestId };
    // Viewer is only a stale-account guard. Ownership comes from auth.uid().
    if (formData.get("viewerId") !== userId) return { status: "error", reason: "account_changed", requestId };
    const checkOnly = formData.get("intent") === "status";
    const { data, error } = await supabase.rpc(checkOnly ? "comment_request_status" : "submit_comment_request", {
      p_request_id: requestId,
      p_post_id: validation.value.postId,
      p_parent_comment_id: reply && "parentCommentId" in validation.value ? validation.value.parentCommentId : null,
      p_content: rawContent,
    });
    if (error) return commentRequestFailure(error, requestId, reply);
    const result = commentRequestResult(data, requestId);
    if (result.status === "success" || result.status === "deleted") {
      try { revalidateCommentViews(validation.value.postId); } catch { /* The confirmed receipt remains valid; client refreshes. */ }
    }
    return result;
  } catch {
    return { status: "unknown", reason: "network_failed", requestId };
  }
}

export async function createComment(_previous: CommentSubmitState, formData: FormData): Promise<CommentSubmitState> {
  return submitCommentRequest(formData, false);
}

export async function createCommentReply(_previous: CommentSubmitState, formData: FormData): Promise<CommentSubmitState> {
  return submitCommentRequest(formData, true);
}

export async function deleteComment(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const postId = formData.get("postId");
  const commentId = formData.get("commentId");
  if (!isLanguage(rawLanguage) || !isSafePostId(postId) || !isSafeCommentRelatedId(commentId)) redirect("/");
  const { supabase, userId } = await currentUserId();
  if (!supabase) redirect(postUrl(postId, language, "configuration"));
  if (!userId) redirect(loginUrl(postId, language));
  const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("post_id", postId).eq("author_id", userId);
  if (error) redirect(postUrl(postId, language, "delete_comment_failed"));
  revalidateCommentViews(postId);
  redirect(postUrl(postId, language));
}
