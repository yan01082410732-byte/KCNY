"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createComment, createCommentReply, deleteComment } from "@/app/posts/[id]/comment-actions";
import { deletePost } from "@/app/posts/actions";
import { Header } from "@/components/Header";
import { LikeButton } from "@/components/LikeButton";
import { BookmarkButton } from "@/components/BookmarkButton";
import { CommentDraftForm } from "@/components/CommentDraftForm";
import { commentAvatarInitial, commentCountLabel, commentErrorMessage, replyTargetUsername, type CommentThread, type PublicComment } from "@/lib/comments";
import type { Language } from "@/lib/auth";
import { commentPageHref } from "@/lib/comment-pagination";
import { formatPostDate, postAvatarInitial, postCategoryLabel, postLanguageLabel, type PublicPost } from "@/lib/posts";
import { postDraftKey } from "@/lib/post-drafts";
import { postLikeErrorMessage } from "@/lib/post-likes";
import { reportHref } from "@/lib/reporting";

type Props = { post: PublicPost; commentThreads: CommentThread[]; commentCount: number; commentsUnavailable: boolean; likesUnavailable?: boolean; commentError?: string; postError?: string; likeError?: string; completedDraft?: "create" | "edit"; focusedCommentId?: string; nextCommentCursor?: string; currentCommentCursor?: string; language: Language; authenticated: boolean; currentUserId?: string; currentUsername?: string; currentDisplayName?: string; canEdit: boolean; canDelete: boolean; };

export function PostDetailClient({ post, commentThreads, commentCount, commentsUnavailable, likesUnavailable, commentError, postError, likeError, completedDraft, focusedCommentId, nextCommentCursor, currentCommentCursor, language, authenticated, currentUserId, currentUsername, currentDisplayName, canEdit, canDelete }: Props) {
  const [activeLanguage, setActiveLanguage] = useState(language);
  useEffect(() => { if (completedDraft && currentUserId) { try { sessionStorage.removeItem(postDraftKey(currentUserId, completedDraft === "edit" ? post.id : undefined)); } catch { /* Storage may be unavailable. */ } } }, [completedDraft, currentUserId, post.id]);
  const korean = activeLanguage === "KR";
  const errorMessage = commentErrorMessage(commentError, activeLanguage);
  const author = post.author;
  if (!author) return null;
  return <main>
    <Header language={activeLanguage} onLanguageChange={setActiveLanguage} languageHref={(nextLanguage) => commentPageHref(post.id, nextLanguage, currentCommentCursor, focusedCommentId)} authenticated={authenticated} username={currentUsername} displayName={currentDisplayName} />
    <section className="shell post-detail-page">
      {completedDraft && <p className="auth-notice" role="status">{completedDraft === "create" ? korean ? "게시글을 게시했습니다." : "帖子已发布。" : korean ? "수정 내용을 저장했습니다." : "修改已保存。"}</p>}
      {postError && <p className="auth-error" role="alert">{korean ? "게시글을 삭제하지 못했습니다. 다시 시도해 주세요." : "删除帖子失败，请重试。"}</p>}
      {postLikeErrorMessage(likeError, activeLanguage) && <p className="auth-error" role="alert">{postLikeErrorMessage(likeError, activeLanguage)}</p>}
      <article className="post-detail-card">
        <div className="post-detail-author"><div className="avatar coral" aria-hidden="true">{postAvatarInitial(author)}</div><div><a href={`/u/${encodeURIComponent(author.username)}?lang=${activeLanguage}`}>{author.display_name || author.username}</a><p>@{author.username} · {formatPostDate(post.created_at, activeLanguage)}</p></div></div>
        <p className="post-language">{postCategoryLabel(post.category, activeLanguage)} · {postLanguageLabel(post.language, activeLanguage)}</p>
        <h1>{post.title}</h1><p className="post-detail-content">{post.content}</p>
        <div className="post-detail-actions"><LikeButton postId={post.id} likeCount={post.likeCount} liked={post.likedByCurrentUser} language={activeLanguage} returnTo={commentPageHref(post.id, activeLanguage, currentCommentCursor)} authenticated={authenticated} unavailable={likesUnavailable} /><BookmarkButton postId={post.id} bookmarked={post.bookmarkedByCurrentUser} language={activeLanguage} returnTo={commentPageHref(post.id, activeLanguage, currentCommentCursor)} authenticated={authenticated} /><a className="report-link" href={reportHref("post", post.id, activeLanguage)}>{korean ? "게시글 신고" : "举报帖子"}</a></div>
        {(canEdit || canDelete) && <div className="post-owner-actions">{canEdit && <a className="button secondary" href={`/posts/${encodeURIComponent(post.id)}/edit?lang=${activeLanguage}`}>{korean ? "게시글 수정" : "编辑帖子"}</a>}{canDelete && <DeletePostControl postId={post.id} language={activeLanguage} korean={korean} />}</div>}
      </article>
      <section id="comments" className="comments-section" aria-label={korean ? "댓글" : "评论"}>
        <h2>{commentsUnavailable ? (korean ? "댓글" : "评论") : commentCountLabel(commentCount, activeLanguage)}</h2>
        {errorMessage && <p className="comments-message" role="alert">{errorMessage}</p>}
        {authenticated && currentUserId ? <CommentDraftForm postId={post.id} viewerId={currentUserId} language={activeLanguage} submitAction={createComment} /> : <SignInToComment postId={post.id} language={activeLanguage} korean={korean} />}
        {commentsUnavailable ? <p className="comments-message">{korean ? "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : "暂时无法加载评论，请稍后再试。"}</p> : commentCount === 0 ? <p className="comments-message">{korean ? "아직 댓글이 없습니다. 첫 댓글을 남겨 보세요." : "还没有评论，来留下第一条吧。"}</p> : <div className="comment-list">{commentThreads.map((thread) => <CommentThreadCard key={thread.comment.id} thread={thread} language={activeLanguage} authenticated={authenticated} viewerId={currentUserId} />)}</div>}
        {!commentsUnavailable && <nav className="comment-pagination" aria-label={korean ? "댓글 페이지" : "评论分页"}>
          {(currentCommentCursor || focusedCommentId) && <><p>{korean ? "앞 페이지의 원 댓글은 답글 문맥을 위해 표시됩니다." : "此前页面的父评论仅作为回复上下文展示。"}</p><a className="button secondary" href={commentPageHref(post.id, activeLanguage)}>{korean ? "처음으로" : "返回首批评论"}</a></>}
          {nextCommentCursor && <a className="button secondary" href={commentPageHref(post.id, activeLanguage, nextCommentCursor)}>{korean ? "다음 댓글" : "继续查看评论"}</a>}
        </nav>}
      </section>
    </section>
  </main>;
}

function SignInToComment({ postId, language, korean }: { postId: string; language: Language; korean: boolean }) { return <div className="comment-signin"><p>{korean ? "로그인 후 댓글을 작성할 수 있습니다. 답글도 작성할 수 있습니다." : "登录后参与评论。也可以发表回复。"}</p><a className="button secondary" href={`/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/posts/${postId}`)}`}>{korean ? "로그인" : "登录"}</a></div>; }
function CommentThreadCard({ thread, language, authenticated, viewerId }: { thread: CommentThread; language: Language; authenticated: boolean; viewerId?: string }) { const [replying, setReplying] = useState(false); const korean = language === "KR"; const replyTarget = replyTargetUsername(thread.comment); return <article className="comment-thread"><CommentCard comment={thread.comment} language={language} replyCount={thread.replies.length} /><div className="comment-actions">{authenticated && viewerId ? <button type="button" className="comment-reply-trigger" onClick={() => setReplying((value) => !value)} aria-expanded={replying}>{korean ? "답글" : "回复"}</button> : <a className="comment-reply-trigger" href={`/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/posts/${thread.comment.postId}`)}`}>{korean ? "답글" : "回复"}</a>}</div>{replying && viewerId && <CommentDraftForm postId={thread.comment.postId} parentCommentId={thread.comment.id} viewerId={viewerId} language={language} submitAction={createCommentReply} onCancel={() => setReplying(false)} />}{thread.replies.length > 0 ? <div className="comment-replies">{thread.replies.map((reply) => <CommentCard key={reply.id} comment={reply} language={language} reply replyTargetUsername={replyTarget} />)}</div> : <p className="no-replies">{korean ? "이 페이지에는 답글이 없습니다." : "此批评论中暂无回复。"}</p>}</article>; }
function CommentCard({ comment, language, replyCount, reply = false, replyTargetUsername }: { comment: PublicComment; language: Language; replyCount?: number; reply?: boolean; replyTargetUsername?: string }) {
  const [confirming, setConfirming] = useState(false);
  const korean = language === "KR";
  const deleteLabel = reply ? (korean ? "답글 삭제" : "删除回复") : (korean ? "댓글 삭제" : "删除评论");
  const deletePrompt = reply ? (korean ? "이 답글을 삭제하시겠습니까?" : "确定删除这条回复吗？") : (korean ? "이 댓글을 삭제하시겠습니까?" : "确定删除这条评论吗？");
  return <article id={`comment-${comment.id}`} className={`comment-card${reply ? " comment-reply" : ""}`}>
    <div className="avatar blue" aria-hidden="true">{commentAvatarInitial(comment.author)}</div>
    <div className="comment-main">
      <div className="comment-meta"><a href={`/u/${encodeURIComponent(comment.author.username)}?lang=${language}`}>{comment.author.displayName || comment.author.username}</a><span>@{comment.author.username}</span><span>·</span><time>{formatPostDate(comment.createdAt, language)}</time></div>
      {reply && replyTargetUsername ? <p className="replying-to">{korean ? `@${replyTargetUsername}님에게 답글` : `回复 @${replyTargetUsername}`}</p> : null}
      <p>{comment.content}</p>
      <a className="report-link" href={reportHref(reply ? "reply" : "comment", comment.id, language)}>{reply ? korean ? "답글 신고" : "举报回复" : korean ? "댓글 신고" : "举报评论"}</a>
      {comment.canDelete && (confirming ? <section className="delete-confirmation" aria-live="polite"><p>{deletePrompt}{!reply ? ` ${korean ? "이 댓글을 삭제하면 아래 답글도 함께 삭제됩니다." : "删除这条评论也会删除它下面的回复。"}` : ""}</p><div><button type="button" className="button secondary" onClick={() => setConfirming(false)}>{korean ? "취소" : "取消"}</button><form action={deleteComment}><input type="hidden" name="commentId" value={comment.id} /><input type="hidden" name="postId" value={comment.postId} /><input type="hidden" name="language" value={language} /><button type="submit" className="delete-post">{korean ? "삭제 확인" : "确认删除"}</button></form></div></section> : <button type="button" className="comment-delete" onClick={() => setConfirming(true)}>{deleteLabel}</button>)}
    </div>
  </article>;
}
function DeletePostControl({ postId, language, korean }: { postId: string; language: Language; korean: boolean }) { const [confirming, setConfirming] = useState(false); if (!confirming) return <button type="button" className="delete-post" onClick={() => setConfirming(true)}>{korean ? "게시글 삭제" : "删除帖子"}</button>; return <section className="delete-confirmation" aria-live="polite"><p>{korean ? "이 게시글을 삭제하면 댓글과 관련 반응도 함께 삭제됩니다. 되돌릴 수 없습니다." : "删除帖子会一并删除评论及相关互动，且无法恢复。"}</p><div><button type="button" className="button secondary" onClick={() => setConfirming(false)}>{korean ? "취소" : "取消"}</button><form action={deletePost}><input type="hidden" name="postId" value={postId} /><input type="hidden" name="language" value={language} /><DeletePostSubmitButton korean={korean} /></form></div></section>; }
function DeletePostSubmitButton({ korean }: { korean: boolean }) { const { pending } = useFormStatus(); return <button type="submit" className="delete-post" disabled={pending}>{pending ? korean ? "삭제 중…" : "删除中…" : korean ? "삭제 확인" : "确认删除"}</button>; }
