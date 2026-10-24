"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import { usePostDraft } from "@/components/usePostDraft";
import { createPost } from "@/app/posts/actions";
import type { Language } from "@/lib/auth";
import { postDraftKey } from "@/lib/post-drafts";
import { isPostCategory, validatePostInput } from "@/lib/posts";
import { mediaErrorMessage, mediaUuid } from "@/lib/post-media-policy";
import { mediaFailureCode, requestMedia, uploadPostImage } from "@/lib/post-media-client";
import { ImageSelection } from "@/components/PostImageControls";

const copy = {
  CN: { heading: "分享一段故事", titleLabel: "标题", contentLabel: "内容", categoryLabel: "分类", languageLabel: "帖子语言", titlePlaceholder: "给你的帖子起一个标题", contentPlaceholder: "写下你想分享的内容…", helper: "最多 5000 字。仅支持纯文字。", publish: "发布帖子", publishing: "正在发布…", categories: { culture: "文化交流", language: "语言学习", travel: "旅行", study: "留学生活", daily: "日常", other: "其他" } },
  KR: { heading: "이야기를 나눠 보세요", titleLabel: "제목", contentLabel: "내용", categoryLabel: "분류", languageLabel: "게시글 언어", titlePlaceholder: "게시글 제목을 입력하세요", contentPlaceholder: "나누고 싶은 이야기를 작성해 보세요…", helper: "최대 5000자이며, 일반 텍스트만 지원합니다.", publish: "글 게시", publishing: "게시 중…", categories: { culture: "문화 교류", language: "언어 학습", travel: "여행", study: "유학 생활", daily: "일상", other: "기타" } },
};

export function PostComposer({ language, viewerId, error, mediaEnabled = false }: { language: Language; viewerId: string; error?: string; mediaEnabled?: boolean }) {
  const { draft, setDraft } = usePostDraft(viewerId, { title: "", content: "", category: "culture", language });
  const [file, setFile] = useState<File | null>(null), [mediaBusy, setMediaBusy] = useState(false), [mediaMessage, setMediaMessage] = useState(""), [mediaFailed, setMediaFailed] = useState(false), [savedPostId, setSavedPostId] = useState("");
  const lock = useRef(false), creationId = useRef(""), uploadId = useRef("");
  const creationPayload = useRef<typeof draft | null>(null);
  const pendingKey = `kcny:post-image-create:${viewerId}`;
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(pendingKey); if (mediaUuid(pending)) setSavedPostId(pending);
      const original = JSON.parse(sessionStorage.getItem(pendingKey + ":request") ?? "null");
      if (mediaUuid(original?.id) && original.payload && !validatePostInput(original.payload).error && Object.keys(original.payload).sort().join(",") === "category,content,language,title") { creationId.current = original.id; creationPayload.current = original.payload; }
    } catch { /* Draft still exists in memory. */ }
  }, [pendingKey]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    try { sessionStorage.setItem(postDraftKey(viewerId), JSON.stringify(draft)); } catch { /* Keep the mounted draft. */ }
    if (!file && !savedPostId) return;
    event.preventDefault(); if (lock.current || !mediaEnabled) return;
    lock.current = true; setMediaBusy(true); setMediaFailed(false);
    setMediaMessage(language === "KR" ? "게시글 저장 중…" : "正在保存帖子…");
    try {
      const requestId = creationId.current || (creationId.current = crypto.randomUUID());
      if (!creationPayload.current) creationPayload.current = { ...draft };
      try { sessionStorage.setItem(pendingKey + ":request", JSON.stringify({ id: requestId, payload: creationPayload.current })); } catch { /* In-memory retry remains idempotent. */ }
      const result = await requestMedia({ operation: savedPostId ? "save" : "create", postId: savedPostId || undefined, requestId, payload: savedPostId ? draft : creationPayload.current });
      const postId = result.postId; if (!mediaUuid(postId)) throw Error("invalid_post");
      setSavedPostId(postId); try { sessionStorage.setItem(pendingKey, postId); } catch { /* The server request remains idempotent. */ }
      if (!savedPostId && JSON.stringify(draft) !== JSON.stringify(creationPayload.current)) await requestMedia({ operation: "save", postId, requestId, payload: draft });
      if (file) {
        const status = await requestMedia({ operation: "status", postId });
        await uploadPostImage(postId, file, status.version, uploadId.current || (uploadId.current = crypto.randomUUID()), stage => setMediaMessage(stage === "uploading" ? language === "KR" ? "비공개 저장소에 업로드 중…" : "正在直传到私有存储…" : language === "KR" ? "서버에서 이미지 검증 중…" : "服务端正在校验图片…"));
      }
      try { sessionStorage.removeItem(pendingKey); sessionStorage.removeItem(pendingKey + ":request"); } catch { /* Confirmed saved post is still accessible. */ }
      window.location.assign(`/posts/${postId}?lang=${draft.language}&published=1`);
    } catch (failure) {
      const code = mediaFailureCode(failure); setMediaFailed(true); setMediaMessage(mediaErrorMessage(code, language));
      if (/^(image_|file_)/.test(code)) uploadId.current = "";
    } finally { lock.current = false; setMediaBusy(false); }
  }
  const text = copy[language];
  const errorText = error ? language === "KR" ? "게시하지 못했습니다. 내용을 확인하고 다시 시도해 주세요. 작성 중인 글은 보관됩니다." : "发布失败，请检查内容后重试。草稿已保留。" : null;
  return <main className="auth-page post-composer-page"><section className="auth-card post-composer-card"><p className="eyebrow"><span /> KCNY</p><h1>{text.heading}</h1>{errorText && <p className="auth-error" role="alert">{errorText}</p>}<form action={createPost} onSubmit={submit}>
    <fieldset className="post-editor-fields" disabled={mediaBusy}>
    <label htmlFor="title">{text.titleLabel}<input id="title" name="title" type="text" required minLength={1} maxLength={120} autoComplete="off" placeholder={text.titlePlaceholder} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
    <label htmlFor="content">{text.contentLabel}<textarea id="content" name="content" required minLength={1} maxLength={5000} placeholder={text.contentPlaceholder} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} /></label>
    <label htmlFor="category">{text.categoryLabel}<select id="category" name="category" value={draft.category} onChange={(event) => { if (isPostCategory(event.target.value)) setDraft((current) => ({ ...current, category: event.target.value as typeof current.category })); }}>{Object.entries(text.categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label htmlFor="postLanguage">{text.languageLabel}<select id="postLanguage" value={draft.language} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value === "KR" ? "KR" : "CN" }))}><option value="CN">中文</option><option value="KR">한국어</option></select></label>
    <input type="hidden" name="language" value={draft.language} />
    </fieldset>
    <p className="field-help">{mediaEnabled ? language === "KR" ? "최대 5000자와 선택 이미지 한 장을 게시할 수 있습니다." : "最多 5000 字，可附一张图片。" : text.helper}</p>
    {mediaEnabled && <ImageSelection language={language} file={file} onChange={next => { setFile(next); uploadId.current = ""; }} disabled={mediaBusy} />}
    {mediaMessage && <p role={mediaFailed ? "alert" : "status"} className={mediaFailed ? "auth-error" : "auth-notice"}>{mediaMessage}</p>}
    {savedPostId && <p className="field-help">{language === "KR" ? "글은 이미 저장되었습니다. 이미지를 다시 시도하거나 선택을 취소하고 게시를 완료하세요." : "文字帖已保存。可重试图片，或取消选择后完成发布。"} <a href={`/posts/${savedPostId}?lang=${language}`}>{language === "KR" ? "저장된 게시글" : "查看已保存帖子"}</a></p>}
    {mediaBusy ? <button className="button primary" type="submit" disabled aria-busy="true">{text.publishing}</button> : <fieldset className="post-save-control" disabled={Boolean(savedPostId && !mediaEnabled)}><AuthSubmitButton idleText={text.publish} pendingText={text.publishing} /></fieldset>}
  </form></section></main>;
}
