export type ReportTargetType = "post" | "comment" | "reply" | "profile";
export type ReportReason = "spam" | "harassment" | "hate" | "privacy" | "other";
export type ReportKind = "report" | "complaint";
export type ReportError = "invalid_input" | "login_required" | "unavailable" | "invalid_target" | "conflict" | "rate_limited" | "forbidden";
export type ReportSubmissionState = { status: "idle" } | { status: "success"; reportId: string } | { status: "error"; reason: ReportError };
export const REPORT_PERSISTENCE_AVAILABLE = false;
export const REPORT_PAGE_SIZE = 20;
export const REPORT_FIELDS = "id,kind,target_type,target_id,reason,description,status,public_resolution,version,created_at,updated_at";
export type ReviewStatus = "pending" | "under_review" | "resolved" | "dismissed";

export type ReportCase = {
  id: string; kind: ReportKind; target_type: ReportTargetType | null; target_id: string | null;
  reason: ReportReason; description: string; status: ReviewStatus; public_resolution: string;
  version: number; created_at: string; updated_at: string;
};
export type ReviewEvent = { id: string; actor_id: string; from_status: ReviewStatus | null; to_status: ReviewStatus; decision_reason: string; internal_note: string; created_at: string };

// Server flag plus an exact isolated-project allowlist. Never globally enable production.
export function reportsEnvironmentEnabled(env: Record<string, string | undefined>) {
  return env.KCNY_REPORTS_ENABLED === "true" && env.NEXT_PUBLIC_SUPABASE_URL === "https://kirvcbkbkvotnsqnbcyf.supabase.co";
}
export function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === "pending" || value === "under_review" || value === "resolved" || value === "dismissed";
}
export function reportFailure(message: string): ReportError {
  if (message.includes("request_conflict") || message.includes("review_conflict")) return "conflict";
  if (message.includes("rate_limited")) return "rate_limited";
  if (message.includes("invalid_target")) return "invalid_target";
  if (message.includes("invalid_input") || message.includes("invalid_transition")) return "invalid_input";
  if (message.includes("forbidden")) return "forbidden";
  return "unavailable";
}
export function reportStatusLabel(status: ReviewStatus, language: "CN" | "KR") {
  const labels = { CN: { pending: "待受理", under_review: "审核中", resolved: "已完成", dismissed: "已驳回" }, KR: { pending: "접수 대기", under_review: "검토 중", resolved: "처리 완료", dismissed: "반려" } };
  return labels[language][status];
}
export function reportKindLabel(kind: ReportKind, language: "CN" | "KR") {
  return language === "KR" ? (kind === "report" ? "신고" : "민원") : (kind === "report" ? "举报" : "投诉");
}
export function reportReasonLabel(reason: ReportReason, language: "CN" | "KR") {
  return { CN: { spam: "垃圾信息", harassment: "骚扰", hate: "仇恨言论", privacy: "隐私侵害", other: "其他" }, KR: { spam: "스팸", harassment: "괴롭힘", hate: "혐오 표현", privacy: "개인정보 침해", other: "기타" } }[language][reason];
}
export function reportTargetLabel(target: ReportTargetType, language: "CN" | "KR") {
  return { CN: { post: "帖子", comment: "评论", reply: "回复", profile: "用户资料" }, KR: { post: "게시물", comment: "댓글", reply: "답글", profile: "프로필" } }[language][target];
}
export function reportErrorMessage(reason: ReportError, language: "CN" | "KR") {
  const labels = {
    CN: { invalid_input: "请检查填写内容和状态转换。", login_required: "请先登录。", unavailable: "暂时无法处理，请稍后重试。输入内容已保留。", invalid_target: "关联内容不存在、不可访问或类型不匹配。", conflict: "请求内容冲突或案件已被更新。请核对后重试；审核时请刷新案件。", rate_limited: "提交过于频繁，请稍后再试。", forbidden: "当前账号没有审核权限。" },
    KR: { invalid_input: "입력 내용과 상태 전환을 확인해 주세요.", login_required: "먼저 로그인해 주세요.", unavailable: "일시적으로 처리할 수 없습니다. 잠시 후 다시 시도해 주세요. 입력 내용은 보관됩니다.", invalid_target: "대상이 없거나 접근할 수 없거나 유형이 다릅니다.", conflict: "요청 내용이 충돌하거나 사건이 변경되었습니다. 확인 후 다시 시도하고 검토 시 새로고침해 주세요.", rate_limited: "제출이 너무 잦습니다. 잠시 후 다시 시도해 주세요.", forbidden: "현재 계정에는 검토 권한이 없습니다." },
  };
  return labels[language][reason];
}

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
