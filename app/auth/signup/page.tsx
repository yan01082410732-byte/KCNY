import { signUp } from "../actions";
import { authPageHref, normalizeLanguage, safeAuthReturnTo } from "@/lib/auth";
import { message } from "@/lib/auth-messages";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const language = normalizeLanguage(params.lang);
  const korean = language === "KR";
  const returnTo = safeAuthReturnTo(params.returnTo);

  return <main className="auth-page"><section className="auth-card">
    <h1>{korean ? "회원가입" : "注册"}</h1>
    {params.error && <p className="auth-error" role="alert">{message(params.error, language)}</p>}
    <form action={signUp}>
      <input type="hidden" name="language" value={language} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label htmlFor="username">{korean ? "사용자 이름" : "用户名"}<input id="username" name="username" autoComplete="username" required /></label>
      <label htmlFor="displayName">{korean ? "표시 이름" : "显示名称"}<input id="displayName" name="displayName" required /></label>
      <label htmlFor="email">{korean ? "이메일" : "邮箱"}<input id="email" name="email" type="email" autoComplete="email" required /></label>
      <label htmlFor="password">{korean ? "비밀번호" : "密码"}<input id="password" name="password" type="password" autoComplete="new-password" required /></label>
      <label htmlFor="confirmPassword">{korean ? "비밀번호 확인" : "确认密码"}<input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required /></label>
      <label htmlFor="preferredLanguage">{korean ? "선호 언어" : "首选语言"}<select id="preferredLanguage" name="preferredLanguage" defaultValue={language} required><option value="CN">中文</option><option value="KR">한국어</option></select></label>
      <AuthSubmitButton idleText={korean ? "가입하기" : "注册"} pendingText={korean ? "가입 중…" : "正在注册……"} />
    </form>
    <a href={authPageHref("login", language, returnTo)}>{korean ? "로그인" : "登录"}</a>
  </section></main>;
}
