"use client";

import { useState } from "react";
import { createComment, deleteComment } from "@/app/posts/[id]/comment-actions";
import { deletePost } from "@/app/posts/actions";
import { Header } from "@/components/Header";
import {
  commentAvatarInitial,
  commentCountLabel,
  type PublicComment,
} from "@/lib/comments";
import type { Language } from "@/lib/auth";
import {
  formatPostDate,
  postAvatarInitial,
  postCategoryLabel,
  postLanguageLabel,
  type PublicPost,
} from "@/lib/posts";

type Props = {
  post: PublicPost;
  comments: PublicComment[];
  commentsUnavailable: boolean;
  language: Language;
  authenticated: boolean;
  currentUsername?: string;
  currentDisplayName?: string;
  canDelete: boolean;
};

export function PostDetailClient({
  post,
  comments,
  commentsUnavailable,
  language,
  authenticated,
  currentUsername,
  currentDisplayName,
  canDelete,
}: Props) {
  const [activeLanguage, setActiveLanguage] = useState(language);
  const korean = activeLanguage === "KR";
  const author = post.author;
  if (!author) return null;

  return (
    <main>
      <Header language={activeLanguage} onLanguageChange={setActiveLanguage} authenticated={authenticated} username={currentUsername} displayName={currentDisplayName} />
      <section className="shell post-detail-page">
        <article className="post-detail-card">
          <div className="post-detail-author">
            <div className="avatar coral" aria-hidden="true">{postAvatarInitial(author)}</div>
            <div>
              <a href={`/u/${encodeURIComponent(author.username)}?lang=${activeLanguage}`}>{author.display_name || author.username}</a>
              <p>@{author.username} · {formatPostDate(post.created_at, activeLanguage)}</p>
            </div>
          </div>
          <p className="post-language">{postCategoryLabel(post.category, activeLanguage)} · {postLanguageLabel(post.language, activeLanguage)}</p>
          <h1>{post.title}</h1>
          <p className="post-detail-content">{post.content}</p>
          {canDelete && <DeletePostControl postId={post.id} language={activeLanguage} korean={korean} />}
        </article>

        <section id="comments" className="comments-section" aria-label={korean ? "댓글" : "评论"}>
          <h2>{commentCountLabel(comments.length, activeLanguage)}</h2>
          {authenticated ? (
            <CommentComposer postId={post.id} language={activeLanguage} korean={korean} />
          ) : (
            <div className="comment-signin">
              <p>{korean ? "로그인 후 댓글을 작성할 수 있습니다" : "登录后参与评论"}</p>
              <a className="button secondary" href={`/auth/login?lang=${activeLanguage}&returnTo=/posts/${encodeURIComponent(post.id)}`}>{korean ? "로그인" : "登录"}</a>
            </div>
          )}
          {commentsUnavailable ? (
            <p className="comments-message">{korean ? "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : "暂时无法加载评论，请稍后再试。"}</p>
          ) : comments.length === 0 ? (
            <p className="comments-message">{korean ? "아직 댓글이 없습니다. 첫 댓글을 남겨 보세요." : "还没有评论，来留下第一条吧。"}</p>
          ) : (
            <div className="comment-list">
              {comments.map((comment) => <CommentCard key={comment.id} comment={comment} language={activeLanguage} />)}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function CommentComposer({ postId, language, korean }: { postId: string; language: Language; korean: boolean }) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const disabled = pending || content.trim().length === 0;
  return (
    <form className="comment-composer" action={createComment} onSubmit={() => setPending(true)}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="language" value={language} />
      <label htmlFor="comment-content">{korean ? "댓글 작성" : "发表评论"}</label>
      <textarea id="comment-content" name="content" value={content} onChange={(event) => setContent(event.target.value)} placeholder={korean ? "댓글을 입력해 주세요" : "写下你的评论"} maxLength={1000} required />
      <div className="comment-composer-bottom"><span>{korean ? "최대 1000자" : "最多 1000 字"}</span><button type="submit" className="button primary" disabled={disabled}>{pending ? (korean ? "등록 중" : "发布中") : (korean ? "댓글 등록" : "发布评论")}</button></div>
    </form>
  );
}

function CommentCard({ comment, language }: { comment: PublicComment; language: Language }) {
  const [confirming, setConfirming] = useState(false);
  const korean = language === "KR";
  return (
    <article className="comment-card">
      <div className="avatar blue" aria-hidden="true">{commentAvatarInitial(comment.author)}</div>
      <div className="comment-main">
        <div className="comment-meta"><a href={`/u/${encodeURIComponent(comment.author.username)}?lang=${language}`}>{comment.author.displayName || comment.author.username}</a><span>@{comment.author.username}</span><span>·</span><time>{formatPostDate(comment.createdAt, language)}</time></div>
        <p>{comment.content}</p>
        {comment.canDelete && (
          confirming ? (
            <section className="delete-confirmation" aria-live="polite"><p>{korean ? "이 댓글을 삭제할까요? 삭제 후에는 복구할 수 없습니다." : "确定删除这条评论吗？删除后无法恢复。"}</p><div><button type="button" className="button secondary" onClick={() => setConfirming(false)}>{korean ? "취소" : "取消"}</button><form action={deleteComment}><input type="hidden" name="commentId" value={comment.id} /><input type="hidden" name="postId" value={comment.postId} /><input type="hidden" name="language" value={language} /><button type="submit" className="delete-post">{korean ? "삭제 확인" : "确认删除"}</button></form></div></section>
          ) : <button type="button" className="comment-delete" onClick={() => setConfirming(true)}>{korean ? "댓글 삭제" : "删除评论"}</button>
        )}
      </div>
    </article>
  );
}

function DeletePostControl({ postId, language, korean }: { postId: string; language: Language; korean: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" className="delete-post" onClick={() => setConfirming(true)}>{korean ? "게시글 삭제" : "删除帖子"}</button>;
  return <section className="delete-confirmation" aria-live="polite"><p>{korean ? "이 게시글을 정말 삭제할까요? 이 작업은 되돌릴 수 없습니다." : "确定删除这篇帖子吗？此操作无法撤销。"}</p><div><button type="button" className="button secondary" onClick={() => setConfirming(false)}>{korean ? "취소" : "取消"}</button><form action={deletePost}><input type="hidden" name="postId" value={postId} /><input type="hidden" name="language" value={language} /><button type="submit" className="delete-post">{korean ? "삭제 확인" : "确认删除"}</button></form></div></section>;
}
