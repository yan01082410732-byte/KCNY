"use server";

import { revalidatePath } from "next/cache";
import { reportingContext } from "@/lib/report-server";
import { operationsEnvironmentEnabled, operationsFailure, isOperationsId, parseDataRequestInput, parseDataRequestReviewInput, parseRetentionInput, type OperationsActionState } from "@/lib/report-operations";

async function authenticatedOperations(reviewer: boolean) {
  if (!operationsEnvironmentEnabled(process.env)) return { error: "unavailable" as const };
  try {
    const ctx = await reportingContext();
    if (!ctx.supabase) return { error: "unavailable" as const };
    const auth = await ctx.supabase.auth.getUser();
    if (auth.error) return { error: auth.error.status && auth.error.status < 500 ? "login_required" as const : "unavailable" as const };
    if (!auth.data.user || auth.data.user.is_anonymous || auth.data.user.id !== ctx.userId) return { error: "login_required" as const };
    if (!ctx.enabled) return { error: "unavailable" as const };
    if (reviewer && !ctx.reviewer) return { error: "forbidden" as const };
    return { supabase: ctx.supabase };
  } catch { return { error: "unavailable" as const }; }
}

function refreshOperations(reportId?: string) {
  // Cache refresh failure must not turn an acknowledged database commit into a failed save.
  try {
    revalidatePath("/reports/privacy"); revalidatePath("/reports/operations");
    if (reportId) revalidatePath(`/reports/${reportId}`);
  } catch { /* A user can reload; the authoritative save result is already confirmed. */ }
}

export async function submitDataRequest(_previous: OperationsActionState, formData: FormData): Promise<OperationsActionState> {
  const ctx = await authenticatedOperations(false);
  if (ctx.error || !ctx.supabase) return { status: "error", reason: ctx.error ?? "unavailable" };
  const input = parseDataRequestInput({ reportId: formData.get("reportId"), requestId: formData.get("requestId"), kind: formData.get("kind"), details: formData.get("details") });
  if (!input) return { status: "error", reason: "invalid_input" };
  try {
    const result = await ctx.supabase.rpc("submit_report_data_request", { p_report_id: input.reportId, p_request_id: input.requestId, p_kind: input.kind, p_details: input.details });
    if (result.error) return { status: "error", reason: operationsFailure(result.error) };
    if (!isOperationsId(result.data)) return { status: "error", reason: "unavailable" };
    refreshOperations(input.reportId);
    return { status: "success", entityId: result.data };
  } catch { return { status: "error", reason: "unavailable" }; }
}

export async function recordRetention(_previous: OperationsActionState, formData: FormData): Promise<OperationsActionState> {
  const ctx = await authenticatedOperations(true);
  if (ctx.error || !ctx.supabase) return { status: "error", reason: ctx.error ?? "unavailable" };
  const input = parseRetentionInput({ reportId: formData.get("reportId"), caseVersion: formData.get("caseVersion"), reviewVersion: formData.get("reviewVersion"), decision: formData.get("decision"), hold: formData.get("hold"), reason: formData.get("reason"), nextReviewAt: formData.get("nextReviewAt") });
  if (!input) return { status: "error", reason: "invalid_input" };
  try {
    const result = await ctx.supabase.rpc("record_report_retention", {
      p_report_id: input.reportId, p_expected_case_version: input.caseVersion, p_expected_review_version: input.reviewVersion,
      p_decision: input.decision, p_hold: input.hold, p_reason: input.reason, p_next_review_at: input.nextReviewAt,
    });
    if (result.error) return { status: "error", reason: operationsFailure(result.error) };
    const saved = result.data;
    if (!saved || saved.review_version !== input.reviewVersion + 1 || saved.decision !== input.decision || Date.parse(saved.next_review_at) !== Date.parse(input.nextReviewAt)) return { status: "error", reason: "unavailable" };
    refreshOperations(input.reportId);
    return { status: "success", entityId: input.reportId, version: saved.review_version };
  } catch { return { status: "error", reason: "unavailable" }; }
}

export async function reviewDataRequest(_previous: OperationsActionState, formData: FormData): Promise<OperationsActionState> {
  const ctx = await authenticatedOperations(true);
  if (ctx.error || !ctx.supabase) return { status: "error", reason: ctx.error ?? "unavailable" };
  const input = parseDataRequestReviewInput({ requestId: formData.get("requestId"), version: formData.get("version"), nextStatus: formData.get("nextStatus"), publicResponse: formData.get("publicResponse"), internalReason: formData.get("internalReason"), approvalReference: formData.get("approvalReference") });
  if (!input) return { status: "error", reason: "invalid_input" };
  try {
    const result = await ctx.supabase.rpc("review_report_data_request", {
      p_request_id: input.requestId, p_expected_version: input.version, p_next_status: input.nextStatus,
      p_public_response: input.publicResponse, p_internal_reason: input.internalReason, p_approval_reference: input.approvalReference,
    });
    if (result.error) return { status: "error", reason: operationsFailure(result.error) };
    if (result.data !== input.version + 1) return { status: "error", reason: "unavailable" };
    refreshOperations();
    return { status: "success", entityId: input.requestId, version: result.data };
  } catch { return { status: "error", reason: "unavailable" }; }
}
