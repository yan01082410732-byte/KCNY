import { resendConfirmation, signIn } from "../actions";
import { normalizeLanguage, safeReturnTo } from "@/lib/auth";
import { message } from "@/lib/auth-messages";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const language = normalizeLanguage(params.lang);
  const korean = language === "KR";

  const copy = korean
    ? {
        title: "로그인",
        email: "이메일",
        password: "비밀번호",
        submit: "로그인",
        submitting: "로그인 중…",
        signup: "회원가입",
        checkEmail: "이메일을 확인해 주세요.",
        resendTitle: "인증 이메일을 받지 못했나요?",
        resendDescription:
          "가입한 이메일을 입력하면 인증 이메일을 다시 보내드립니다.",
        resend: "인증 이메일 다시 보내기",
        resending: "인증 이메일을 보내는 중…",
        resent:
          "해당 이메일에 확인 대기 중인 계정이 있다면 새 인증 이메일이 전송되었습니다. 받은편지함과 스팸함을 확인해 주세요.",
      }
    : {
        title: "登录",
        email: "邮箱",
        password: "密码",
        submit: "登录",
        submitting: "登录中…",
        signup: "注册",
        checkEmail: "请检查邮箱并完成验证。",
        resendTitle: "没有收到验证邮件？",
        resendDescription: "输入注册邮箱，我们会重新发送一封验证邮件。",
        resend: "重新发送验证邮件",
        resending: "正在重新发送验证邮件…",
        resent:
          "如果该邮箱有待确认的账户，新的验证邮件已发送，请检查收件箱和垃圾邮件。",
      };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>{copy.title}</h1>
        {params.notice === "check_email" && (
          <p className="auth-notice">{copy.checkEmail}</p>
        )}
        {params.notice === "confirmation_resent" && (
          <p className="auth-notice">{copy.resent}</p>
        )}
        {params.error && <p className="auth-error">{message(params.error, language)}</p>}

        <form action={signIn}>
          <input type="hidden" name="language" value={language} />
          <input type="hidden" name="returnTo" value={safeReturnTo(params.returnTo)} />
          <label htmlFor="email">
            {copy.email}
            <input id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <label htmlFor="password">
            {copy.password}
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <AuthSubmitButton idleText={copy.submit} pendingText={copy.submitting} />
        </form>

        <section className="auth-resend" aria-labelledby="resend-confirmation-heading">
          <h2 id="resend-confirmation-heading">{copy.resendTitle}</h2>
          <p>{copy.resendDescription}</p>
          <form action={resendConfirmation}>
            <input type="hidden" name="language" value={language} />
            <label htmlFor="resendEmail">
              {copy.email}
              <input
                id="resendEmail"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </label>
            <AuthSubmitButton idleText={copy.resend} pendingText={copy.resending} />
          </form>
        </section>

        <a href={`/auth/signup?lang=${language}`}>{copy.signup}</a>
      </section>
    </main>
  );
}
