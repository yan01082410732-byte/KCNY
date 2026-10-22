import { notFound, redirect } from "next/navigation";
import { ReportForm } from "@/components/ReportForm";
import { normalizeLanguage } from "@/lib/auth";
import { isReportTarget, type ReportKind, type ReportTargetType } from "@/lib/reporting";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ lang?: string; kind?: string; targetType?: string; targetId?: string }> }) {
  const params = await searchParams;
  const language = normalizeLanguage(params.lang);
  const kind: ReportKind = params.kind === "complaint" ? "complaint" : "report";
  const targetValid = isReportTarget(params.targetType, params.targetId);
  if ((kind === "report" && !targetValid) || (kind === "complaint" && (params.targetType || params.targetId) && !targetValid)) notFound();
  const supabase = await createClient();
  const { data } = await supabase?.auth.getClaims() ?? {};
  if (!data?.claims?.sub) {
    const returnTo = `/reports/new?${new URLSearchParams({ lang: language, kind, ...(targetValid ? { targetType: params.targetType!, targetId: params.targetId! } : {}) })}`;
    redirect(`/auth/login?lang=${language}&returnTo=${encodeURIComponent(returnTo)}`);
  }
  const { data: profile } = await supabase!.from("profiles").select("username, display_name").eq("id", data.claims.sub).maybeSingle();
  return <ReportForm key={`${kind}:${params.targetType}:${params.targetId}`} kind={kind} targetType={targetValid ? params.targetType as ReportTargetType : undefined} targetId={targetValid ? params.targetId : undefined} language={language} username={profile?.username} displayName={profile?.display_name ?? undefined} />;
}
