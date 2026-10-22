import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = normalizeLanguage(lang);
  const supabase = await createClient();
  const { data } = await supabase?.auth.getClaims() ?? {};
  if (!data?.claims?.sub) redirect(`/auth/login?lang=${language}&returnTo=/reports`);
  return <main className="auth-page"><section className="auth-card" role="status"><h1>{language === "KR" ? "내 신고" : "我的举报"}</h1><p>{language === "KR" ? "신고 저장 및 상태 조회 기능은 아직 준비 중입니다. 제출 내역을 표시할 수 없습니다." : "举报持久化与状态查询尚未开通，因此暂时无法显示提交记录。"}</p><a href={`/?lang=${language}`}>{language === "KR" ? "커뮤니티로 돌아가기" : "返回社区"}</a></section></main>;
}
