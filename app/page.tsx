import { HomePageClient } from "@/components/HomePageClient";
import { redirect } from "next/navigation";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { followingFeedHref, normalizeFeedCategory, normalizeFeedMode, type FeedMode } from "@/lib/following-feed";
import { toPublicPosts, type PublicPost } from "@/lib/posts";
import { applyViewerLikeState } from "@/lib/post-likes";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";
import { createClient } from "@/lib/supabase/server";
import { contentLoadState, logServiceFailure } from "@/lib/service-errors";
import { communityPage, FEED_PAGE_SIZE, olderThanFilter, parseCommunityCursor } from "@/lib/community-pagination";

export const dynamic = "force-dynamic";

const publicPostSelect = "id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count), post_likes(count)";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; feed?: string; category?: string; before?: string; error?: string }>;
}) {
  const { lang: rawLanguage, feed: rawFeed, category: rawCategory, before, error: actionError } = await searchParams;
  const cursor = parseCommunityCursor(before);
  const initialLanguage = isLanguage(rawLanguage) ? rawLanguage : normalizeLanguage(rawLanguage);
  const feed = normalizeFeedMode(rawFeed);
  const category = normalizeFeedCategory(rawCategory);
  if (rawFeed !== undefined && rawFeed !== feed) {
    redirect(followingFeedHref(initialLanguage, feed, category));
  }
  let authenticated = false;
  let username: string | undefined;
  let displayName: string | undefined;
  let userId: string | undefined;
  let followingIds: string[] = [];
  let posts: PublicPost[] = [];
  let contentUnavailable = false;
  let nextCursor: string | undefined;
  try {
  const supabase = await createClient();
  if (supabase) {
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError && feed === "following" && claimsError.name !== "AuthSessionMissingError") {
      contentUnavailable = true;
      logServiceFailure("feed-auth", claimsError);
    }
    const claimSubject = claimsData?.claims?.sub;
    if (typeof claimSubject === "string") {
      userId = claimSubject;
      authenticated = true;
      const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle();
      username = profile?.username;
      displayName = profile?.display_name ?? undefined;
    }

    if (feed === "following" && userId) {
      const { data: follows, error } = await supabase.from("user_follows").select("following_id").eq("follower_id", userId);
      if (error) { contentUnavailable = true; logServiceFailure("feed-follows", error); }
      followingIds = (follows ?? []).flatMap((row) => typeof row.following_id === "string" && row.following_id !== userId ? [row.following_id] : []);
    }

    if (feed === "all" || (userId && followingIds.length > 0)) {
      let query = supabase.from("posts").select(publicPostSelect).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(FEED_PAGE_SIZE + 1);
      if (feed === "following") query = query.in("author_id", followingIds);
      if (category) query = query.eq("category", category);
      if (cursor) query = query.or(olderThanFilter(cursor));
      const { data, error } = await query;
      if (contentLoadState(error, data?.length ?? 0) === "unavailable") { contentUnavailable = true; logServiceFailure("feed-posts", error); }
      const page = communityPage(data ?? [], FEED_PAGE_SIZE);
      posts = toPublicPosts(page.items);
      nextCursor = page.nextCursor;
    }

    const postIds = posts.map((post) => post.id);
    if (postIds.length > 0) {
      if (userId) {
        const { data: postLikes, error: likesError } = await supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds);
        if (likesError) { contentUnavailable = true; logServiceFailure("feed-likes", likesError); }
        posts = applyViewerLikeState(posts, postLikes ?? []);
        const { data: postBookmarks, error: bookmarksError } = await supabase.from("post_bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds);
        if (bookmarksError) { contentUnavailable = true; logServiceFailure("feed-bookmarks", bookmarksError); }
        posts = applyPostBookmarkState(posts, postBookmarks ?? []);
      }
    }
  } else { contentUnavailable = true; }
  } catch (error) {
    contentUnavailable = true;
    logServiceFailure("feed-load", error);
  }

  return <HomePageClient authenticated={authenticated} username={username} displayName={displayName} posts={posts} initialLanguage={initialLanguage} initialFeed={feed as FeedMode} initialCategory={category} contentUnavailable={contentUnavailable} before={cursor ? before : undefined} nextCursor={nextCursor} actionError={actionError} />;
}
