"use client";

export function Header({ language, onLanguageChange, signIn }: { language: "zh" | "ko"; onLanguageChange: (language: "zh" | "ko") => void; signIn: string }) {
  return <header><div className="shell nav"><a className="brand" href="#"><span>K</span>CNY</a><nav><a href="#feed">Community</a><a href="#">Discover</a><a href="#">About</a></nav><div className="nav-actions"><div className="language"><button className={language === "zh" ? "selected" : ""} onClick={() => onLanguageChange("zh")}>中</button><button className={language === "ko" ? "selected" : ""} onClick={() => onLanguageChange("ko")}>한</button></div><button className="signin">{signIn}</button></div></div></header>;
}
