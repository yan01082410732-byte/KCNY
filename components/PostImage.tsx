"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Language } from "@/lib/auth";

type ImageValue = { url: string; width: number; height: number } | null;
const Available = createContext(false);
const cache = new Map<string, { value: ImageValue; until: number }>();
const generations = new Map<string, number>();
const pending = new Map<string, Promise<ImageValue>>();
const queue = new Map<string, { resolve: (value: ImageValue) => void; reject: () => void; generation: number }[]>();
let scheduled = false;
async function flush() {
  scheduled = false;
  const entries = [...queue.entries()]; queue.clear();
  for (let start = 0; start < entries.length; start += 20) {
    const batch = entries.slice(start, start + 20);
    try {
      const response = await fetch(`/api/post-media?ids=${batch.map(([id]) => id).join(",")}`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw Error("media_read_failed");
      const data = await response.json();
      for (const [id, callbacks] of batch) {
        const value = data.images.find((image: { postId: string }) => image.postId === id) ?? null;
        if (callbacks[0].generation === (generations.get(id) ?? 0)) cache.set(id, { value, until: Date.now() + 45000 });
        callbacks.forEach(callback => callback.resolve(value));
      }
    } catch { for (const [, callbacks] of batch) callbacks.forEach(callback => callback.reject()); }
  }
}
function loadImage(id: string) {
  const hit = cache.get(id); if (hit && hit.until > Date.now()) return Promise.resolve(hit.value);
  const active = pending.get(id); if (active) return active;
  const promise = new Promise<ImageValue>((resolve, reject) => {
    const items = queue.get(id) ?? []; items.push({ resolve, reject, generation: generations.get(id) ?? 0 }); queue.set(id, items);
    if (!scheduled) { scheduled = true; setTimeout(() => void flush(), 0); }
  });
  pending.set(id, promise);
  const clear = () => { if (pending.get(id) === promise) pending.delete(id); };
  promise.then(clear, clear); return promise;
}
function invalidate(id: string) { cache.delete(id); pending.delete(id); generations.set(id, (generations.get(id) ?? 0) + 1); }
export function PostMediaProvider({ available, children }: { available: boolean; children: React.ReactNode }) {
  return <Available.Provider value={available}>{children}</Available.Provider>;
}
export function PostImage({ postId, language, detail = false }: { postId: string; language: Language; detail?: boolean }) {
  const available = useContext(Available);
  const [image, setImage] = useState<ImageValue>(null), [error, setError] = useState(false), [revision, setRevision] = useState(0);
  useEffect(() => {
    const onChange = (event: Event) => { if ((event as CustomEvent).detail === postId) { invalidate(postId); setRevision(n => n + 1); } };
    window.addEventListener("kcny-post-image", onChange); return () => window.removeEventListener("kcny-post-image", onChange);
  }, [postId]);
  useEffect(() => {
    if (!available) return;
    let cancelled = false; setError(false);
    loadImage(postId).then(value => { if (!cancelled) setImage(value); }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [available, postId, revision]);
  if (!available) return null;
  if (error) return <div className="post-image-error" role="status">{language === "KR" ? "이미지를 불러오지 못했습니다." : "图片暂时无法加载。"} <button type="button" onClick={() => { invalidate(postId); setRevision(n => n + 1); }}>{language === "KR" ? "다시 시도" : "重试"}</button></div>;
  if (!image) return null;
  return <figure className={`post-image${detail ? " post-image-detail" : ""}`}><img src={image.url} width={image.width} height={image.height} alt={language === "KR" ? "게시글 첨부 이미지" : "帖子附件图片"} loading={detail ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={() => setError(true)} /></figure>;
}
