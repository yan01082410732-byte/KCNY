import type { ReportKind, ReportReason, ReviewStatus } from "./reporting.ts";
import { parseCommunityCursor, type CommunityCursor } from "./community-pagination.ts";

export const REVIEW_STATUSES = ["pending", "under_review", "resolved", "dismissed"] as const;
export const REVIEW_REASONS = ["spam", "harassment", "hate", "privacy", "other"] as const;
export const REVIEW_AGES = ["all", "24h", "7d", "30d"] as const;
export type ReviewOrder = "newest" | "oldest";
export type ReviewAge = typeof REVIEW_AGES[number];
export type ReviewQuery = {
  valid: boolean; kind?: ReportKind; reason?: ReportReason; status?: ReviewStatus;
  age: ReviewAge; order: ReviewOrder; id?: string; before?: CommunityCursor;
  asOf: string; olderThan?: string;
};
export type ReviewSearchParams = Record<string, string | string[] | undefined>;
export type ReviewSummary = { counts: Record<ReviewStatus, number>; oldest_open_created_at: string | null };
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export function isReviewCaseId(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
const timestamp = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value) && Number.isFinite(Date.parse(value));

export function parseReviewQuery(params: ReviewSearchParams, now = new Date().toISOString()): ReviewQuery {
  let valid = true;
  const value = (key: string) => {
    const raw = params[key];
    if (Array.isArray(raw)) { valid = false; return undefined; }
    return raw === "" ? undefined : raw;
  };
  const kind = value("kind"), reason = value("reason"), status = value("status");
  const age = value("age") ?? "all", order = value("order") ?? "newest";
  const id = value("id"), beforeText = value("before"), suppliedAsOf = value("asOf");
  if (kind && kind !== "report" && kind !== "complaint") valid = false;
  if (reason && !REVIEW_REASONS.includes(reason as ReportReason)) valid = false;
  if (status && !REVIEW_STATUSES.includes(status as ReviewStatus)) valid = false;
  if (!REVIEW_AGES.includes(age as ReviewAge) || (order !== "newest" && order !== "oldest")) valid = false;
  if (id && !isReviewCaseId(id)) valid = false;
  if (suppliedAsOf && (!timestamp(suppliedAsOf) || Date.parse(suppliedAsOf) > Date.parse(now) + 60_000)) valid = false;
  const asOf = suppliedAsOf && timestamp(suppliedAsOf) ? suppliedAsOf : now;
  const before = parseCommunityCursor(beforeText);
  if (beforeText && (!before || Date.parse(before.createdAt) > Date.parse(asOf))) valid = false;
  const days = age === "24h" ? 1 : age === "7d" ? 7 : age === "30d" ? 30 : 0;
  return { valid, kind: kind as ReportKind | undefined, reason: reason as ReportReason | undefined,
    status: status as ReviewStatus | undefined, age: age as ReviewAge, order: order as ReviewOrder,
    id: id?.toLowerCase(), before, asOf,
    olderThan: days ? new Date(Date.parse(asOf) - days * 86_400_000).toISOString() : undefined };
}

// Every link is constructed from validated values. No arbitrary returnTo or SQL fragment.
export function reviewQueryParams(query: ReviewQuery, language: "CN" | "KR") {
  const params = new URLSearchParams({ lang: language, asOf: query.asOf });
  if (query.kind) params.set("kind", query.kind);
  if (query.reason) params.set("reason", query.reason);
  if (query.status) params.set("status", query.status);
  if (query.age !== "all") params.set("age", query.age);
  if (query.order !== "newest") params.set("order", query.order);
  if (query.id) params.set("id", query.id);
  if (query.before) params.set("before", `${query.before.createdAt}|${query.before.id}`);
  return params;
}
export function reviewQueueHref(query: ReviewQuery, language: "CN" | "KR") { return `/reports/review?${reviewQueryParams(query, language)}`; }
export function reviewCaseHref(id: string, query: ReviewQuery, language: "CN" | "KR") {
  return isReviewCaseId(id) ? `/reports/review/${id}?${reviewQueryParams(query, language)}` : undefined;
}
export function reviewCursorFilter(cursor: CommunityCursor, order: ReviewOrder) {
  const comparison = order === "oldest" ? "gt" : "lt";
  return `created_at.${comparison}.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.${comparison}.${cursor.id})`;
}
export function reviewSummaryArgs(query: ReviewQuery) {
  return { p_kind: query.kind ?? null, p_reason: query.reason ?? null, p_older_than: query.olderThan ?? null,
    p_report_id: query.id ?? null, p_as_of: query.asOf };
}
export function parseReviewSummary(value: unknown): ReviewSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const object = value as Record<string, unknown>, counts = object.counts;
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) return null;
  const typed = counts as Record<string, unknown>;
  if (!REVIEW_STATUSES.every(status => Number.isSafeInteger(typed[status]) && Number(typed[status]) >= 0)
    || (object.oldest_open_created_at !== null && !timestamp(object.oldest_open_created_at))) return null;
  return { counts: Object.fromEntries(REVIEW_STATUSES.map(status => [status, typed[status]])) as Record<ReviewStatus, number>,
    oldest_open_created_at: object.oldest_open_created_at as string | null };
}
export function nextReviewScope(query: ReviewQuery, current: { id: string; created_at: string }): ReviewQuery {
  return { ...query, id: undefined, status: undefined, before: { id: current.id, createdAt: current.created_at } };
}
