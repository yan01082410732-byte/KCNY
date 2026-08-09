import { notFound } from "next/navigation";
import { FollowListClient } from "@/components/FollowListClient";
import { normalizeLanguage } from "@/lib/auth";
import { isSafeUsername } from "@/lib/profile";
import { toPublicFollowProfiles } from "@/lib/user-follows";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FollowersPage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { username } = await params;
  const { lang } = await searchParams;
  if (!isSafeUsername(username)) notFound();
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!profile) notFound();
  const { data: rows } = await supabase.from("user_follows").select("follower:profiles!user_follows_follower_id_fkey(username, display_name)").eq("following_id", profile.id).order("created_at", { ascending: false });
  const profiles = toPublicFollowProfiles((rows ?? []).map((row) => Array.isArray(row.follower) ? row.follower[0] : row.follower));
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  let currentProfile: { username?: string; display_name?: string | null } | null = null;
  if (userId) ({ data: currentProfile } = await supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle());
  return <FollowListClient profiles={profiles} initialLanguage={normalizeLanguage(lang)} title="followers" empty={profiles.length === 0} authenticated={Boolean(userId)} username={currentProfile?.username} displayName={currentProfile?.display_name ?? undefined} />;
}
