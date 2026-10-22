"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import type { Language } from "@/lib/auth";
import { profileAvatarInitial } from "@/lib/profile";
import { followLabels, followListHref, type PublicFollowProfile } from "@/lib/user-follows";

type Props = { profiles: PublicFollowProfile[]; initialLanguage: Language; title: "followers" | "following"; empty: boolean; unavailable?: boolean; profileUsername: string; username?: string; displayName?: string; authenticated: boolean; before?: string; nextCursor?: string };

export function FollowListClient({ profiles, initialLanguage, title, empty, unavailable, profileUsername, username, displayName, authenticated, before, nextCursor }: Props) {
  const [language, setLanguage] = useState(initialLanguage);
  const labels = followLabels(language);
  const heading = title === "followers" ? labels.followers : labels.following;
  const emptyText = title === "followers" ? labels.noFollowers : labels.noFollowing;
  const href = followListHref(profileUsername, title, language, before);
  return <main><Header language={language} onLanguageChange={setLanguage} authenticated={authenticated} username={username} displayName={displayName} />
    <section className="shell follow-list-page"><h1>{heading}</h1>
      {unavailable ? <div className="profile-empty" role="alert"><p>{language === "KR" ? "목록을 불러오지 못했습니다." : "无法加载列表。"}</p><a className="button secondary" href={href}>{language === "KR" ? "다시 시도" : "重试"}</a></div> : empty ? <div className="profile-empty"><p>{before ? (language === "KR" ? "더 이상 사용자가 없습니다." : "没有更多用户。") : emptyText}</p></div> : <div className="follow-list">{profiles.map((profile) => <a className="follow-list-card" key={profile.username} href={`/u/${encodeURIComponent(profile.username)}?lang=${language}`}><span className="profile-avatar small" aria-hidden="true">{profileAvatarInitial(profile)}</span><span><strong>{profile.display_name || profile.username}</strong><small>@{profile.username}</small></span></a>)}</div>}
      {!unavailable && <nav className="community-pagination" aria-label={language === "KR" ? "관계 목록 페이지" : "关系列表分页"}>{before && <a className="button secondary" href={followListHref(profileUsername, title, language)}>{language === "KR" ? "처음으로" : "返回首批"}</a>}{nextCursor && <a className="button secondary" href={followListHref(profileUsername, title, language, nextCursor)}>{language === "KR" ? "더 보기" : "查看更多"}</a>}</nav>}
    </section>
  </main>;
}
