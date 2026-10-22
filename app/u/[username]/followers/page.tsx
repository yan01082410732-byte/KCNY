import { notFound } from "next/navigation";
import { FollowListClient } from "@/components/FollowListClient";
import { normalizeLanguage } from "@/lib/auth";
import { isSafeUsername } from "@/lib/profile";
import { FOLLOW_LIST_PAGE_SIZE, followListPage, olderFollowFilter, parseFollowCursor, toPublicFollowProfiles } from "@/lib/user-follows";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FollowersPage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ lang?: string; before?: string }> }) {
  const { username } = await params;
  const { lang, before } = await searchParams;
  const cursor = parseFollowCursor(before);
  const language = normalizeLanguage(lang);
  if (!isSafeUsername(username)) notFound();
  const supabase = await createClient();
  if (!supabase) return <FollowListClient profiles={[]} initialLanguage={language} title="followers" empty unavailable profileUsername={username} authenticated={false} />;
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle();
  if (profileError) return <FollowListClient profiles={[]} initialLanguage={language} title="followers" empty unavailable profileUsername={username} authenticated={false} />;
  if (!profile) notFound();
  let listQuery = supabase.from("user_follows").select("created_at, follower_id, following_id, follower:profiles!user_follows_follower_id_fkey(username, display_name)").eq("following_id", profile.id);
  if (cursor) listQuery = listQuery.or(olderFollowFilter(cursor, "followers"));
  const { data: rows, error: listError } = await listQuery.order("created_at", { ascending: false }).order("follower_id", { ascending: false }).limit(FOLLOW_LIST_PAGE_SIZE + 1);
  const page = followListPage(rows ?? [], "followers");
  const profiles = toPublicFollowProfiles(page.items.map((row) => Array.isArray(row.follower) ? row.follower[0] : row.follower));
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  let currentProfile: { username?: string; display_name?: string | null } | null = null;
  if (userId) ({ data: currentProfile } = await supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle());
  return <FollowListClient profiles={profiles} initialLanguage={language} title="followers" empty={profiles.length === 0} unavailable={Boolean(listError)} profileUsername={username} before={cursor ? before : undefined} nextCursor={page.nextCursor} authenticated={Boolean(userId)} username={currentProfile?.username} displayName={currentProfile?.display_name ?? undefined} />;
}
