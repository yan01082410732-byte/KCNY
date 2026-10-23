import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { reportingContext } from "@/lib/report-server";
import { communityPage, olderThanFilter, parseCommunityCursor } from "@/lib/community-pagination";
import { REPORT_FIELDS, REPORT_PAGE_SIZE, type ReportCase } from "@/lib/reporting";
import { ReportList, ReportsUnavailable } from "@/components/ReportCases";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ lang?: string; before?: string }> }) {
  const params = await searchParams; const language = normalizeLanguage(params.lang);
  const ctx = await reportingContext();
  if (!ctx.userId) redirect(`/auth/login?lang=${language}&returnTo=/reports`);
  if (!ctx.enabled || !ctx.supabase) return <ReportsUnavailable language={language} />;
  const cursor = parseCommunityCursor(params.before);
  let query = ctx.supabase.from("reports").select(REPORT_FIELDS).eq("reporter_id", ctx.userId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(REPORT_PAGE_SIZE + 1);
  if (cursor) query = query.or(olderThanFilter(cursor));
  const { data, error } = await query;
  const page = communityPage((data ?? []) as ReportCase[], REPORT_PAGE_SIZE);
  return <ReportList language={language} reports={page.items} error={Boolean(error)} nextCursor={page.nextCursor} reviewer={ctx.reviewer} />;
}
