"use client";

import { useFormStatus } from "react-dom";
import { likePostAction, unlikePostAction } from "@/app/posts/like-actions";
import type { Language } from "@/lib/auth";
import { postLikeLabels } from "@/lib/post-likes";

type Props = {
  postId: string;
  likeCount: number;
  liked: boolean;
  language: Language;
  returnTo: string;
  authenticated: boolean;
};

function LikeSubmitButton({ liked, language, likeCount }: Pick<Props, "liked" | "language" | "likeCount">) {
  const { pending } = useFormStatus();
  const labels = postLikeLabels(language);
  const label = pending ? labels.pending : liked ? labels.unlike : labels.like;

  return (
    <button
      type="submit"
      className={`like-button${liked ? " liked" : ""}`}
      aria-label={label}
      aria-pressed={liked}
      disabled={pending}
    >
      <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
      <span>{label}</span>
      <span className="like-count">{likeCount}</span>
    </button>
  );
}

export function LikeButton({ postId, likeCount, liked, language, returnTo, authenticated }: Props) {
  const labels = postLikeLabels(language);
  const action = liked ? unlikePostAction : likePostAction;

  return (
    <div className="like-control">
      <form action={action}>
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="language" value={language} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <LikeSubmitButton liked={liked} language={language} likeCount={likeCount} />
      </form>
      {!authenticated && <p className="like-signin-hint">{labels.signIn}</p>}
    </div>
  );
}
