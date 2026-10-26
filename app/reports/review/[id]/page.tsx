import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { REPORT_FIELDS, reportStatusLabel, type ReportCase, type ReviewEvent } from "@/lib/reporting";
import { reportingContext, reportTargetHref } from "@/lib/report-server";
import { ReportDetail, ReportsUnavailable } from "@/components/ReportCases";
import { ReportReviewForm } from "@/components/ReportReviewForm";
import { isReviewCaseId, nextReviewScope, parseReviewQuery, reviewCaseHref, reviewCursorFilter, reviewQueueHref, type ReviewSearchParams } from "@/lib/report-review-workspace";

export const dynamic = "force-dynamic";
export default async function ReviewCasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<ReviewSearchParams> }) {
  const { id } = await params; const search = await searchParams;
  const language = normalizeLanguage(typeof search.lang === "string" ? search.lang : undefined); const kr = language === "KR";
  const filters = parseReviewQuery(search);
  const ctx = await reportingContext();
  if (!ctx.userId) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/reports/review/${id}`)}`);
  if (!ctx.enabled || !ctx.supabase) return <ReportsUnavailable language={language} />;
  if (!ctx.reviewer) return <ReportsUnavailable language={language} forbidden />;
  if (!isReviewCaseId(id) || !filters.valid) return <main className="shell cases-page"><p role="alert">{kr ? "사건 ID 또는 필터가 올바르지 않습니다." : "案件ID或筛选条件无效。"}</p><a href={`/reports/review?lang=${language}`}>{kr ? "검토 대기열로" : "返回审核队列"}</a></main>;
  const [{ data, error }, history] = await Promise.all([
    ctx.supabase.from("reports").select(REPORT_FIELDS).eq("id", id).maybeSingle(),
    ctx.supabase.rpc("report_review_history", { p_report_id: id }),
  ]);
  let nextId: string | undefined; let nextError = false;
  if (data && !error && !history.error) {
    const nextScope = nextReviewScope(filters, data as ReportCase); const ascending = filters.order === "oldest";
    let nextQuery = ctx.supabase.from("reports").select("id").in("status", ["pending", "under_review"])
      .lte("created_at", filters.asOf).order("created_at", { ascending }).order("id", { ascending })
      .or(reviewCursorFilter(nextScope.before!, filters.order)).limit(1);
    if (nextScope.kind) nextQuery = nextQuery.eq("kind", nextScope.kind);
    if (nextScope.reason) nextQuery = nextQuery.eq("reason", nextScope.reason);
    if (nextScope.olderThan) nextQuery = nextQuery.lte("created_at", nextScope.olderThan);
    const result = await nextQuery; nextError = Boolean(result.error);
    nextId = result.data?.[0]?.id;
  }
  return <main className="shell cases-page review-workspace"><a href={reviewQueueHref(filters, language)}>{kr ? "검토 대기열로" : "返回审核队列"}</a>{error || history.error ? <p role="alert">{kr ? "사건 또는 이력을 불러오지 못했습니다. 새로고침해 주세요." : "案件或审核历史加载失败，请刷新重试。"}</p> : !data ? <p role="status">{kr ? "사건이 없습니다." : "案件不存在。"}</p> : <>
    <p className="review-version">{kr ? "현재 저장 버전" : "当前已保存版本"}: <strong data-case-version>{data.version}</strong> · {kr ? "마지막 저장" : "最后保存"}: <time dateTime={data.updated_at}>{new Date(data.updated_at).toLocaleString(kr ? "ko-KR" : "zh-CN", { timeZone: "Asia/Seoul" })}</time></p>
    <ReportDetail report={data as ReportCase} language={language} targetHref={await reportTargetHref(data as ReportCase)} />
    <ReportReviewForm key={id} report={data as ReportCase} language={language} continueHref={reviewCaseHref(id, filters, language)!} />
    <section className="case-card"><h2>{kr ? "다음 미처리 사건" : "下一条待处理案件"}</h2><p>{kr ? "같은 유형·사유·미처리 기간·정렬 범위에서 현재 사건 다음의 미처리 사건입니다. 상태와 정확한 ID 필터는 제외됩니다." : "来自相同类型、原因、未处理时长及排序范围内，当前案件之后的待处理案件；不受原状态与准确ID筛选限制。"}</p>{nextError ? <p role="alert">{kr ? "다음 사건을 불러오지 못했습니다." : "下一条案件加载失败。"}</p> : nextId ? <a className="button" href={reviewCaseHref(nextId, { ...filters, id: undefined, status: undefined }, language)}>{kr ? "다음 미처리 사건 열기" : "打开下一条待处理案件"}</a> : <p role="status">{kr ? "현재 범위에 다음 미처리 사건이 없습니다." : "当前范围内没有下一条待处理案件。"}</p>}</section>
    <section className="case-card"><h2>{kr ? "내부 감사 이력" : "内部审计记录"}</h2>{(history.data as ReviewEvent[]).map(event => <article className="review-event" key={event.id}><p>{event.from_status ? reportStatusLabel(event.from_status, language) : "—"} → {reportStatusLabel(event.to_status, language)}</p><time>{event.created_at}</time><p>{kr ? "작업자" : "操作人"}: {event.actor_id}</p><p>{event.from_status === null ? (kr ? "제출됨" : "已提交") : event.decision_reason}</p><p className="internal-note">{event.internal_note}</p></article>)}</section>
  </>}</main>;
}
