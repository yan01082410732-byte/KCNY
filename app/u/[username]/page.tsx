import { notFound } from "next/navigation";
import { ProfilePageClient } from "@/components/ProfilePageClient";
import { normalizeLanguage } from "@/lib/auth";
import { isSafeUsername, PUBLIC_PROFILE_FIELDS, type PublicProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { toPublicPosts } from "@/lib/posts";
import { applyViewerLikeState } from "@/lib/post-likes";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";
import { communityPage, FEED_PAGE_SIZE, olderThanFilter, parseCommunityCursor } from "@/lib/community-pagination";

export const dynamic = "force-dynamic";

function ProfileUnavailable({ username, language }: { username: string; language: "CN" | "KR" }) {
  return <main><section className="shell profile-page"><div className="profile-empty" role="alert"><h1>{language === "KR" ? "프로필을 불러오지 못했습니다." : "无法加载个人主页。"}</h1><a className="button secondary" href={`/u/${encodeURIComponent(username)}?lang=${language}`}>{language === "KR" ? "다시 시도" : "重试"}</a></div></section></main>;
}

export default async function PublicProfilePage({ params, searchParams }: { params: Promise<{ username: string }>; searchParams: Promise<{ lang?: string; before?: string; deleted?: string; error?: string }> }) {
  const { username } = await params;
  const { lang, before, deleted, error: actionError } = await searchParams;
  const language = normalizeLanguage(lang);
  const cursor = parseCommunityCursor(before);
  if (!isSafeUsername(username)) notFound();

  const supabase = await createClient();
  if (!supabase) return <ProfileUnavailable username={username} language={language} />;

  const { data: profile, error } = await supabase.from("profiles").select(`${PUBLIC_PROFILE_FIELDS}, id`).eq("username", username).maybeSingle();
  if (error) return <ProfileUnavailable username={username} language={language} />;
  if (!profile) notFound();

  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims?.sub;
  let currentUsername: string | undefined;
  let currentDisplayName: string | undefined;

  if (currentUserId) {
    const { data: currentProfile } = await supabase.from("profiles").select("username, display_name").eq("id", currentUserId).maybeSingle();
    currentUsername = currentProfile?.username;
    currentDisplayName = currentProfile?.display_name ?? undefined;
  }

  const [{ count: followerCount, error: followersError }, { count: followingCount, error: followingError }] = await Promise.all([
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
  ]);
  let followingByCurrentUser = false;
  let relationshipUnavailable = false;
  if (currentUserId && currentUserId !== profile.id) {
    const { data: relationship, error: relationshipError } = await supabase.from("user_follows").select("follower_id").eq("follower_id", currentUserId).eq("following_id", profile.id).maybeSingle();
    relationshipUnavailable = Boolean(relationshipError);
    followingByCurrentUser = Boolean(relationship);
  }

  let postsRequest = supabase
    .from("posts")
    .select("id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count), post_likes(count)")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (cursor) postsRequest = postsRequest.or(olderThanFilter(cursor));
  const { data: posts, error: postsError } = await postsRequest.limit(FEED_PAGE_SIZE + 1);

  const page = communityPage(toPublicPosts(posts ?? []), FEED_PAGE_SIZE);
  let publicPosts = page.items;
  const postIds = publicPosts.map((post) => post.id);
  let interactionsUnavailable = false;
  if (postIds.length > 0) {
    if (currentUserId) {
      const { data: postLikes, error: likesError } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
      if (likesError) interactionsUnavailable = true;
      else publicPosts = applyViewerLikeState(publicPosts, postLikes ?? []);
      const { data: postBookmarks, error: bookmarksError } = await supabase
        .from("post_bookmarks")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
      if (bookmarksError) interactionsUnavailable = true;
      else publicPosts = applyPostBookmarkState(publicPosts, postBookmarks ?? []);
    }
  }

  return <ProfilePageClient profile={profile as PublicProfile} posts={publicPosts} initialLanguage={language} authenticated={Boolean(currentUserId)} currentUsername={currentUsername} currentDisplayName={currentDisplayName} followerCount={followerCount ?? 0} followingCount={followingCount ?? 0} followingByCurrentUser={followingByCurrentUser} socialUnavailable={Boolean(followersError || followingError || relationshipUnavailable)} postsUnavailable={Boolean(postsError || interactionsUnavailable)} before={cursor ? before : undefined} nextCursor={page.nextCursor} deleted={deleted === "1" && currentUsername === profile.username} actionError={actionError} />;
}
