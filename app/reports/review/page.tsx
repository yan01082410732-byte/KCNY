import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { reportingContext } from "@/lib/report-server";
import { REPORT_FIELDS, REPORT_PAGE_SIZE, isReviewStatus, type ReportCase } from "@/lib/reporting";
import { communityPage, olderThanFilter, parseCommunityCursor } from "@/lib/community-pagination";
import { ReportList, ReportsUnavailable } from "@/components/ReportCases";

export const dynamic = "force-dynamic";
export default async function ReviewQueue({ searchParams }: { searchParams: Promise<{ lang?: string; status?: string; before?: string }> }) {
  const params = await searchParams; const language = normalizeLanguage(params.lang);
  const ctx = await reportingContext();
  if (!ctx.userId) redirect(`/auth/login?lang=${language}&returnTo=/reports/review`);
  if (!ctx.enabled || !ctx.supabase) return <ReportsUnavailable language={language} />;
  if (!ctx.reviewer) return <ReportsUnavailable language={language} forbidden />;
  const status = isReviewStatus(params.status) ? params.status : undefined;
  const cursor = parseCommunityCursor(params.before);
  let query = ctx.supabase.from("reports").select(REPORT_FIELDS).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(REPORT_PAGE_SIZE + 1);
  if (status) query = query.eq("status", status);
  if (cursor) query = query.or(olderThanFilter(cursor));
  const { data, error } = await query;
  const page = communityPage((data ?? []) as ReportCase[], REPORT_PAGE_SIZE);
  return <ReportList language={language} reports={page.items} error={Boolean(error)} nextCursor={page.nextCursor} review reviewer status={status} />;
}
