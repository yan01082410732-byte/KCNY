"use client";

import { useFormStatus } from "react-dom";
import { followUserAction, unfollowUserAction } from "@/app/follows/actions";
import type { Language } from "@/lib/auth";
import { followLabels } from "@/lib/user-follows";

function Submit({ following, language }: { following: boolean; language: Language }) {
  const { pending } = useFormStatus();
  const labels = followLabels(language);
  const text = pending ? labels.pending : following ? labels.following : labels.follow;
  return <button type="submit" className={`follow-button${following ? " following" : ""}`} aria-pressed={following} aria-label={following ? labels.unfollow : labels.follow} disabled={pending}>{text}</button>;
}

export function FollowButton({ targetUsername, language, following, authenticated }: { targetUsername: string; language: Language; following: boolean; authenticated: boolean }) {
  const labels = followLabels(language);
  const returnTo = `/u/${encodeURIComponent(targetUsername)}?lang=${language}`;
  return <div className="follow-control"><form action={following ? unfollowUserAction : followUserAction}><input type="hidden" name="targetUsername" value={targetUsername} /><input type="hidden" name="language" value={language} /><input type="hidden" name="returnTo" value={returnTo} /><Submit following={following} language={language} /></form>{!authenticated && <p>{labels.signIn}</p>}</div>;
}
