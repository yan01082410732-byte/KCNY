"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/lib/auth";
import { canSubmitCommentDraft, commentDraftKey, commentErrorMessage } from "@/lib/comments";
import { canClearCommentDraft, canEditRejectedComment, commentRequestStorageKey, restoreCommentRequest } from "@/lib/comment-idempotency";
import type { CommentRequest, CommentSubmitState } from "@/lib/comment-idempotency";

type Props = {
  postId: string;
  parentCommentId?: string;
  viewerId: string;
  language: Language;
  submitAction: (previous: CommentSubmitState, formData: FormData) => Promise<CommentSubmitState>;
  onCancel?: () => void;
};

export function CommentDraftForm({ postId, parentCommentId, viewerId, language, submitAction, onCancel }: Props) {
  // Scope each mounted action to one account and target, including late results.
  return <ScopedCommentDraftForm key={commentDraftKey(viewerId, postId, parentCommentId)} {...{ postId, parentCommentId, viewerId, language, submitAction, onCancel }} />;
}

function ScopedCommentDraftForm({ postId, parentCommentId, viewerId, language, submitAction, onCancel }: Props) {
  const router = useRouter();
  const korean = language === "KR";
  const reply = Boolean(parentCommentId);
  const key = commentDraftKey(viewerId, postId, parentCommentId);
  const requestKey = commentRequestStorageKey(key);
  const [content, setContent] = useState("");
  const [request, setRequest] = useState<CommentRequest | null>(null);
  const requestRef = useRef<CommentRequest | null>(null);
  const [ready, setReady] = useState(false);
  const [storageFailure, setStorageFailure] = useState(false);
  const submitting = useRef(false);
  const handledResult = useRef<CommentSubmitState | null>(null);

  const [state, action, pending] = useActionState<CommentSubmitState, FormData>(async (previous, formData) => {
    let frozen = requestRef.current;
    if (!frozen) {
      frozen = { version: 1, requestId: crypto.randomUUID(), viewerId, postId, parentCommentId: parentCommentId ?? null, content };
      // Persist before sending, so a remount never silently allocates a new key.
      try {
        sessionStorage.setItem(key, frozen.content);
        sessionStorage.setItem(requestKey, JSON.stringify(frozen));
      } catch { return { status: "error", reason: "request_storage_failed" }; }
      requestRef.current = frozen;
      setRequest(frozen);
    }
    formData.set("requestId", frozen.requestId);
    formData.set("viewerId", frozen.viewerId);
    formData.set("postId", frozen.postId);
    formData.set("content", frozen.content);
    if (frozen.parentCommentId) formData.set("parentCommentId", frozen.parentCommentId);
    else formData.delete("parentCommentId");
    try { return await submitAction(previous, formData); }
    catch { return { status: "unknown", reason: "network_failed", requestId: frozen.requestId }; }
  }, { status: "idle" });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(requestKey);
      const restored = restoreCommentRequest(stored, viewerId, postId, parentCommentId);
      if (stored && !restored) setStorageFailure(true);
      requestRef.current = restored;
      setRequest(restored);
      setContent(restored?.content ?? sessionStorage.getItem(key)?.slice(0, 1000) ?? "");
    } catch { /* Editing works; persistence is checked before any insert. */ }
    setReady(true);
  }, [key, requestKey, viewerId, postId, parentCommentId]);

  useEffect(() => {
    if (state.status === "idle" || handledResult.current === state) return;
    handledResult.current = state;
    submitting.current = false;
    if (state.status === "success") {
      if (!canClearCommentDraft(requestRef.current, state, content)) return;
      try {
        // An older result must not clear a newer composer's text or request.
        if (sessionStorage.getItem(key) === requestRef.current?.content) sessionStorage.removeItem(key);
        const stored = restoreCommentRequest(sessionStorage.getItem(requestKey), viewerId, postId, parentCommentId);
        if (stored?.requestId === state.requestId) sessionStorage.removeItem(requestKey);
      } catch { /* A retained receipt can safely be checked again. */ }
      requestRef.current = null;
      setRequest(null);
      setContent("");
      router.refresh();
      onCancel?.();
    }
  }, [state, content, key, requestKey, viewerId, postId, parentCommentId, router, onCancel]);

  function updateContent(value: string) {
    if (submitting.current || (requestRef.current && !canEditRejectedComment(state))) return;
    if (requestRef.current) {
      const corrected = { ...requestRef.current, content: value };
      try { sessionStorage.setItem(requestKey, JSON.stringify(corrected)); }
      catch { setStorageFailure(true); return; }
      requestRef.current = corrected;
      setRequest(corrected);
    }
    setContent(value);
    try {
      if (value) sessionStorage.setItem(key, value.slice(0, 1000));
      else sessionStorage.removeItem(key);
    } catch { /* Keep the in-memory draft. */ }
  }

  const recovering = request !== null;
  const errorMessage = commentErrorMessage(storageFailure ? "request_storage_failed" : state.reason, language);
  const fieldId = parentCommentId ? `reply-${parentCommentId}` : "comment-content";
  return <form className={reply ? "reply-composer" : "comment-composer"} action={action} onSubmit={(event) => {
    if (!ready || storageFailure || !canSubmitCommentDraft(content, pending, submitting.current)) event.preventDefault();
    else submitting.current = true;
  }}>
    <input type="hidden" name="postId" value={postId} />
    <input type="hidden" name="viewerId" value={viewerId} />
    <input type="hidden" name="requestId" value={request?.requestId ?? ""} />
    {parentCommentId && <input type="hidden" name="parentCommentId" value={parentCommentId} />}
    <input type="hidden" name="language" value={language} />
    <label htmlFor={fieldId}>{reply ? (korean ? "답글 작성" : "发表回复") : (korean ? "댓글 작성" : "发表评论")}</label>
    <textarea id={fieldId} name="content" value={content} readOnly={(recovering && !canEditRejectedComment(state)) || pending || storageFailure} onChange={(event) => updateContent(event.target.value)} placeholder={reply ? (korean ? "답글을 입력해 주세요." : "写下你的回复…") : (korean ? "댓글을 입력해 주세요." : "写下你的评论…")} maxLength={1000} required />
    {recovering && state.status !== "deleted" && <p className="comments-message" role="status">{korean ? "결과를 확인할 때까지 원문과 요청 번호를 유지합니다. 확인하거나 같은 요청으로 재시도해 주세요." : "确认结果前会保留原文和请求编号。请核对结果，或使用同一请求安全重试。"}</p>}
    {errorMessage && <p className="comments-message" role="alert">{errorMessage} {state.reason === "auth_required" && <a href={`/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/posts/${postId}`)}`}>{korean ? "로그인" : "登录"}</a>}</p>}
    <div className="comment-composer-bottom"><span>{korean ? "최대 1000자" : "最多 1000 字"}</span><div className="reply-buttons">
      {onCancel && <button type="button" className="button secondary" onClick={onCancel} disabled={pending}>{korean ? "취소" : "取消"}</button>}
      {recovering && <button type="submit" name="intent" value="status" className="button secondary" disabled={pending || storageFailure} aria-busy={pending}>{korean ? "등록 결과 확인" : "核对提交结果"}</button>}
      <button type="submit" name="intent" value="submit" className="button primary" disabled={!ready || storageFailure || state.status === "deleted" || state.reason === "request_conflict" || !canSubmitCommentDraft(content, pending, false)} aria-busy={pending}>{pending ? (korean ? "확인 중…" : "处理中…") : recovering ? (korean ? "같은 요청 재시도" : "使用原请求重试") : reply ? (korean ? "답글 작성" : "发表回复") : (korean ? "댓글 등록" : "发布评论")}</button>
    </div></div>
  </form>;
}
