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
  if (!profile?.username || (profile.preferred_language !== "CN" && profile.preferred_language !== "KR")) {
    return <main className="auth-page"><section className="auth-card" role="alert"><h1>{language === "KR" ? "설정을 불러오지 못했습니다" : "无法加载设置"}</h1><p>{language === "KR" ? "잠시 후 다시 시도해 주세요." : "请稍后重试。"}</p><a href={`/settings/profile?lang=${language}`}>{language === "KR" ? "다시 시도" : "重试"}</a></section></main>;
  }

  return <ProfileSettingsClient profile={profile} initialLanguage={language} notice={params.notice} error={params.error} />;
}
