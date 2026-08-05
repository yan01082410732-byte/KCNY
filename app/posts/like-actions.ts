"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLanguage, normalizeLanguage, safeReturnTo } from "@/lib/auth";
import { isSafePostId } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

function redirectToLogin(language: "CN" | "KR", returnTo: string) {
  redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(returnTo)}`);
}

function withActionError(returnTo: string, error: string) {
  return `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${error}`;
}

async function getLikeContext(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const postId = formData.get("postId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (!isLanguage(rawLanguage) || !isSafePostId(postId)) redirect("/");

  const supabase = await createClient();
  if (!supabase) redirect(withActionError(returnTo, "configuration"));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) redirectToLogin(language, returnTo);

  const { data: post } = await supabase
    .from("posts")
    .select("id, author:profiles!posts_author_id_fkey(username)")
    .eq("id", postId)
    .maybeSingle();
  if (!post) redirect("/");

  const author = Array.isArray(post.author) ? post.author[0] : post.author;
  const username = author && typeof author.username === "string" ? author.username : undefined;

  return { language, postId, returnTo, supabase, userId, username };
}

function revalidateLikePaths(postId: string, username?: string) {
  revalidatePath("/");
  revalidatePath(`/posts/${postId}`);
  if (username) revalidatePath(`/u/${encodeURIComponent(username)}`);
}

export async function likePostAction(formData: FormData) {
  const context = await getLikeContext(formData);
  const { error } = await context.supabase.from("post_likes").upsert(
    { post_id: context.postId, user_id: context.userId },
    { onConflict: "post_id,user_id", ignoreDuplicates: true },
  );
  if (error) redirect(withActionError(context.returnTo, "like_failed"));

  revalidateLikePaths(context.postId, context.username);
  redirect(context.returnTo);
}

export async function unlikePostAction(formData: FormData) {
  const context = await getLikeContext(formData);
  const { error } = await context.supabase
    .from("post_likes")
    .delete()
    .eq("post_id", context.postId)
    .eq("user_id", context.userId);
  if (error) redirect(withActionError(context.returnTo, "unlike_failed"));

  revalidateLikePaths(context.postId, context.username);
  redirect(context.returnTo);
}
