"use client";

type HeaderProps = {
  language: "CN" | "KR";
  onLanguageChange: (language: "CN" | "KR") => void;
  authenticated: boolean;
  username?: string;
  displayName?: string;
};

export function Header({
  language,
  onLanguageChange,
  authenticated,
  username,
  displayName,
}: HeaderProps) {
  const korean = language === "KR";
  const profileHref = username ? `/u/${encodeURIComponent(username)}` : undefined;

  return (
    <header>
      <div className="shell nav">
        <a className="brand" href="/">
          <span>K</span>CNY
        </a>
        <nav>
          <a href="/#feed">Community</a>
          <a href="/coming-soon">Discover</a>
          <a href="/coming-soon">About</a>
        </nav>
        <div className="nav-actions">
          <div className="language" aria-label="Language">
            <button type="button" className={language === "CN" ? "selected" : ""} onClick={() => onLanguageChange("CN")}>中</button>
            <button type="button" className={korean ? "selected" : ""} onClick={() => onLanguageChange("KR")}>한</button>
          </div>
          {authenticated ? (
            <>
              <span className="user-name">{displayName || username || (korean ? "회원" : "用户")}</span>
              {profileHref ? <a href={profileHref}>{korean ? "프로필" : "个人主页"}</a> : <span className="header-unavailable">{korean ? "프로필 준비 중" : "个人主页暂不可用"}</span>}
              <a href={`/settings/profile?lang=${language}`}>{korean ? "프로필 편집" : "编辑资料"}</a>
              <a className="signin" href="/coming-soon">{korean ? "글 쓰기" : "发布帖子"}</a>
              <form action="/auth/signout" method="post"><button className="signin secondary-link" type="submit">{korean ? "로그아웃" : "退出"}</button></form>
            </>
          ) : (
            <>
              <a className="signin" href={`/auth/login?lang=${language}`}>{korean ? "로그인" : "登录"}</a>
              <a className="signin secondary-link" href={`/auth/signup?lang=${language}`}>{korean ? "회원가입" : "注册"}</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
