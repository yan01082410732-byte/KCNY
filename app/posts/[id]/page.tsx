import { notFound } from "next/navigation";
import { PostDetailClient } from "@/components/PostDetailClient";
import { groupCommentThreads, isSafeCommentRelatedId, toPublicComments } from "@/lib/comments";
import { isSafePostId, toPublicPosts } from "@/lib/posts";
import { normalizeLanguage } from "@/lib/auth";
import { applyViewerLikeState } from "@/lib/post-likes";
import { applyPostBookmarkState } from "@/lib/post-bookmarks";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_PAGE_SIZE, commentCursorFilter, parseCommentCursor, sliceCommentPage, pageWithParentContext } from "@/lib/comment-pagination";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string; commentsAfter?: string; comment?: string; error?: string; published?: string; updated?: string }> }) {
  const { id } = await params;
  const { lang, commentsAfter, comment, error: pageError, published, updated } = await searchParams;
  const cursor = parseCommentCursor(commentsAfter);
  if (!isSafePostId(id)) notFound();
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: post, error } = await supabase.from("posts").select("id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name), post_likes(count)").eq("id", id).maybeSingle();
  let publicPost = toPublicPosts(post ? [post] : [])[0];
  if (error || !post || !publicPost) notFound();

  const { data: claimsData } = await supabase.auth.getClaims();
  const currentUserId = claimsData?.claims?.sub;
  let currentUsername: string | undefined;
  let currentDisplayName: string | undefined;
  if (currentUserId) {
    const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", currentUserId).maybeSingle();
    currentUsername = profile?.username;
    currentDisplayName = profile?.display_name ?? undefined;
  }
  let likesUnavailable = false;
  if (currentUserId) {
    const { data: postLikes, error: likesError } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", currentUserId)
      .eq("post_id", id);
    likesUnavailable = Boolean(likesError);
    if (!likesError) publicPost = applyViewerLikeState([publicPost], postLikes ?? [])[0];
    const { data: postBookmarks } = await supabase
      .from("post_bookmarks")
      .select("post_id")
      .eq("user_id", currentUserId)
      .eq("post_id", id);
    publicPost = applyPostBookmarkState([publicPost], postBookmarks ?? [])[0];
  }
  const commentSelect = "id, post_id, author_id, parent_comment_id, content, created_at, author:profiles!comments_author_id_fkey(username, display_name)";
  let focusedCommentId: string | undefined;
  let focusedCursor: ReturnType<typeof parseCommentCursor>;
  let focusUnavailable = false;
  if (!cursor && isSafeCommentRelatedId(comment)) {
    const { data: target, error: targetError } = await supabase.from("comments").select("id, created_at").eq("post_id", id).eq("id", comment).maybeSingle();
    focusUnavailable = Boolean(targetError);
    if (target) {
      focusedCursor = parseCommentCursor(`${target.created_at}|${target.id}`);
      focusedCommentId = target.id;
    }
  }
  let commentQuery = supabase
    .from("comments")
    .select(commentSelect)
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(COMMENT_PAGE_SIZE + 1);
  if (cursor) commentQuery = commentQuery.or(commentCursorFilter(cursor));
  else if (focusedCursor) commentQuery = commentQuery.or(`created_at.gt.${focusedCursor.createdAt},and(created_at.eq.${focusedCursor.createdAt},id.gte.${focusedCursor.id})`);
  const [{ data: comments, error: commentsError }, { count, error: countError }] = await Promise.all([
    commentQuery,
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("post_id", id),
  ]);

  const publicComments = toPublicComments(comments ?? [], currentUserId);
  const page = sliceCommentPage(publicComments);
  const loadedIds = new Set(page.items.map((comment) => comment.id));
  const parentIds = [...new Set(page.items.flatMap((comment) => comment.parentCommentId && !loadedIds.has(comment.parentCommentId) ? [comment.parentCommentId] : []))];
  let parentComments = [] as typeof publicComments;
  let parentsUnavailable = false;
  if (parentIds.length) {
    const { data: parents, error } = await supabase.from("comments").select(commentSelect).eq("post_id", id).is("parent_comment_id", null).in("id", parentIds);
    parentComments = toPublicComments(parents ?? [], currentUserId);
    parentsUnavailable = Boolean(error);
  }
  const threads = groupCommentThreads(pageWithParentContext(page.items, parentComments));
  return <PostDetailClient post={publicPost} commentThreads={threads} commentCount={count ?? 0} commentsUnavailable={Boolean(commentsError || countError || parentsUnavailable || focusUnavailable)} likesUnavailable={likesUnavailable} commentError={pageError === "delete_failed" || pageError === "like_failed" || pageError === "unlike_failed" ? undefined : pageError} postError={pageError === "delete_failed" ? pageError : undefined} likeError={pageError} completedDraft={post.author_id === currentUserId ? published === "1" ? "create" : updated === "1" ? "edit" : undefined : undefined} focusedCommentId={focusedCommentId} nextCommentCursor={page.nextCursor} currentCommentCursor={cursor ? commentsAfter : undefined} language={normalizeLanguage(lang)} authenticated={Boolean(currentUserId)} currentUserId={currentUserId} currentUsername={currentUsername} currentDisplayName={currentDisplayName} canEdit={post.author_id === currentUserId} canDelete={post.author_id === currentUserId} />;
}
