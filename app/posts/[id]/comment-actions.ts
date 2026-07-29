"use server";

import { redirect } from "next/navigation";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { validateCommentInput } from "@/lib/comments";
import { isSafePostId } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

function postUrl(postId: string, language: "CN" | "KR", error?: string) {
  const query = error ? `?lang=${language}&error=${error}` : `?lang=${language}`;
  return `/posts/${postId}${query}#comments`;
}

export async function createComment(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const validation = validateCommentInput({
    postId: formData.get("postId"),
    content: formData.get("content"),
    language: rawLanguage,
  });
  const rawPostId = formData.get("postId");
  if (!isLanguage(rawLanguage) || validation.error || !isSafePostId(rawPostId)) {
    redirect(isSafePostId(rawPostId) ? postUrl(rawPostId, language, validation.error ?? "invalid_language") : "/");
  }

  const supabase = await createClient();
  if (!supabase) redirect(postUrl(validation.value.postId, language, "configuration"));
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/auth/login?lang=${language}&returnTo=/posts/${validation.value.postId}`);

  const { data: post } = await supabase.from("posts").select("id").eq("id", validation.value.postId).maybeSingle();
  if (!post) redirect(postUrl(validation.value.postId, language, "comment_failed"));
  const { error } = await supabase.from("comments").insert({
    post_id: validation.value.postId,
    author_id: userId,
    content: validation.value.content,
  });
  if (error) redirect(postUrl(validation.value.postId, language, "comment_failed"));
  redirect(postUrl(validation.value.postId, language));
}

export async function deleteComment(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const postId = formData.get("postId");
  const commentId = formData.get("commentId");
  if (!isLanguage(rawLanguage) || !isSafePostId(postId) || !isSafePostId(commentId)) redirect("/");

  const supabase = await createClient();
  if (!supabase) redirect(postUrl(postId, language, "configuration"));
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/auth/login?lang=${language}&returnTo=/posts/${postId}`);

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("post_id", postId)
    .eq("author_id", userId);
  if (error) redirect(postUrl(postId, language, "delete_comment_failed"));
  redirect(postUrl(postId, language));
}
