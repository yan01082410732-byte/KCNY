import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { REPORT_FIELDS, reportStatusLabel, type ReportCase, type ReviewEvent } from "@/lib/reporting";
import { reportingContext, reportTargetHref } from "@/lib/report-server";
import { ReportDetail, ReportsUnavailable } from "@/components/ReportCases";
import { ReportReviewForm } from "@/components/ReportReviewForm";

export const dynamic = "force-dynamic";
export default async function ReviewCasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params; const language = normalizeLanguage((await searchParams).lang); const kr = language === "KR";
  const ctx = await reportingContext();
  if (!ctx.userId) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/reports/review/${id}`)}`);
  if (!ctx.enabled || !ctx.supabase) return <ReportsUnavailable language={language} />;
  if (!ctx.reviewer) return <ReportsUnavailable language={language} forbidden />;
  const [{ data, error }, history] = await Promise.all([
    ctx.supabase.from("reports").select(REPORT_FIELDS).eq("id", id).maybeSingle(),
    ctx.supabase.rpc("report_review_history", { p_report_id: id }),
  ]);
  return <main className="shell cases-page"><a href={`/reports/review?lang=${language}`}>{kr ? "검토 대기열로" : "返回审核队列"}</a>{error || history.error ? <p role="alert">{kr ? "사건 또는 이력을 불러오지 못했습니다. 새로고침해 주세요." : "案件或审核历史加载失败，请刷新重试。"}</p> : !data ? <p role="status">{kr ? "사건이 없습니다." : "案件不存在。"}</p> : <>
    <ReportDetail report={data as ReportCase} language={language} targetHref={await reportTargetHref(data as ReportCase)} />
    <ReportReviewForm key={data.version} report={data as ReportCase} language={language} />
    <section className="case-card"><h2>{kr ? "내부 감사 이력" : "内部审计记录"}</h2>{(history.data as ReviewEvent[]).map(event => <article className="review-event" key={event.id}><p>{event.from_status ? reportStatusLabel(event.from_status, language) : "—"} → {reportStatusLabel(event.to_status, language)}</p><time>{event.created_at}</time><p>{kr ? "작업자" : "操作人"}: {event.actor_id}</p><p>{event.from_status === null ? (kr ? "제출됨" : "已提交") : event.decision_reason}</p><p className="internal-note">{event.internal_note}</p></article>)}</section>
  </>}</main>;
}
