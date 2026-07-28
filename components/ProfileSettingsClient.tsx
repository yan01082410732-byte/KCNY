"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import type { Language } from "@/lib/auth";
import { updateProfile } from "@/app/settings/profile/actions";

type ProfileSettings = { username: string; display_name: string | null; bio: string | null; preferred_language: Language };

export function ProfileSettingsClient({ profile, initialLanguage, notice, error }: { profile: ProfileSettings; initialLanguage: Language; notice?: string; error?: string }) {
  const [language, setLanguage] = useState(initialLanguage);
  const korean = language === "KR";
  const copy = korean ? {
    title: "프로필 편집", displayName: "표시 이름", bio: "소개", language: "선호 언어", save: "저장", saving: "저장 중…", saved: "프로필이 저장되었습니다.", empty: "자기소개는 비워 둘 수 있습니다.", limit: "최대 500자", error: "프로필을 저장하지 못했습니다. 입력 내용을 확인한 후 다시 시도해 주세요.",
  } : {
    title: "编辑资料", displayName: "显示名称", bio: "个人简介", language: "首选语言", save: "保存资料", saving: "正在保存…", saved: "资料已保存。", empty: "个人简介可以留空。", limit: "最多500字", error: "暂时无法保存资料，请检查输入后重试。",
  };

  return <main>
    <Header language={language} onLanguageChange={setLanguage} authenticated username={profile.username} displayName={profile.display_name ?? undefined} />
    <section className="auth-page profile-settings-page">
      <section className="auth-card profile-settings-card">
        <h1>{copy.title}</h1>
        {notice === "updated" && <p className="auth-notice">{copy.saved}</p>}
        {error && <p className="auth-error">{copy.error}</p>}
        <form action={updateProfile}>
          <input type="hidden" name="language" value={language} />
          <label htmlFor="displayName">{copy.displayName}<input id="displayName" name="displayName" defaultValue={profile.display_name ?? ""} autoComplete="name" maxLength={50} required /></label>
          <label htmlFor="bio">{copy.bio}<textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} aria-describedby="bio-help" /></label>
          <p id="bio-help" className="field-help">{copy.empty} {copy.limit}</p>
          <label htmlFor="preferredLanguage">{copy.language}<select id="preferredLanguage" name="preferredLanguage" defaultValue={profile.preferred_language} required><option value="CN">中文</option><option value="KR">한국어</option></select></label>
          <AuthSubmitButton idleText={copy.save} pendingText={copy.saving} />
        </form>
      </section>
    </section>
  </main>;
}
