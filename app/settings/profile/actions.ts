"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { validateProfileUpdate } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  if (!isLanguage(rawLanguage)) redirect(`/settings/profile?lang=${language}&error=invalid_language`);

  const result = validateProfileUpdate({
    displayName: formData.get("displayName"),
    bio: formData.get("bio"),
    preferredLanguage: formData.get("preferredLanguage"),
  });
  if (result.error) redirect(`/settings/profile?lang=${language}&error=${result.error}`);

  const supabase = await createClient();
  if (!supabase) redirect(`/settings/profile?lang=${language}&error=configuration`);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/auth/login?lang=${language}&returnTo=/settings/profile`);

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: result.displayName,
      bio: result.bio || null,
      preferred_language: result.preferredLanguage,
    })
    .eq("id", userId)
    .select("username")
    .maybeSingle();

  if (error || !data) redirect(`/settings/profile?lang=${language}&error=save_failed`);
  revalidatePath(`/u/${encodeURIComponent(data.username)}`);
  revalidatePath("/settings/profile");
  redirect(`/settings/profile?lang=${result.preferredLanguage}&notice=updated`);
}
