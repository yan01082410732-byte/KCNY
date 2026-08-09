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

async function currentUserId() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: undefined };
  const { data: claimsData } = await supabase.auth.getClaims();
  return { supabase, userId: claimsData?.claims?.sub };
}

export async function createComment(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const validation = validateCommentInput({ postId: formData.get("postId"), content: formData.get("content"), language: rawLanguage });
  const rawPostId = formData.get("postId");
  if (!isLanguage(rawLanguage) || validation.error || !isSafePostId(rawPostId)) redirect(isSafePostId(rawPostId) ? postUrl(rawPostId, language, validation.error ?? "invalid_language") : "/");

  const { supabase, userId } = await currentUserId();
  if (!supabase) redirect(postUrl(validation.value.postId, language, "configuration"));
  if (!userId) redirect(loginUrl(validation.value.postId, language));
  const { data: post } = await supabase.from("posts").select("id").eq("id", validation.value.postId).maybeSingle();
  if (!post) redirect(postUrl(validation.value.postId, language, "comment_failed"));
  const { error } = await supabase.from("comments").insert({ post_id: validation.value.postId, author_id: userId, content: validation.value.content });
  if (error) redirect(postUrl(validation.value.postId, language, "comment_failed"));
  revalidateCommentViews(validation.value.postId);
  redirect(postUrl(validation.value.postId, language));
}

export async function createCommentReply(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const validation = validateCommentReplyInput({ postId: formData.get("postId"), parentCommentId: formData.get("parentCommentId"), content: formData.get("content"), language: rawLanguage });
  const rawPostId = formData.get("postId");
  if (!isLanguage(rawLanguage) || validation.error || !isSafePostId(rawPostId)) redirect(isSafePostId(rawPostId) ? postUrl(rawPostId, language, validation.error ?? "invalid_language") : "/");

  const { supabase, userId } = await currentUserId();
  if (!supabase) redirect(postUrl(validation.value.postId, language, "configuration"));
  if (!userId) redirect(loginUrl(validation.value.postId, language));
  const { data: parent, error: parentError } = await supabase
    .from("comments")
    .select("id, post_id, parent_comment_id")
    .eq("id", validation.value.parentCommentId)
    .maybeSingle();
  if (parentError || !parent || parent.post_id !== validation.value.postId || parent.parent_comment_id !== null) redirect(postUrl(validation.value.postId, language, "reply_failed"));
  const { error } = await supabase.from("comments").insert({
    post_id: validation.value.postId,
    author_id: userId,
    parent_comment_id: parent.id,
    content: validation.value.content,
  });
  if (error) redirect(postUrl(validation.value.postId, language, "reply_failed"));
  revalidateCommentViews(validation.value.postId);
  redirect(postUrl(validation.value.postId, language));
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
