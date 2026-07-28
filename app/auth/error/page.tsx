import { normalizeLanguage } from "@/lib/auth";
import { message } from "@/lib/auth-messages";

export default async function AuthError({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const language = normalizeLanguage(params.lang);
  const korean = language === "KR";
  return <main className="auth-page"><section className="auth-card"><h1>{korean ? "인증 오류" : "验证错误"}</h1><p>{message(params.reason, language)}</p><p>{korean ? "다시 로그인하거나 가입해 주세요." : "请重新登录或重新注册。"}</p><a className="button primary" href={`/auth/login?lang=${language}`}>{korean ? "로그인으로" : "返回登录"}</a> <a href="/">{korean ? "홈으로" : "返回首页"}</a></section></main>;
}
