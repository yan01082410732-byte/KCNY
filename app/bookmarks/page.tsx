import { redirect } from "next/navigation";
import { BookmarksPageClient } from "@/components/BookmarksPageClient";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";
import { applyViewerLikeState } from "@/lib/post-likes";
import { toPublicPosts, type PublicPost } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BookmarksPage({ searchParams }: { searchParams: Promise<{ lang?: string; error?: string }> }) {
  const { lang: rawLanguage, error: actionError } = await searchParams;
  const language = isLanguage(rawLanguage) ? rawLanguage : normalizeLanguage(rawLanguage);
  const returnTo = `/bookmarks?lang=${language}`;
  const supabase = await createClient();
  if (!supabase) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(returnTo)}`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(returnTo)}`);

  const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", user.id).maybeSingle();
  const { data: bookmarks, error: bookmarksError } = await supabase
    .from("post_bookmarks")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const bookmarkRows = bookmarks ?? [];
  const postIds = bookmarkRows.map((bookmark) => bookmark.post_id).filter((postId): postId is string => typeof postId === "string");
  let posts: PublicPost[] = [];
  let unavailable = Boolean(bookmarksError);

  if (postIds.length > 0) {
    const { data: postRows, error: postsError } = await supabase
      .from("posts")
      .select("id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count), post_likes(count)")
      .in("id", postIds);
    unavailable ||= Boolean(postsError);
    const byId = new Map(toPublicPosts(postRows ?? []).map((post) => [post.id, post]));
    posts = postIds.flatMap((postId) => {
      const post = byId.get(postId);
      return post ? [post] : [];
    });
    const { data: postLikes, error: likesError } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
    unavailable ||= Boolean(likesError);
    if (!likesError) posts = applyViewerLikeState(posts, postLikes ?? []);
    posts = applyPostBookmarkState(posts, bookmarkRows);
  }

  return <BookmarksPageClient posts={posts} initialLanguage={language} username={profile?.username} displayName={profile?.display_name ?? undefined} unavailable={unavailable} actionError={actionError} />;
}
