import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { reportingContext } from "@/lib/report-server";
import { REPORT_FIELDS, REPORT_PAGE_SIZE, type ReportCase } from "@/lib/reporting";
import { communityPage } from "@/lib/community-pagination";
import { parseReviewQuery, parseReviewSummary, reviewCursorFilter, reviewSummaryArgs, reviewQueueHref, type ReviewSearchParams } from "@/lib/report-review-workspace";
import { ReportsUnavailable } from "@/components/ReportCases";
import { ReportReviewWorkspace } from "@/components/ReportReviewWorkspace";

export const dynamic = "force-dynamic";
export default async function ReviewQueue({ searchParams }: { searchParams: Promise<ReviewSearchParams> }) {
  const params = await searchParams; const language = normalizeLanguage(typeof params.lang === "string" ? params.lang : undefined);
  const filters = parseReviewQuery(params);
  const ctx = await reportingContext();
  if (!ctx.userId) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(reviewQueueHref(filters, language))}`);
  if (!ctx.enabled || !ctx.supabase) return <ReportsUnavailable language={language} />;
  if (!ctx.reviewer) return <ReportsUnavailable language={language} forbidden />;
  if (!filters.valid) return <ReportReviewWorkspace language={language} query={filters} reports={[]} summary={null} listError={false} summaryError={false} />;
  const ascending = filters.order === "oldest";
  let query = ctx.supabase.from("reports").select(REPORT_FIELDS).order("created_at", { ascending }).order("id", { ascending }).limit(REPORT_PAGE_SIZE + 1).lte("created_at", filters.asOf);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.reason) query = query.eq("reason", filters.reason);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.id) query = query.eq("id", filters.id);
  if (filters.olderThan) query = query.in("status", ["pending", "under_review"]).lte("created_at", filters.olderThan);
  if (filters.before) query = query.or(reviewCursorFilter(filters.before, filters.order));
  const [{ data, error }, summaryResult] = await Promise.all([query, ctx.supabase.rpc("report_review_summary", reviewSummaryArgs(filters))]);
  const page = communityPage((data ?? []) as ReportCase[], REPORT_PAGE_SIZE);
  const summary = summaryResult.error ? null : parseReviewSummary(summaryResult.data);
  return <ReportReviewWorkspace language={language} query={filters} reports={page.items} summary={summary} listError={Boolean(error)} summaryError={Boolean(summaryResult.error) || !summary} nextCursor={page.nextCursor} />;
}
