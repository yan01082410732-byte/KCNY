import { redirect } from "next/navigation";
import { ProfileSettingsClient } from "@/components/ProfileSettingsClient";
import { normalizeLanguage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ lang?: string; notice?: string; error?: string }> }) {
  const params = await searchParams;
  const language = normalizeLanguage(params.lang);
  const supabase = await createClient();
  if (!supabase) redirect(`/auth/login?lang=${language}&returnTo=/settings/profile`);

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/auth/login?lang=${language}&returnTo=/settings/profile`);

  const { data: profile } = await supabase.from("profiles").select("username, display_name, bio, preferred_language").eq("id", userId).maybeSingle();
  if (!profile?.username || (profile.preferred_language !== "CN" && profile.preferred_language !== "KR")) redirect(`/auth/login?lang=${language}&returnTo=/settings/profile`);

  return <ProfileSettingsClient profile={profile} initialLanguage={language} notice={params.notice} error={params.error} />;
}
