import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { REPORT_FIELDS, type ReportCase } from "@/lib/reporting";
import { reportingContext, reportTargetHref } from "@/lib/report-server";
import { ReportDetail, ReportsUnavailable } from "@/components/ReportCases";

export const dynamic = "force-dynamic";
export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params; const language = normalizeLanguage((await searchParams).lang);
  const ctx = await reportingContext();
  if (!ctx.userId) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/reports/${id}`)}`);
  if (!ctx.enabled || !ctx.supabase) return <ReportsUnavailable language={language} />;
  const { data, error } = await ctx.supabase.from("reports").select(REPORT_FIELDS).eq("id", id).eq("reporter_id", ctx.userId).maybeSingle();
  return <main className="shell cases-page"><a href={`/reports?lang=${language}`}>{language === "KR" ? "내 사건으로" : "返回我的案件"}</a>{error ? <p role="alert">{language === "KR" ? "불러오지 못했습니다. 새로고침해 주세요." : "加载失败，请刷新重试。"}</p> : !data ? <p role="status">{language === "KR" ? "사건이 없거나 접근 권한이 없습니다." : "案件不存在或无权访问。"}</p> : <ReportDetail report={data as ReportCase} language={language} targetHref={await reportTargetHref(data as ReportCase)} />}</main>;
}
