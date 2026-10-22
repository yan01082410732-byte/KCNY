"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { isSafeCommentRelatedId, validateCommentInput, validateCommentReplyInput } from "@/lib/comments";
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

export type CommentSubmitState = { status: "idle" | "success" | "error"; reason?: string };

async function currentUserId() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: undefined };
  const { data: claimsData } = await supabase.auth.getClaims();
  return { supabase, userId: claimsData?.claims?.sub };
}

export async function createComment(_previous: CommentSubmitState, formData: FormData): Promise<CommentSubmitState> {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const validation = validateCommentInput({ postId: formData.get("postId"), content: formData.get("content"), language: rawLanguage });
  const rawPostId = formData.get("postId");
  if (!isLanguage(rawLanguage) || validation.error || !isSafePostId(rawPostId)) return { status: "error", reason: validation.error ?? "invalid_language" };
  try {
    const { supabase, userId } = await currentUserId();
    if (!supabase) return { status: "error", reason: "configuration" };
    if (!userId) return { status: "error", reason: "auth_required" };
    const { data: post, error: postError } = await supabase.from("posts").select("id").eq("id", validation.value.postId).maybeSingle();
    if (postError || !post) return { status: "error", reason: "invalid_post" };
    const { error } = await supabase.from("comments").insert({ post_id: validation.value.postId, author_id: userId, content: validation.value.content });
    if (error) return { status: "error", reason: error.code === "42501" ? "permission" : "comment_failed" };
    try { revalidateCommentViews(validation.value.postId); } catch { /* The confirmed insert still succeeded; client refreshes. */ }
    return { status: "success" };
  } catch {
    return { status: "error", reason: "network_failed" };
  }
}

export async function createCommentReply(_previous: CommentSubmitState, formData: FormData): Promise<CommentSubmitState> {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const validation = validateCommentReplyInput({ postId: formData.get("postId"), parentCommentId: formData.get("parentCommentId"), content: formData.get("content"), language: rawLanguage });
  const rawPostId = formData.get("postId");
  if (!isLanguage(rawLanguage) || validation.error || !isSafePostId(rawPostId)) return { status: "error", reason: validation.error ?? "invalid_language" };
  try {
    const { supabase, userId } = await currentUserId();
    if (!supabase) return { status: "error", reason: "configuration" };
    if (!userId) return { status: "error", reason: "auth_required" };
    const { data: parent, error: parentError } = await supabase
      .from("comments")
      .select("id, post_id, parent_comment_id")
      .eq("id", validation.value.parentCommentId)
      .maybeSingle();
    if (parentError || !parent || parent.post_id !== validation.value.postId || parent.parent_comment_id !== null) return { status: "error", reason: "reply_failed" };
    const { error } = await supabase.from("comments").insert({
      post_id: validation.value.postId,
      author_id: userId,
      parent_comment_id: parent.id,
      content: validation.value.content,
    });
    if (error) return { status: "error", reason: error.code === "42501" ? "permission" : "reply_failed" };
    try { revalidateCommentViews(validation.value.postId); } catch { /* The confirmed insert still succeeded; client refreshes. */ }
    return { status: "success" };
  } catch {
    return { status: "error", reason: "network_failed" };
  }
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
