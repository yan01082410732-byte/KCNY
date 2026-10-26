import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { reportingContext } from "@/lib/report-server";
import { communityPage, olderThanFilter, parseCommunityCursor } from "@/lib/community-pagination";
import { DATA_REQUEST_FIELDS, DATA_REQUEST_PAGE_SIZE, isOperationsId, operationsEnvironmentEnabled, parseDataRequest, type DataRequest } from "@/lib/report-operations";
import { OperationsUnavailable, ReportPrivacyRequests } from "@/components/ReportOperations";

export const dynamic = "force-dynamic";

export default async function ReportPrivacyPage({ searchParams }: { searchParams: Promise<{ lang?: string; before?: string; case?: string }> }) {
  const params = await searchParams; const language = normalizeLanguage(params.lang);
  if (!operationsEnvironmentEnabled(process.env)) return <OperationsUnavailable language={language} />;
  const ctx = await reportingContext();
  const auth = await ctx.supabase?.auth.getUser();
  if (!auth?.data.user || auth.error || auth.data.user.is_anonymous || auth.data.user.id !== ctx.userId) {
    const returnTo = `/reports/privacy?${new URLSearchParams({ lang: language, ...(isOperationsId(params.case) ? { case: params.case } : {}) })}`;
    redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (!ctx.enabled || !ctx.supabase) return <OperationsUnavailable language={language} />;
  const cursor = parseCommunityCursor(params.before);
  const invalidCursor = Boolean(params.before && !cursor);
  let requests: DataRequest[] = [], error = invalidCursor;
  try {
    let query = ctx.supabase.from("report_data_requests").select(DATA_REQUEST_FIELDS).eq("requester_id", ctx.userId)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(DATA_REQUEST_PAGE_SIZE + 1);
    if (cursor) query = query.or(olderThanFilter(cursor));
    const result = await query;
    const parsed = (result.data ?? []).map(parseDataRequest);
    error = error || Boolean(result.error) || parsed.some(row => row === null);
    if (!error) requests = parsed as DataRequest[];
  } catch { error = true; }
  const page = communityPage(requests, DATA_REQUEST_PAGE_SIZE);
  return <ReportPrivacyRequests language={language} initialCaseId={isOperationsId(params.case) ? params.case : ""} requests={page.items} error={error} nextCursor={page.nextCursor} reviewer={ctx.reviewer} />;
}
