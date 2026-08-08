import { SearchPageClient } from "@/components/SearchPageClient";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";
import { applyPostLikeState } from "@/lib/post-likes";
import { toPublicPosts, type PublicPost } from "@/lib/posts";
import { isSearchType, mergeUniqueByKey, normalizeSearchQuery, searchLikePattern, toPublicSearchProfiles, type PublicSearchProfile } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const POST_SELECT = "id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count)";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ lang?: string; q?: string; type?: string }> }) {
  const params = await searchParams;
  const language = isLanguage(params.lang) ? params.lang : normalizeLanguage(params.lang);
  const query = normalizeSearchQuery(params.q);
  const type = isSearchType(params.type) ? params.type : "posts";
  let authenticated = false;
  let username: string | undefined;
  let displayName: string | undefined;
  let posts: PublicPost[] = [];
  let users: PublicSearchProfile[] = [];
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

    if (query && type === "posts") {
      const pattern = searchLikePattern(query);
      const [{ data: titleRows }, { data: contentRows }] = await Promise.all([
        supabase.from("posts").select(POST_SELECT).ilike("title", pattern).order("created_at", { ascending: false }).limit(20),
        supabase.from("posts").select(POST_SELECT).ilike("content", pattern).order("created_at", { ascending: false }).limit(20),
      ]);
      posts = mergeUniqueByKey(toPublicPosts([...(titleRows ?? []), ...(contentRows ?? [])]), "id")
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(0, 20);
      const postIds = posts.map((post) => post.id);
      if (postIds.length > 0) {
        const { data: postLikes } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", postIds);
        posts = applyPostLikeState(posts, postLikes ?? [], userId);
        if (userId) {
          const { data: postBookmarks } = await supabase.from("post_bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds);
          posts = applyPostBookmarkState(posts, postBookmarks ?? []);
        }
      }
    }

    if (query && type === "users") {
      const pattern = searchLikePattern(query);
      const [{ data: usernameRows }, { data: displayNameRows }] = await Promise.all([
        supabase.from("profiles").select("username, display_name").ilike("username", pattern).order("username").limit(20),
        supabase.from("profiles").select("username, display_name").ilike("display_name", pattern).order("username").limit(20),
      ]);
      users = mergeUniqueByKey(toPublicSearchProfiles([...(usernameRows ?? []), ...(displayNameRows ?? [])]), "username").slice(0, 20);
    }
  }

  return <SearchPageClient initialLanguage={language} query={query} type={type} posts={posts} users={users} authenticated={authenticated} username={username} displayName={displayName} />;
}
