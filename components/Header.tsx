"use client";

import { UserMenu } from "@/components/UserMenu";

type HeaderProps = { language: "CN" | "KR"; onLanguageChange: (language: "CN" | "KR") => void; authenticated: boolean; username?: string; displayName?: string };

export function Header({ language, onLanguageChange, authenticated, username, displayName }: HeaderProps) {
  const korean = language === "KR";
  return <header><div className="shell nav">
    <a className="brand" href="/"><span>K</span>CNY</a>
    <nav><a href="/#feed">Community</a><a href="/coming-soon">Discover</a><a href="/coming-soon">About</a></nav>
    <div className="nav-actions">
      <div className="language" aria-label="Language"><button type="button" className={language === "CN" ? "selected" : ""} onClick={() => onLanguageChange("CN")}>中</button><button type="button" className={korean ? "selected" : ""} onClick={() => onLanguageChange("KR")}>한</button></div>
      {authenticated ? <UserMenu language={language} username={username} displayName={displayName} /> : <><a className="signin" href={`/auth/login?lang=${language}`}>{korean ? "로그인" : "登录"}</a><a className="signin secondary-link" href={`/auth/signup?lang=${language}`}>{korean ? "회원가입" : "注册"}</a></>}
    </div>
  </div></header>;
}
