"use client";

export function Header({ language, onLanguageChange, signIn }: { language: "zh" | "ko"; onLanguageChange: (language: "zh" | "ko") => void; signIn: string }) {
  return <header><div className="shell nav"><a className="brand" href="#"><span>K</span>CNY</a><nav><a href="#feed">Community</a><a href="#">Discover</a><a href="#">About</a></nav><div className="nav-actions"><div className="language"><button className={language === "zh" ? "selected" : ""} onClick={() => onLanguageChange("zh")}>中</button><button className={language === "ko" ? "selected" : ""} onClick={() => onLanguageChange("ko")}>한</button></div><a className="signin" href={`/auth/login?lang=${language}`}>{signIn}</a><a className="signin secondary-link" href={`/auth/signup?lang=${language}`}>{language === "ko" ? "가입" : "注册"}</a></div></div></header>;
}
