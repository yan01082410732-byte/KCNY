"use client";
import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/auth";
import { mediaErrorMessage, mediaFileError } from "@/lib/post-media-policy";
import { invalidatePostImage, mediaFailureCode, requestMedia, uploadPostImage } from "@/lib/post-media-client";
import { PostImage } from "@/components/PostImage";

export function ImageSelection({ language, file, onChange, disabled }: { language: Language; file: File | null; onChange: (file: File | null) => void; disabled: boolean }) {
  const [preview, setPreview] = useState(""), [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  return <fieldset className="post-image-picker" disabled={disabled}>
    <legend>{language === "KR" ? "이미지 한 장 (선택)" : "单张图片（可选）"}</legend>
    <label htmlFor="post-image-file">{language === "KR" ? "JPEG / PNG / WebP, 최대 5 MiB" : "JPEG / PNG / WebP，最大 5 MiB"}</label>
    {/* Intentionally no name: the 5 MiB file must NEVER enter a Server Action form body. */}
    <input ref={input} id="post-image-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
      const next = event.target.files?.[0] ?? null, invalid = next ? mediaFileError(next.size, next.type) : null;
      setError(invalid ? mediaErrorMessage(invalid, language) : ""); onChange(invalid ? null : next);
      if (invalid && input.current) input.current.value = "";
    }} />
    {preview && <img className="post-image-preview" src={preview} alt={language === "KR" ? "업로드 전 미리보기" : "上传前预览"} />}
    {file && <button type="button" className="button secondary" onClick={() => { onChange(null); setError(""); if (input.current) input.current.value = ""; }}>{language === "KR" ? "선택 취소" : "取消选择"}</button>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    <p className="field-help">{language === "KR" ? "정지 이미지 최대 4백만 픽셀. 위치·EXIF 정보는 제거됩니다. 기존 이미지는 교체 성공 전까지 유지됩니다." : "仅静态图片，最多 419 万像素。会移除位置与 EXIF 信息；替换成功前保留旧图。"}</p>
  </fieldset>;
}
export function PostImageManager({ postId, language, onBusyChange }: { postId: string; language: Language; onBusyChange: (busy: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null), [status, setStatus] = useState<{ version: number; imageId: string | null } | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [failed, setFailed] = useState(false);
  const requestId = useRef(""), lock = useRef(false);
  useEffect(() => { let cancelled = false; requestMedia({ operation: "status", postId }).then(data => { if (!cancelled) setStatus(data); }).catch(() => { if (!cancelled) { setFailed(true); setMessage(mediaErrorMessage("network_failed", language)); } }); return () => { cancelled = true; }; }, [postId, language]);
  async function act(operation: "upload" | "remove" | "cleanup") {
    if (lock.current) return; lock.current = true; setBusy(true); onBusyChange(true); setFailed(false); setMessage("");
    try {
      const current = status ?? await requestMedia({ operation: "status", postId });
      if (operation === "cleanup") {
        const result = await requestMedia({ operation: "cleanup" });
        if (result.failed) throw Error("cleanup_failed");
        setMessage(language === "KR" ? "정리 대기 항목을 확인했습니다. 만료 전 원본은 비공개로 보관됩니다." : "已检查待清理对象；未过期原件仍私有保留。");
      } else {
        const result = operation === "remove" ? await requestMedia({ operation: "remove", postId, requestId: crypto.randomUUID(), expectedVersion: current.version }) : file ? await uploadPostImage(postId, file, current.version, requestId.current || (requestId.current = crypto.randomUUID()), stage => setMessage(stage === "uploading" ? language === "KR" ? "업로드 중…" : "正在上传…" : language === "KR" ? "서버에서 검증 중…" : "服务端正在校验…")) : null;
        if (!result) return;
        setStatus(result); setFile(null); requestId.current = ""; invalidatePostImage(postId);
        setMessage(language === "KR" ? "이미지 변경을 저장했습니다." : "图片变更已保存。");
      }
    } catch (error) {
      const code = mediaFailureCode(error); setFailed(true); setMessage(mediaErrorMessage(code, language));
      if (/^(image_|file_)/.test(code)) requestId.current = "";
      try { setStatus(await requestMedia({ operation: "status", postId })); } catch { /* Keep the last confirmed image. */ }
    } finally { lock.current = false; setBusy(false); onBusyChange(false); }
  }
  return <section className="post-image-management" aria-label={language === "KR" ? "게시글 이미지 관리" : "帖子图片管理"}>
    <PostImage postId={postId} language={language} detail />
    <ImageSelection language={language} file={file} onChange={next => { setFile(next); requestId.current = ""; }} disabled={busy} />
    <div className="post-image-buttons"><button type="button" className="button secondary" disabled={busy || !file} onClick={() => void act("upload")}>{language === "KR" ? "이미지 업로드 / 다시 시도" : "上传图片／重试"}</button><button type="button" className="button secondary" disabled={busy || !status?.imageId} onClick={() => void act("remove")}>{language === "KR" ? "현재 이미지 제거" : "移除当前图片"}</button><button type="button" className="button secondary" disabled={busy} onClick={() => void act("cleanup")}>{language === "KR" ? "정리 다시 시도" : "重试清理"}</button></div>
    {message && <p role={failed ? "alert" : "status"} className={failed ? "auth-error" : "auth-notice"}>{message}</p>}
  </section>;
}
