"use server";

import { redirect } from "next/navigation";
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

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: result.displayName,
      bio: result.bio || null,
      preferred_language: result.preferredLanguage,
    })
    .eq("id", userId);

  if (error) redirect(`/settings/profile?lang=${language}&error=save_failed`);
  redirect(`/settings/profile?lang=${language}&notice=updated`);
}
