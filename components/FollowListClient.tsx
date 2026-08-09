"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import type { Language } from "@/lib/auth";
import { profileAvatarInitial } from "@/lib/profile";
import { followLabels, type PublicFollowProfile } from "@/lib/user-follows";

export function FollowListClient({ profiles, initialLanguage, title, empty, username, displayName, authenticated }: { profiles: PublicFollowProfile[]; initialLanguage: Language; title: "followers" | "following"; empty: boolean; username?: string; displayName?: string; authenticated: boolean }) {
  const [language, setLanguage] = useState(initialLanguage);
  const labels = followLabels(language);
  const heading = title === "followers" ? labels.followers : labels.following;
  const emptyText = title === "followers" ? labels.noFollowers : labels.noFollowing;
  return <main><Header language={language} onLanguageChange={setLanguage} authenticated={authenticated} username={username} displayName={displayName} /><section className="shell follow-list-page"><h1>{heading}</h1>{empty ? <div className="profile-empty"><p>{emptyText}</p></div> : <div className="follow-list">{profiles.map((profile) => <a className="follow-list-card" key={profile.username} href={`/u/${encodeURIComponent(profile.username)}?lang=${language}`}><span className="profile-avatar small" aria-hidden="true">{profileAvatarInitial(profile)}</span><span><strong>{profile.display_name || profile.username}</strong><small>@{profile.username}</small></span></a>)}</div>}</section></main>;
}
