"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommentSubmitState } from "@/app/posts/[id]/comment-actions";
import type { Language } from "@/lib/auth";
import { canSubmitCommentDraft, commentDraftKey, commentErrorMessage } from "@/lib/comments";

type Props = {
  postId: string;
  parentCommentId?: string;
  viewerId: string;
  language: Language;
  submitAction: (previous: CommentSubmitState, formData: FormData) => Promise<CommentSubmitState>;
  onCancel?: () => void;
};

export function CommentDraftForm({ postId, parentCommentId, viewerId, language, submitAction, onCancel }: Props) {
  const router = useRouter();
  const korean = language === "KR";
  const reply = Boolean(parentCommentId);
  const key = commentDraftKey(viewerId, postId, parentCommentId);
  const [content, setContent] = useState("");
  const [state, action, pending] = useActionState<CommentSubmitState, FormData>(submitAction, { status: "idle" });
  const submitting = useRef(false);
  const handledResult = useRef<CommentSubmitState | null>(null);

  useEffect(() => {
    try { setContent(sessionStorage.getItem(key)?.slice(0, 1000) ?? ""); } catch { /* Storage may be disabled. The mounted draft still works. */ }
  }, [key]);

  useEffect(() => {
    if (state.status === "idle" || handledResult.current === state) return;
    handledResult.current = state;
    submitting.current = false;
    if (state.status === "success") {
      try { sessionStorage.removeItem(key); } catch { /* No persistent draft to clear. */ }
      setContent("");
      router.refresh();
      onCancel?.();
    }
  }, [state, key, router, onCancel]);

  function updateContent(value: string) {
    setContent(value);
    try {
      if (value) sessionStorage.setItem(key, value.slice(0, 1000));
      else sessionStorage.removeItem(key);
    } catch { /* Keep the in-memory draft. */ }
  }

  const errorMessage = state.status === "error" ? commentErrorMessage(state.reason, language) : undefined;
  const fieldId = parentCommentId ? `reply-${parentCommentId}` : "comment-content";
  return <form className={reply ? "reply-composer" : "comment-composer"} action={action} onSubmit={(event) => {
    if (!canSubmitCommentDraft(content, pending, submitting.current)) event.preventDefault();
    else submitting.current = true;
  }}>
    <input type="hidden" name="postId" value={postId} />
    {parentCommentId && <input type="hidden" name="parentCommentId" value={parentCommentId} />}
    <input type="hidden" name="language" value={language} />
    <label htmlFor={fieldId}>{reply ? (korean ? "답글 작성" : "发表回复") : (korean ? "댓글 작성" : "发表评论")}</label>
    <textarea id={fieldId} name="content" value={content} onChange={(event) => updateContent(event.target.value)} placeholder={reply ? (korean ? "답글을 입력해 주세요." : "写下你的回复…") : (korean ? "댓글을 입력해 주세요." : "写下你的评论…")} maxLength={1000} required />
    {errorMessage && <p className="comments-message" role="alert">{errorMessage} {state.reason === "auth_required" && <a href={`/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/posts/${postId}`)}`}>{korean ? "로그인" : "登录"}</a>}</p>}
    <div className="comment-composer-bottom"><span>{korean ? "최대 1000자" : "最多 1000 字"}</span><div className="reply-buttons">
      {onCancel && <button type="button" className="button secondary" onClick={onCancel} disabled={pending}>{korean ? "취소" : "取消"}</button>}
      <button type="submit" className="button primary" disabled={!canSubmitCommentDraft(content, pending, false)} aria-busy={pending}>{pending ? (korean ? "등록 중…" : "发布中…") : reply ? (korean ? "답글 작성" : "发表回复") : (korean ? "댓글 등록" : "发布评论")}</button>
    </div></div>
  </form>;
}
