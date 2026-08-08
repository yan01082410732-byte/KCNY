import { HomePageClient } from "@/components/HomePageClient";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { toPublicPosts, type PublicPost } from "@/lib/posts";
import { applyPostLikeState } from "@/lib/post-likes";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang: rawLanguage } = await searchParams;
  const initialLanguage = isLanguage(rawLanguage)
    ? rawLanguage
    : normalizeLanguage(rawLanguage);
  let authenticated = false;
  let username: string | undefined;
  let displayName: string | undefined;
  let posts: PublicPost[] = [];
  const supabase = await createClient();

  if (supabase) {
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (userId) {
      authenticated = true;
      const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle();
      username = profile?.username;
      displayName = profile?.display_name ?? undefined;
    }

    const { data } = await supabase
      .from("posts")
      .select("id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count)")
      .order("created_at", { ascending: false })
      .limit(20);
    posts = toPublicPosts(data ?? []);
    const postIds = posts.map((post) => post.id);
    if (postIds.length > 0) {
      const { data: postLikes } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);
      posts = applyPostLikeState(posts, postLikes ?? [], userId);
      if (userId) {
        const { data: postBookmarks } = await supabase
          .from("post_bookmarks")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", postIds);
        posts = applyPostBookmarkState(posts, postBookmarks ?? []);
      }
    }
  }

  return (
    <HomePageClient
      authenticated={authenticated}
      username={username}
      displayName={displayName}
      posts={posts}
      initialLanguage={initialLanguage}
    />
  );
}
