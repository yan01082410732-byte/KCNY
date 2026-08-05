import { notFound } from "next/navigation";
import { PostDetailClient } from "@/components/PostDetailClient";
import { toPublicComments } from "@/lib/comments";
import { isSafePostId, toPublicPosts } from "@/lib/posts";
import { normalizeLanguage } from "@/lib/auth";
import { applyPostLikeState } from "@/lib/post-likes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang } = await searchParams;
  if (!isSafePostId(id)) notFound();
  const supabase = await createClient();
  if (!supabase) notFound();
  const { data: post, error } = await supabase.from("posts").select("id, author_id, title, content, category, language, created_at, author:profiles!posts_author_id_fkey(username, display_name)").eq("id", id).maybeSingle();
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
  const { data: postLikes } = await supabase
    .from("post_likes")
    .select("post_id, user_id")
    .eq("post_id", id);
  publicPost = applyPostLikeState([publicPost], postLikes ?? [], currentUserId)[0];
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("id, post_id, author_id, content, created_at, author:profiles!comments_author_id_fkey(username, display_name)")
    .eq("post_id", id)
    .order("created_at", { ascending: true })
    .limit(100);

  return <PostDetailClient post={publicPost} comments={toPublicComments(comments ?? [], currentUserId)} commentsUnavailable={Boolean(commentsError)} language={normalizeLanguage(lang)} authenticated={Boolean(currentUserId)} currentUsername={currentUsername} currentDisplayName={currentDisplayName} canEdit={post.author_id === currentUserId} canDelete={post.author_id === currentUserId} />;
}
