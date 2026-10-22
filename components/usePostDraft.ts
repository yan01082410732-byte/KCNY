"use client";

import { useEffect, useState } from "react";
import { parsePostDraft, postDraftKey, type PostDraft } from "@/lib/post-drafts";

export function usePostDraft(userId: string, initial: PostDraft, postId?: string) {
  const [draft, setDraft] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  const key = postDraftKey(userId, postId);

  useEffect(() => {
    try {
      const saved = parsePostDraft(sessionStorage.getItem(key));
      if (saved) setDraft(saved);
    } catch { /* Browser storage can be unavailable. The mounted draft still works. */ }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(key, JSON.stringify(draft)); } catch { /* Keep the in-memory draft. */ }
  }, [draft, hydrated, key]);

  return { draft, setDraft };
}
