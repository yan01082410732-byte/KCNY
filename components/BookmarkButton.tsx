"use client";

import { useFormStatus } from "react-dom";
import { bookmarkPostAction, unbookmarkPostAction } from "@/app/posts/bookmark-actions";
import type { Language } from "@/lib/auth";
import { postBookmarkLabels } from "@/lib/post-bookmarks";

type Props = { postId: string; bookmarked: boolean; language: Language; returnTo: string; authenticated: boolean };

function BookmarkSubmitButton({ bookmarked, language }: Pick<Props, "bookmarked" | "language">) {
  const { pending } = useFormStatus();
  const labels = postBookmarkLabels(language);
  const label = pending ? labels.pending : bookmarked ? labels.saved : labels.bookmark;
  return <button type="submit" className={`bookmark-button${bookmarked ? " bookmarked" : ""}`} aria-label={label} aria-pressed={bookmarked} disabled={pending}>
    <span aria-hidden="true">{bookmarked ? "★" : "☆"}</span><span>{label}</span>
  </button>;
}

export function BookmarkButton({ postId, bookmarked, language, returnTo, authenticated }: Props) {
  const labels = postBookmarkLabels(language);
  return <div className="bookmark-control"><form action={bookmarked ? unbookmarkPostAction : bookmarkPostAction}>
    <input type="hidden" name="postId" value={postId} />
    <input type="hidden" name="language" value={language} />
    <input type="hidden" name="returnTo" value={returnTo} />
    <BookmarkSubmitButton bookmarked={bookmarked} language={language} />
  </form>{!authenticated && <p className="bookmark-signin-hint">{labels.signIn}</p>}</div>;
}
