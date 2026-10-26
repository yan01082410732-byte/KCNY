"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { reportFailure, reportsEnvironmentEnabled, validateReportInput, type ReportSubmissionState } from "@/lib/reporting";

function refreshReports(paths: string[]) {
  // An acknowledged DB commit remains successful if cache refresh is unavailable.
  // The user may explicitly reload; never suggest repeating the committed mutation.
  try { for (const path of paths) revalidatePath(path); } catch { /* Confirmed save is authoritative. */ }
}

export async function submitReport(_previous: ReportSubmissionState, formData: FormData): Promise<ReportSubmissionState> {
  if (!reportsEnvironmentEnabled(process.env)) return { status: "error", reason: "unavailable" };
  const result = validateReportInput({ kind: formData.get("kind"), targetType: formData.get("targetType"), targetId: formData.get("targetId"), reason: formData.get("reason"), description: formData.get("description") });
  if (!result.ok) return { status: "error", reason: "invalid_input" };
  const supabase = await createClient();
  if (!supabase) return { status: "error", reason: "unavailable" };
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { status: "error", reason: "login_required" };
  const requestId = formData.get("requestId");
  if (typeof requestId !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)) return { status: "error", reason: "invalid_input" };
  try {
    const { data: reportId, error } = await supabase.rpc("submit_report", {
      p_request_id: requestId, p_kind: result.value.kind, p_target_type: result.value.targetType,
      p_target_ref: result.value.targetId, p_reason: result.value.reason, p_description: result.value.description,
    });
    if (error) return { status: "error", reason: reportFailure(error.message) };
    if (typeof reportId !== "string") return { status: "error", reason: "unavailable" };
    refreshReports(["/reports"]);
    return { status: "success", reportId };
  } catch { return { status: "error", reason: "unavailable" }; }
}

export async function reviewReport(_previous: ReportSubmissionState, formData: FormData): Promise<ReportSubmissionState> {
  if (!reportsEnvironmentEnabled(process.env)) return { status: "error", reason: "unavailable" };
  const supabase = await createClient();
  const { data } = await supabase?.auth.getClaims() ?? {};
  if (!supabase || !data?.claims?.sub) return { status: "error", reason: "login_required" };
  const reportId = String(formData.get("reportId") ?? "");
  const expected = Number(formData.get("version"));
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reportId) || !Number.isSafeInteger(expected) || expected < 1) return { status: "error", reason: "invalid_input" };
  try {
    const result = await supabase.rpc("review_report", {
      p_report_id: reportId, p_expected_version: expected, p_next_status: String(formData.get("nextStatus") ?? ""),
      p_public_resolution: String(formData.get("publicResolution") ?? ""),
      p_decision_reason: String(formData.get("decisionReason") ?? ""), p_internal_note: String(formData.get("internalNote") ?? ""),
    });
    if (result.error) return { status: "error", reason: reportFailure(result.error.message) };
    if (!Number.isSafeInteger(result.data) || result.data !== expected + 1) return { status: "error", reason: "unavailable" };
    refreshReports([`/reports/${reportId}`, `/reports/review/${reportId}`, "/reports", "/reports/review"]);
    return { status: "success", reportId, caseVersion: result.data };
  } catch { return { status: "error", reason: "unavailable" }; }
}
