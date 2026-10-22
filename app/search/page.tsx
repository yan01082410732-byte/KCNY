import { SearchPageClient } from "@/components/SearchPageClient";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { olderThanFilter } from "@/lib/community-pagination";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";
import { applyViewerLikeState } from "@/lib/post-likes";
import { toPublicPosts, type PublicPost } from "@/lib/posts";
import { isSearchType, mergeRecentSearchRows, normalizeSearchQuery, parseSearchCursor, parseSearchFilters, phaseSearchPage, searchLikePattern, searchPage, SEARCH_PAGE_SIZE, toPublicSearchProfiles, type PublicSearchProfile } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const POST_SELECT = "id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), comments(count), post_likes(count)";
type SearchParams = { lang?: string; q?: string; type?: string; category?: string; postLanguage?: string; sort?: string; before?: string; error?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const language = isLanguage(params.lang) ? params.lang : normalizeLanguage(params.lang);
  const query = normalizeSearchQuery(params.q);
  const type = isSearchType(params.type) ? params.type : "posts";
  const filters = parseSearchFilters(params);
  const cursor = parseSearchCursor(params.before, type, filters.sort ?? "recent");
  let authenticated = false;
  let username: string | undefined;
  let displayName: string | undefined;
  let posts: PublicPost[] = [];
  let users: PublicSearchProfile[] = [];
  let nextCursor: string | undefined;
  let error = false;
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
      const makeQuery = (field: "title" | "content", excludeTitle = false) => {
        let request = supabase.from("posts").select(POST_SELECT).ilike(field, pattern);
        if (excludeTitle) request = request.not("title", "ilike", pattern);
        if (filters.category) request = request.eq("category", filters.category);
        if (filters.postLanguage) request = request.eq("language", filters.postLanguage);
        if (cursor?.createdAt && cursor.id && (filters.sort === "recent" || cursor.phase === (excludeTitle ? "b" : "t"))) request = request.or(olderThanFilter({ createdAt: cursor.createdAt, id: cursor.id }));
        return request.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(SEARCH_PAGE_SIZE + 1);
      };
      if (filters.sort === "relevant") {
        const titleRequest = cursor?.phase === "b" ? undefined : makeQuery("title");
        const [titleResult, bodyResult] = await Promise.all([titleRequest, makeQuery("content", true)]);
        if (titleResult?.error || bodyResult.error) error = true;
        else {
          const titleRows = toPublicPosts(titleResult?.data ?? []);
          const bodyRows = toPublicPosts(bodyResult.data ?? []);
          const page = phaseSearchPage(titleRows, bodyRows);
          posts = page.items;
          const lastTitle = titleRows[page.primaryCount - 1];
          const lastBody = bodyRows[page.secondaryCount - 1];
          if (page.primaryMore && lastTitle) nextCursor = `t|${lastTitle.created_at}|${lastTitle.id}`;
          else if (page.secondaryMore && lastBody) nextCursor = `b|${lastBody.created_at}|${lastBody.id}`;
          else if (page.primaryCount === SEARCH_PAGE_SIZE && bodyRows.length > 0) nextCursor = "b";
        }
      } else {
        const [{ data: titleRows, error: titleError }, { data: contentRows, error: contentError }] = await Promise.all([makeQuery("title"), makeQuery("content")]);
        if (titleError || contentError) error = true;
        else {
          const page = searchPage(mergeRecentSearchRows(toPublicPosts(titleRows ?? []), toPublicPosts(contentRows ?? [])));
          posts = page.items;
          if (page.hasMore && page.last) nextCursor = `r|${page.last.created_at}|${page.last.id}`;
        }
      }
      if (!error && posts.length > 0) {
        const postIds = posts.map((post) => post.id);
        if (userId) {
          const { data: postLikes, error: likesError } = await supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds);
          if (likesError) error = true;
          else posts = applyViewerLikeState(posts, postLikes ?? []);
        }
        if (userId && !error) {
          const { data: postBookmarks, error: bookmarksError } = await supabase.from("post_bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds);
          if (bookmarksError) error = true;
          else posts = applyPostBookmarkState(posts, postBookmarks ?? []);
        }
      }
    }
    if (query && type === "users") {
      const pattern = searchLikePattern(query);
      const makeQuery = (field: "username" | "display_name", excludeUsername = false) => {
        let request = supabase.from("profiles").select("username, display_name").ilike(field, pattern);
        if (excludeUsername) request = request.not("username", "ilike", pattern);
        if (cursor?.username && cursor.phase === (excludeUsername ? "d" : "u")) request = request.gt("username", cursor.username);
        return request.order("username", { ascending: true }).limit(SEARCH_PAGE_SIZE + 1);
      };
      const usernameRequest = cursor?.phase === "d" ? undefined : makeQuery("username");
      const [usernameResult, displayNameResult] = await Promise.all([usernameRequest, makeQuery("display_name", true)]);
      if (usernameResult?.error || displayNameResult.error) error = true;
      else {
        const usernameRows = toPublicSearchProfiles(usernameResult?.data ?? []);
        const displayNameRows = toPublicSearchProfiles(displayNameResult.data ?? []);
        const page = phaseSearchPage(usernameRows, displayNameRows);
        users = page.items;
        const lastUsername = usernameRows[page.primaryCount - 1];
        const lastDisplayName = displayNameRows[page.secondaryCount - 1];
        if (page.primaryMore && lastUsername) nextCursor = `u|${lastUsername.username}`;
        else if (page.secondaryMore && lastDisplayName) nextCursor = `d|${lastDisplayName.username}`;
        else if (page.primaryCount === SEARCH_PAGE_SIZE && displayNameRows.length > 0) nextCursor = "d";
      }
    }
  } else if (query) error = true;
  if (error) { posts = []; users = []; nextCursor = undefined; }
  return <SearchPageClient initialLanguage={language} query={query} type={type} filters={filters} posts={posts} users={users} nextCursor={nextCursor} error={error} actionError={params.error} authenticated={authenticated} username={username} displayName={displayName} />;
}
