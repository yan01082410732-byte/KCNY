"use server";

import { redirect } from "next/navigation";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { isSafePostId, validatePostInput } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export async function createPost(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  if (!isLanguage(rawLanguage)) redirect(`/posts/new?lang=${language}&error=invalid_language`);
  const result = validatePostInput({ title: formData.get("title"), content: formData.get("content"), category: formData.get("category"), language: rawLanguage });
  if (result.error) redirect(`/posts/new?lang=${language}&error=${result.error}`);

  const supabase = await createClient();
  if (!supabase) redirect(`/posts/new?lang=${language}&error=configuration`);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/auth/login?lang=${language}&returnTo=/posts/new`);

  const { data, error } = await supabase.from("posts").insert({ author_id: userId, title: result.title, content: result.content, category: result.category, language: result.language }).select("id").single();
  if (error || !isSafePostId(data?.id)) redirect(`/posts/new?lang=${language}&error=publish_failed`);
  redirect(`/posts/${data.id}?lang=${language}`);
}

export async function deletePost(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const postId = formData.get("postId");
  if (!isLanguage(rawLanguage) || !isSafePostId(postId)) redirect("/");

  const supabase = await createClient();
  if (!supabase) redirect(`/posts/${postId}?lang=${language}&error=configuration`);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/auth/login?lang=${language}&returnTo=/posts/${postId}`);
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", userId);
  if (error) redirect(`/posts/${postId}?lang=${language}&error=delete_failed`);
  redirect(profile?.username ? `/u/${encodeURIComponent(profile.username)}?lang=${language}` : "/");
}
