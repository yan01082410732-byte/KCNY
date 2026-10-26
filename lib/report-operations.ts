import { reportFailure, reportsEnvironmentEnabled, type ReportError, type ReviewStatus } from "./reporting.ts";
import type { Language } from "./auth.ts";

export const DATA_REQUEST_PAGE_SIZE = 20;
export const DATA_REQUEST_FIELDS = "id,report_id,request_kind,details,status,public_response,version,created_at,updated_at";
export const DATA_REQUEST_KINDS = ["access", "correction", "deletion"] as const;
export const DATA_REQUEST_STATUSES = ["pending", "under_review", "approved", "rejected", "fulfilled"] as const;
export type DataRequestKind = typeof DATA_REQUEST_KINDS[number];
export type DataRequestStatus = typeof DATA_REQUEST_STATUSES[number];
export type RetentionDecision = "retain" | "eligible_for_clear";
export type RetentionHold = "none" | "appeal" | "legal" | "investigation";
export type DataRequest = {
  id: string; report_id: string; request_kind: DataRequestKind; details: string;
  status: DataRequestStatus; public_response: string; version: number; created_at: string; updated_at: string;
};
export type ReviewerDataRequest = DataRequest & { internal_reason: string; approval_reference: string };
export type RetentionCandidate = {
  id: string; kind: "report" | "complaint"; status: ReviewStatus; version: number;
  created_at: string; updated_at: string; review_version: number;
  decision: RetentionDecision | "cleared" | null; hold: RetentionHold; reason: string;
  next_review_at: string | null; cleared_at: string | null;
};
export type OperationsOverview = {
  retention: RetentionCandidate[]; selected: RetentionCandidate | null; requests: ReviewerDataRequest[];
  policy: { policy_approved: boolean; policy_version: string | null };
};
export type OperationsActionState =
  | { status: "idle" }
  | { status: "success"; entityId: string; version?: number }
  | { status: "error"; reason: ReportError };

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function isOperationsId(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
const isVersion = (value: unknown, min = 1): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min;
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const isNullableDate = (value: unknown): value is string | null => value === null || isDate(value);
export function operationsEnvironmentEnabled(env: Record<string, string | undefined>) {
  return env.KCNY_REPORTING_OPERATIONS_ENABLED === "true" && reportsEnvironmentEnabled(env);
}
export function operationsFailure(error: { code?: string; message?: string } | null | undefined): ReportError {
  if (error?.code === "PT409") return "conflict";
  if (error?.code === "42501" || error?.code === "PT403") return "forbidden";
  if (error?.code === "PT400" || error?.code === "22023") return "invalid_input";
  return reportFailure(error?.message ?? "");
}
export function parseDataRequest(value: unknown): DataRequest | null {
  if (!isObject(value) || !isOperationsId(value.id) || !isOperationsId(value.report_id)
    || !DATA_REQUEST_KINDS.includes(value.request_kind as DataRequestKind) || !DATA_REQUEST_STATUSES.includes(value.status as DataRequestStatus)
    || !isText(value.details, 1000) || !isText(value.public_response, 2000) || !isVersion(value.version)
    || !isDate(value.created_at) || !isDate(value.updated_at)) return null;
  // Explicit DTO: no requester identity, internal notes, approval reference or unknown columns.
  return { id: value.id, report_id: value.report_id, request_kind: value.request_kind as DataRequestKind, details: value.details,
    status: value.status as DataRequestStatus, public_response: value.public_response, version: value.version,
    created_at: value.created_at, updated_at: value.updated_at };
}
export function parseRetentionCandidate(value: unknown): RetentionCandidate | null {
  if (!isObject(value) || !isOperationsId(value.id) || (value.kind !== "report" && value.kind !== "complaint")
    || !["pending", "under_review", "resolved", "dismissed"].includes(String(value.status)) || !isVersion(value.version)
    || !isDate(value.created_at) || !isDate(value.updated_at) || !isVersion(value.review_version, 0)
    || (value.decision !== null && value.decision !== "retain" && value.decision !== "eligible_for_clear" && value.decision !== "cleared")
    || !["none", "appeal", "legal", "investigation"].includes(String(value.hold)) || !isText(value.reason, 1000)
    || !isNullableDate(value.next_review_at) || !isNullableDate(value.cleared_at)) return null;
  return { id: value.id, kind: value.kind, status: value.status as ReviewStatus, version: value.version,
    created_at: value.created_at, updated_at: value.updated_at, review_version: value.review_version,
    decision: value.decision, hold: value.hold as RetentionHold, reason: value.reason,
    next_review_at: value.next_review_at, cleared_at: value.cleared_at };
}
export function parseOperationsOverview(value: unknown): OperationsOverview | null {
  if (!isObject(value) || !Array.isArray(value.retention) || value.retention.length > 20
    || !Array.isArray(value.requests) || value.requests.length > 20 || !isObject(value.policy)
    || typeof value.policy.policy_approved !== "boolean"
    || !(value.policy.policy_version === null || isText(value.policy.policy_version, 200))) return null;
  const retention = value.retention.map(parseRetentionCandidate);
  const requests = value.requests.map(row => {
    const request = parseDataRequest(row);
    return request && isObject(row) && isText(row.internal_reason, 1000) && isText(row.approval_reference, 120)
      ? { ...request, internal_reason: row.internal_reason, approval_reference: row.approval_reference } : null;
  });
  const selected = value.selected === null ? null : parseRetentionCandidate(value.selected);
  if (retention.some(row => row === null) || requests.some(row => row === null) || (value.selected !== null && !selected)) return null;
  return { retention: retention as RetentionCandidate[], requests: requests as ReviewerDataRequest[], selected,
    policy: { policy_approved: value.policy.policy_approved, policy_version: value.policy.policy_version as string | null } };
}
export function parseDataRequestInput(input: { reportId: unknown; requestId: unknown; kind: unknown; details: unknown }) {
  if (!isOperationsId(input.reportId) || !isOperationsId(input.requestId) || !DATA_REQUEST_KINDS.includes(input.kind as DataRequestKind)
    || typeof input.details !== "string") return null;
  const details = input.details.trim();
  if (details.length < 10 || details.length > 1000) return null;
  return { reportId: input.reportId, requestId: input.requestId, kind: input.kind as DataRequestKind, details };
}
export function parseRetentionInput(input: { reportId: unknown; caseVersion: unknown; reviewVersion: unknown; decision: unknown; hold: unknown; reason: unknown; nextReviewAt: unknown }, now = Date.now()) {
  const caseVersion = typeof input.caseVersion === "string" && /^\d+$/.test(input.caseVersion) ? Number(input.caseVersion) : input.caseVersion;
  const reviewVersion = typeof input.reviewVersion === "string" && /^\d+$/.test(input.reviewVersion) ? Number(input.reviewVersion) : input.reviewVersion;
  if (!isOperationsId(input.reportId) || !isVersion(caseVersion) || !isVersion(reviewVersion, 0)
    || (input.decision !== "retain" && input.decision !== "eligible_for_clear")
    || !["none", "appeal", "legal", "investigation"].includes(String(input.hold))
    || typeof input.reason !== "string" || typeof input.nextReviewAt !== "string") return null;
  const reason = input.reason.trim(); const next = Date.parse(input.nextReviewAt);
  if (reason.length < 5 || reason.length > 1000 || !Number.isFinite(next) || next <= now || next > now + 366 * 86400000
    || (input.decision === "eligible_for_clear" && input.hold !== "none")) return null;
  return { reportId: input.reportId, caseVersion, reviewVersion, decision: input.decision, hold: input.hold as RetentionHold, reason, nextReviewAt: new Date(next).toISOString() };
}
export function dataRequestTransitions(status: DataRequestStatus) {
  return status === "pending" ? ["under_review"] as const : status === "under_review" ? ["approved", "rejected"] as const : [];
}
export function parseDataRequestReviewInput(input: { requestId: unknown; version: unknown; nextStatus: unknown; publicResponse: unknown; internalReason: unknown; approvalReference: unknown }) {
  const version = typeof input.version === "string" && /^\d+$/.test(input.version) ? Number(input.version) : input.version;
  if (!isOperationsId(input.requestId) || !isVersion(version) || !["under_review", "approved", "rejected"].includes(String(input.nextStatus))
    || typeof input.publicResponse !== "string" || typeof input.internalReason !== "string" || typeof input.approvalReference !== "string") return null;
  const publicResponse = input.publicResponse.trim(), internalReason = input.internalReason.trim(), approvalReference = input.approvalReference.trim();
  if (publicResponse.length > 2000 || internalReason.length < 5 || internalReason.length > 1000
    || (approvalReference !== "" && !/^[A-Za-z0-9][A-Za-z0-9._:/-]{4,119}$/.test(approvalReference))
    || (input.nextStatus !== "under_review" && publicResponse.length === 0) || (input.nextStatus === "approved" && approvalReference === "")) return null;
  return { requestId: input.requestId, version, nextStatus: input.nextStatus as "under_review" | "approved" | "rejected", publicResponse, internalReason, approvalReference };
}
export function dataRequestKindLabel(kind: DataRequestKind, language: Language) {
  return { CN: { access: "查阅请求", correction: "更正请求", deletion: "删除请求" }, KR: { access: "열람 요청", correction: "정정 요청", deletion: "삭제 요청" } }[language][kind];
}
export function dataRequestStatusLabel(status: DataRequestStatus, language: Language) {
  return { CN: { pending: "待受理", under_review: "审核中", approved: "审核已批准（尚未执行）", rejected: "已拒绝", fulfilled: "已执行" }, KR: { pending: "접수 대기", under_review: "검토 중", approved: "검토 승인 (아직 미실행)", rejected: "반려", fulfilled: "실행 완료" } }[language][status];
}
export function retentionDecisionLabel(decision: RetentionDecision | "cleared" | null, language: Language) {
  return { CN: { retain: "继续保留", eligible_for_clear: "符合清理候选条件（尚未清理）", cleared: "已记录敏感文本清理", unset: "尚未复核" }, KR: { retain: "계속 보관", eligible_for_clear: "정리 후보 적격 (아직 미정리)", cleared: "민감 텍스트 정리 기록됨", unset: "아직 검토하지 않음" } }[language][decision ?? "unset"];
}
export function retentionHoldLabel(hold: RetentionHold, language: Language) {
  return { CN: { none: "无暂停原因", appeal: "待处理申诉", legal: "法律保留", investigation: "调查中" }, KR: { none: "보류 사유 없음", appeal: "이의 신청 처리 중", legal: "법적 보존", investigation: "조사 중" } }[language][hold];
}
