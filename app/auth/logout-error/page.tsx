import { normalizeLanguage } from "@/lib/auth";
import { message } from "@/lib/auth-messages";

export default async function LogoutError({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const language = normalizeLanguage((await searchParams).lang);
  return <main className="auth-page"><section className="auth-card">
    <h1>{language === "KR" ? "로그아웃" : "退出登录"}</h1>
    <p role="alert">{message("logout_failed", language)}</p>
    <form action="/auth/signout" method="post">
      <input type="hidden" name="language" value={language} />
      <button type="submit" className="button primary">{language === "KR" ? "다시 시도" : "重试退出"}</button>
    </form>
    <a href={`/?lang=${language}`}>{language === "KR" ? "홈" : "返回首页"}</a>
  </section></main>;
}
