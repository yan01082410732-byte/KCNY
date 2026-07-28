import { redirect } from "next/navigation";
import { PostComposer } from "@/components/PostComposer";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const fallbackLanguage = normalizeLanguage(lang);
  const supabase = await createClient();
  if (!supabase) redirect(`/auth/login?lang=${fallbackLanguage}&returnTo=/posts/new`);
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/auth/login?lang=${fallbackLanguage}&returnTo=/posts/new`);
  const { data: profile } = await supabase.from("profiles").select("preferred_language").eq("id", userId).maybeSingle();
  const language = isLanguage(lang) ? lang : (isLanguage(profile?.preferred_language) ? profile.preferred_language : "CN");
  return <PostComposer language={language} />;
}
