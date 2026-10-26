import { redirect } from "next/navigation";
import { normalizeLanguage } from "@/lib/auth";
import { reportingContext } from "@/lib/report-server";
import { isOperationsId, operationsEnvironmentEnabled, parseOperationsOverview, type OperationsOverview } from "@/lib/report-operations";
import { OperationsUnavailable, ReportOperations } from "@/components/ReportOperations";

export const dynamic = "force-dynamic";

export default async function ReportOperationsPage({ searchParams }: { searchParams: Promise<{ lang?: string; case?: string }> }) {
  const params = await searchParams; const language = normalizeLanguage(params.lang);
  if (!operationsEnvironmentEnabled(process.env)) return <OperationsUnavailable language={language} />;
  const ctx = await reportingContext();
  const auth = await ctx.supabase?.auth.getUser();
  if (!auth?.data.user || auth.error || auth.data.user.is_anonymous || auth.data.user.id !== ctx.userId) redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(`/reports/operations?lang=${language}`)}`);
  if (!ctx.enabled || !ctx.supabase) return <OperationsUnavailable language={language} />;
  if (!ctx.reviewer) return <OperationsUnavailable language={language} forbidden />;
  const selectedId = isOperationsId(params.case) ? params.case : undefined;
  let overview: OperationsOverview | null = null, error = Boolean(params.case && !selectedId);
  if (!error) {
    try {
      const result = await ctx.supabase.rpc("report_operations_overview", { p_case_id: selectedId ?? null });
      overview = !result.error ? parseOperationsOverview(result.data) : null;
      error = !overview;
    } catch { error = true; }
  }
  return <ReportOperations language={language} overview={overview} error={error} selectedMissing={Boolean(selectedId && overview && !overview.selected)} selectedId={selectedId} />;
}
