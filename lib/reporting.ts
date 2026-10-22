export type ReportTargetType = "post" | "comment" | "reply" | "profile";
export type ReportReason = "spam" | "harassment" | "hate" | "privacy" | "other";
export type ReportKind = "report" | "complaint";
export type ReportSubmissionState = { status: "idle" } | { status: "error"; reason: "invalid_input" | "login_required" | "unavailable" };
export const REPORT_PERSISTENCE_AVAILABLE = false;
export type ReviewStatus = "pending" | "under_review" | "resolved" | "dismissed";

export function canTransitionReviewStatus(from: ReviewStatus, to: ReviewStatus) {
  return from === "pending" ? to === "under_review" : from === "under_review" && (to === "resolved" || to === "dismissed");
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const username = /^[A-Za-z0-9_\u4e00-\u9fff\uac00-\ud7af]{2,30}$/u;
const reasons: readonly ReportReason[] = ["spam", "harassment", "hate", "privacy", "other"];

export function isReportTarget(type: unknown, id: unknown): type is ReportTargetType {
  return (type === "post" || type === "comment" || type === "reply") ? typeof id === "string" && uuid.test(id) : type === "profile" && typeof id === "string" && username.test(id);
}

export function reportHref(type: ReportTargetType, id: string, language: "CN" | "KR") {
  if (!isReportTarget(type, id)) return undefined;
  return `/reports/new?${new URLSearchParams({ kind: "report", targetType: type, targetId: id, lang: language })}`;
}

export function validateReportInput(input: { kind: unknown; targetType: unknown; targetId: unknown; reason: unknown; description: unknown }) {
  const kind = input.kind;
  const targetType = input.targetType;
  const targetId = input.targetId;
  const reason = input.reason;
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (kind !== "report" && kind !== "complaint") return { ok: false as const };
  if (kind === "report" && !isReportTarget(targetType, targetId)) return { ok: false as const };
  if (kind === "complaint" && (targetType || targetId) && !isReportTarget(targetType, targetId)) return { ok: false as const };
  if (!reasons.includes(reason as ReportReason) || description.length > 2000 || (kind === "complaint" && description.length < 10)) return { ok: false as const };
  return { ok: true as const, value: { kind, targetType: targetType || null, targetId: targetId || null, reason: reason as ReportReason, description } };
}

export function canSubmitReport(pending: boolean, locked: boolean) { return !pending && !locked; }
