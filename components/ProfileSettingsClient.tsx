"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import type { Language } from "@/lib/auth";
import { updateProfile } from "@/app/settings/profile/actions";
import { NotificationPreferences } from "@/components/NotificationPreferences";

type Profile = { username: string; display_name: string | null; bio: string | null; preferred_language: Language };
type Draft = { displayName: string; bio: string; preferredLanguage: Language };
const draftKey = (username: string) => `kcny-profile-draft:${username}`;

function readDraft(username: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(username));
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== "object") return null;
    const draft = value as Partial<Draft>;
    if (typeof draft.displayName !== "string" || typeof draft.bio !== "string" || (draft.preferredLanguage !== "CN" && draft.preferredLanguage !== "KR")) return null;
    return draft as Draft;
  } catch { return null; }
}

export function ProfileSettingsClient({ profile, initialLanguage, notice, error }: { profile: Profile; initialLanguage: Language; notice?: string; error?: string }) {
  const [draft, setDraft] = useState<Draft>({ displayName: profile.display_name ?? "", bio: profile.bio ?? "", preferredLanguage: profile.preferred_language });
  const [restored, setRestored] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (notice === "updated") {
      try { sessionStorage.removeItem(draftKey(profile.username)); } catch { /* storage may be disabled */ }
    } else {
      const previous = readDraft(profile.username);
      if (previous) { setDraft(previous); setRestored(true); }
    }
    setReady(true);
  }, [notice, profile.username]);
  useEffect(() => {
    if (!ready) return;
    if (notice === "updated" && draft.displayName === (profile.display_name ?? "") && draft.bio === (profile.bio ?? "") && draft.preferredLanguage === profile.preferred_language) return;
    try { sessionStorage.setItem(draftKey(profile.username), JSON.stringify(draft)); } catch { /* storage may be disabled */ }
  }, [draft, notice, profile, ready]);
  const saveDraft = () => {
    try { sessionStorage.setItem(draftKey(profile.username), JSON.stringify(draft)); } catch { /* mounted form remains editable */ }
  };
  const language = initialLanguage;
  const korean = language === "KR";
  const copy = korean ? {
    title: "계정 설정", profile: "공개 프로필", username: "사용자 이름", displayName: "표시 이름", bio: "소개", language: "선호 언어", save: "저장", saving: "저장 중…", saved: "프로필이 저장되었습니다.", restored: "이전 수정 내용을 복원했습니다.", empty: "자기소개는 비워 둘 수 있습니다.", limit: "최대 500자", error: "프로필을 저장하지 못했습니다. 내용을 확인하고 다시 시도해 주세요.", account: "계정", accountInfo: "계정 정보와 로그인 보안은 기존 로그인 절차에서 관리됩니다.", viewProfile: "내 프로필 보기", fixedUsername: "사용자 이름 변경은 현재 지원되지 않습니다."
  } : {
    title: "账户设置", profile: "公开资料", username: "用户名", displayName: "显示名称", bio: "个人简介", language: "首选语言", save: "保存资料", saving: "正在保存…", saved: "资料已保存。", restored: "已恢复上次未保存的修改。", empty: "个人简介可以留空。", limit: "最多500字", error: "暂时无法保存资料，请检查内容后重试。", account: "账户", accountInfo: "账户信息与登录安全沿用现有登录流程管理。", viewProfile: "查看我的主页", fixedUsername: "暂不支持修改用户名。"
  };
  return <main>
    <Header language={language} onLanguageChange={() => {}} languageHref={(next) => `/settings/profile?lang=${next}`} authenticated username={profile.username} displayName={profile.display_name ?? undefined} />
    <section className="auth-page profile-settings-page"><div className="settings-grid">
      <section className="auth-card profile-settings-card" aria-labelledby="settings-title">
        <h1 id="settings-title">{copy.title}</h1><h2>{copy.profile}</h2>
        {notice === "updated" && <p className="auth-notice" role="status">{copy.saved}</p>}
        {error && <p className="auth-error" role="alert">{copy.error}</p>}
        {restored && !notice && <p className="auth-notice" role="status">{copy.restored}</p>}
        <form action={updateProfile} onSubmit={saveDraft}>
          <input type="hidden" name="language" value={language} />
          <label htmlFor="settings-username">{copy.username}<input id="settings-username" value={profile.username} readOnly aria-describedby="username-help" /></label>
          <p id="username-help" className="field-help">{copy.fixedUsername}</p>
          <label htmlFor="displayName">{copy.displayName}<input id="displayName" name="displayName" value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} autoComplete="name" maxLength={50} required /></label>
          <label htmlFor="bio">{copy.bio}<textarea id="bio" name="bio" value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} maxLength={500} aria-describedby="bio-help" /></label>
          <p id="bio-help" className="field-help">{copy.empty} {copy.limit}</p>
          <label htmlFor="preferredLanguage">{copy.language}<select id="preferredLanguage" name="preferredLanguage" value={draft.preferredLanguage} onChange={(event) => setDraft({ ...draft, preferredLanguage: event.target.value as Language })} required><option value="CN">中文</option><option value="KR">한국어</option></select></label>
          <AuthSubmitButton idleText={copy.save} pendingText={copy.saving} />
        </form>
      </section>
      <div className="settings-aside">
        <NotificationPreferences language={language} />
        <section className="auth-card"><h2>{copy.account}</h2><p>{copy.accountInfo}</p><a href={`/u/${encodeURIComponent(profile.username)}?lang=${language}`}>{copy.viewProfile}</a></section>
      </div>
    </div></section>
  </main>;
}
