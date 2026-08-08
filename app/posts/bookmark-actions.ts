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

async function getBookmarkContext(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const postId = formData.get("postId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (!isLanguage(rawLanguage) || !isSafePostId(postId)) redirect("/");

  const supabase = await createClient();
  if (!supabase) redirect(withActionError(returnTo, "configuration"));

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  if (!userId) redirectToLogin(language, returnTo);

  const { data: post } = await supabase.from("posts").select("id").eq("id", postId).maybeSingle();
  if (!post) redirect("/");

  return { language, postId, returnTo, supabase, userId };
}

function revalidateBookmarkPaths(postId: string) {
  revalidatePath("/");
  revalidatePath(`/posts/${postId}`);
  revalidatePath("/bookmarks");
}

export async function bookmarkPostAction(formData: FormData) {
  const context = await getBookmarkContext(formData);
  const { error } = await context.supabase.from("post_bookmarks").upsert(
    { post_id: context.postId, user_id: context.userId },
    { onConflict: "post_id,user_id", ignoreDuplicates: true },
  );
  if (error) redirect(withActionError(context.returnTo, "bookmark_failed"));
  revalidateBookmarkPaths(context.postId);
  redirect(context.returnTo);
}

export async function unbookmarkPostAction(formData: FormData) {
  const context = await getBookmarkContext(formData);
  const { error } = await context.supabase
    .from("post_bookmarks")
    .delete()
    .eq("post_id", context.postId)
    .eq("user_id", context.userId);
  if (error) redirect(withActionError(context.returnTo, "unbookmark_failed"));
  revalidateBookmarkPaths(context.postId);
  redirect(context.returnTo);
}
