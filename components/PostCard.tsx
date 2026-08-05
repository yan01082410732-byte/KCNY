import type { Language } from "@/lib/auth";
import { formatPostDate, postAvatarInitial, postCategoryLabel, postLanguageLabel, type PublicPost } from "@/lib/posts";
import { commentCountLabel } from "@/lib/comments";
import { LikeButton } from "@/components/LikeButton";

export function PostCard({ post, language, authenticated, returnTo }: { post: PublicPost; language: Language; authenticated: boolean; returnTo: string }) {
  const author = post.author;
  if (!author) return null;
  const postHref = `/posts/${encodeURIComponent(post.id)}?lang=${language}`;
  return <article className="post-card">
    <div className="avatar coral" aria-hidden="true">{postAvatarInitial(author)}</div>
    <div className="post-main">
      <div className="post-meta"><strong>{author.display_name || author.username}</strong><span>@{author.username}</span><span>·</span><span>{formatPostDate(post.created_at, language)}</span></div>
      <h3><a href={postHref}>{post.title}</a></h3>
      <p>{post.content.length > 180 ? `${post.content.slice(0, 180)}…` : post.content}</p>
      <div className="post-bottom"><div className="tags"><span>{postCategoryLabel(post.category, language)}</span><span>{postLanguageLabel(post.language, language)}</span><span>{commentCountLabel(post.comment_count, language)}</span></div><div className="post-actions"><LikeButton postId={post.id} likeCount={post.likeCount} liked={post.likedByCurrentUser} language={language} returnTo={returnTo} authenticated={authenticated} /><a className="post-read" href={postHref}>{language === "KR" ? "자세히 보기" : "查看详情"}</a></div></div>
    </div>
  </article>;
}
