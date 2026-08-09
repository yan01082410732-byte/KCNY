"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { isLanguage, normalizeLanguage, safeReturnTo } from "@/lib/auth";
import { isSafeUsername } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

function loginRedirect(language: "CN" | "KR", returnTo: string) { redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(returnTo)}`); }

async function followContext(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const targetUsername = formData.get("targetUsername");
  const returnTo = safeReturnTo(formData.get("returnTo"));
  if (!isLanguage(rawLanguage) || !isSafeUsername(targetUsername)) notFound();
  const supabase = await createClient();
  if (!supabase) redirect(returnTo);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    loginRedirect(language, returnTo);
    return null as never;
  }
  const { data: target } = await supabase.from("profiles").select("id, username").eq("username", targetUsername).maybeSingle();
  if (!target) notFound();
  if (target.id === user.id) redirect(returnTo);
  return { supabase, userId: user.id, target, returnTo };
}

function revalidateFollowPaths(username: string) {
  revalidatePath(`/u/${encodeURIComponent(username)}`);
  revalidatePath(`/u/${encodeURIComponent(username)}/followers`);
  revalidatePath(`/u/${encodeURIComponent(username)}/following`);
}

export async function followUserAction(formData: FormData) {
  const { supabase, userId, target, returnTo } = await followContext(formData);
  const { error } = await supabase.from("user_follows").upsert({ follower_id: userId, following_id: target.id }, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
  if (error) redirect(returnTo);
  revalidateFollowPaths(target.username);
  redirect(returnTo);
}

export async function unfollowUserAction(formData: FormData) {
  const { supabase, userId, target, returnTo } = await followContext(formData);
  const { error } = await supabase.from("user_follows").delete().eq("follower_id", userId).eq("following_id", target.id);
  if (error) redirect(returnTo);
  revalidateFollowPaths(target.username);
  redirect(returnTo);
}
