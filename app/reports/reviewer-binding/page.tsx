import { normalizeLanguage, type Language } from "@/lib/auth";
import { isBindingUuid, reviewerBindingEnvironment } from "@/lib/reviewer-binding";
import { createClient } from "@/lib/supabase/server";
import { ReviewerBindingConfirmation } from "@/components/ReviewerBindingConfirmation";

export const dynamic = "force-dynamic";

function BindingNotice({ language, loginRequired = false }: { language: Language; loginRequired?: boolean }) {
  const kr = language === "KR";
  return <main className="auth-page"><section className="auth-card"><h1>{kr ? "검토자 계정 본인 확인" : "审核员账号本人确认"}</h1><p role="status">{loginRequired ? (kr ? "본인의 인증이 완료된 일반 계정으로 공식 페이지에서 로그인해 주세요." : "请在官方页面使用本人已完成验证的普通账号登录。") : (kr ? "현재 환경에서는 계정 본인 확인이 활성화되어 있지 않거나 일시적으로 사용할 수 없습니다. 검토자 권한은 부여되지 않았습니다." : "当前环境未启用或暂时无法使用账号本人确认，未授予审核权限。")}</p>
    {loginRequired && <a className="button" href={`/auth/login?lang=${language}&returnTo=/reports/reviewer-binding`}>{kr ? "공식 로그인 페이지" : "前往官方登录页"}</a>}<a className="button" href={`/?lang=${language}`}>{kr ? "커뮤니티로" : "返回社区"}</a>
  </section></main>;
}

export default async function ReviewerBindingPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const language = normalizeLanguage((await searchParams).lang);
  if (!reviewerBindingEnvironment(process.env)) return <BindingNotice language={language} />;
  try {
    const supabase = await createClient();
    if (!supabase) return <BindingNotice language={language} />;
    const auth = await supabase.auth.getUser();
    if (auth.error) return <BindingNotice language={language} loginRequired={Boolean(auth.error.status && auth.error.status < 500)} />;
    const user = auth.data.user;
    if (!user || user.is_anonymous || !isBindingUuid(user.id) || !(user.email_confirmed_at || user.confirmed_at)) return <BindingNotice language={language} loginRequired />;
    return <ReviewerBindingConfirmation language={language} userId={user.id} />;
  } catch { return <BindingNotice language={language} />; }
}
