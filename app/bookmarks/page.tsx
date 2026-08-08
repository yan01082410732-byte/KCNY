import { redirect } from "next/navigation";
import { BookmarksPageClient } from "@/components/BookmarksPageClient";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";
import { applyPostLikeState } from "@/lib/post-likes";
import { toPublicPosts, type PublicPost } from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BookmarksPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: rawLanguage } = await searchParams;
  const language = isLanguage(rawLanguage) ? rawLanguage : normalizeLanguage(rawLanguage);
  const returnTo = `/bookmarks?lang=${language}`;
  const supabase = await createClient();
  if (!supabase) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(returnTo)}`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(returnTo)}`);

  const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", user.id).maybeSingle();
  const { data: bookmarks } = await supabase
    .from("post_bookmarks")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const bookmarkRows = bookmarks ?? [];
  const postIds = bookmarkRows.map((bookmark) => bookmark.post_id).filter((postId): postId is string => typeof postId === "string");
  let posts: PublicPost[] = [];

  if (postIds.length > 0) {
    const { data: postRows } = await supabase
      .from("posts")
      .select("id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count)")
      .in("id", postIds);
    const byId = new Map(toPublicPosts(postRows ?? []).map((post) => [post.id, post]));
    posts = postIds.flatMap((postId) => {
      const post = byId.get(postId);
      return post ? [post] : [];
    });
    const { data: postLikes } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds);
    posts = applyPostLikeState(posts, postLikes ?? [], user.id);
    posts = applyPostBookmarkState(posts, bookmarkRows);
  }

  return <BookmarksPageClient posts={posts} initialLanguage={language} username={profile?.username} displayName={profile?.display_name ?? undefined} />;
}
