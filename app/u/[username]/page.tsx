import { notFound } from "next/navigation";
import { ProfilePageClient } from "@/components/ProfilePageClient";
import { normalizeLanguage } from "@/lib/auth";
import { isSafeUsername, PUBLIC_PROFILE_FIELDS, type PublicProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { toPublicPosts } from "@/lib/posts";
import { applyPostLikeState } from "@/lib/post-likes";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { username } = await params;
  const { lang } = await searchParams;
  if (!isSafeUsername(username)) notFound();

  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: profile, error } = await supabase.from("profiles").select(`${PUBLIC_PROFILE_FIELDS}, id`).eq("username", username).maybeSingle();
  if (error || !profile) notFound();

  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims?.sub;
  let currentUsername: string | undefined;
  let currentDisplayName: string | undefined;

  if (currentUserId) {
    const { data: currentProfile } = await supabase.from("profiles").select("username, display_name").eq("id", currentUserId).maybeSingle();
    currentUsername = currentProfile?.username;
    currentDisplayName = currentProfile?.display_name ?? undefined;
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count)")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  let publicPosts = toPublicPosts(posts ?? []);
  const postIds = publicPosts.map((post) => post.id);
  if (postIds.length > 0) {
    const { data: postLikes } = await supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", postIds);
    publicPosts = applyPostLikeState(publicPosts, postLikes ?? [], currentUserId);
    if (currentUserId) {
      const { data: postBookmarks } = await supabase
        .from("post_bookmarks")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
      publicPosts = applyPostBookmarkState(publicPosts, postBookmarks ?? []);
    }
  }

  return <ProfilePageClient profile={profile as PublicProfile} posts={publicPosts} initialLanguage={normalizeLanguage(lang)} authenticated={Boolean(currentUserId)} currentUsername={currentUsername} currentDisplayName={currentDisplayName} />;
}
