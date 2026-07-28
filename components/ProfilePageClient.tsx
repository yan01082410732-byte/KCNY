"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import type { Language } from "@/lib/auth";
import { profileAvatarInitial, type PublicProfile } from "@/lib/profile";

export function ProfilePageClient({ profile, initialLanguage, authenticated, currentUsername, currentDisplayName }: { profile: PublicProfile; initialLanguage: Language; authenticated: boolean; currentUsername?: string; currentDisplayName?: string }) {
  const [language, setLanguage] = useState(initialLanguage);
  const korean = language === "KR";
  const month = new Intl.DateTimeFormat(korean ? "ko-KR" : "zh-CN", { year: "numeric", month: "long" }).format(new Date(profile.created_at));

  return <main>
    <Header language={language} onLanguageChange={setLanguage} authenticated={authenticated} username={currentUsername} displayName={currentDisplayName} />
    <section className="shell profile-page">
      <article className="profile-card">
        <div className="profile-avatar" aria-hidden="true">{profileAvatarInitial(profile)}</div>
        <div className="profile-heading"><h1>{profile.display_name || profile.username}</h1><p>@{profile.username}</p></div>
        <dl className="profile-details">
          <div><dt>{korean ? "소개" : "简介"}</dt><dd>{profile.bio || (korean ? "아직 자기소개가 없습니다." : "这位用户暂时还没有留下简介。")}</dd></div>
          <div><dt>{korean ? "선호 언어" : "首选语言"}</dt><dd>{profile.preferred_language === "KR" ? "한국어" : "中文"}</dd></div>
          <div><dt>{korean ? "가입" : "注册时间"}</dt><dd>{month}</dd></div>
        </dl>
      </article>
      <section className="profile-empty"><h2>{korean ? "아직 게시물이 없습니다" : "暂时还没有发布帖子"}</h2><p>{korean ? "첫 번째 이야기를 공유할 수 있도록 준비하고 있습니다." : "我们正在准备让大家分享第一条故事的功能。"}</p></section>
    </section>
  </main>;
}
