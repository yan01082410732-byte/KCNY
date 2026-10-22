import type { Language } from "@/lib/auth";
import { isPostCategory, type PostCategory } from "@/lib/posts";

export type PostDraft = { title: string; content: string; category: PostCategory; language: Language };

export function postDraftKey(userId: string, postId?: string) {
  return `kcny:post-draft:v1:${userId}:${postId ?? "new"}`;
}

export function parsePostDraft(value: string | null): PostDraft | null {
  if (!value) return null;
  try {
    const draft: unknown = JSON.parse(value);
    if (!draft || typeof draft !== "object") return null;
    const record = draft as Record<string, unknown>;
    if (typeof record.title !== "string" || record.title.length > 120 || typeof record.content !== "string" || record.content.length > 5000 || !isPostCategory(record.category) || (record.language !== "CN" && record.language !== "KR")) return null;
    return { title: record.title, content: record.content, category: record.category, language: record.language };
  } catch { return null; }
}
