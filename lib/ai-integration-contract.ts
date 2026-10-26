import type { ComplaintAiInput, ComplaintAiSuggestion, HumanReviewDecision } from "./report-ai-contract.ts";

// DTOs only: this module neither calls a model nor performs an application mutation.
export type { ComplaintAiInput, ComplaintAiSuggestion, HumanReviewDecision } from "./report-ai-contract.ts";
export const AI_CONTRACT_VERSION = "kcny.ai.v1" as const;
export const AI_SERVICE_STATUS = "NOT_CONNECTED" as const;
export const AI_SEARCH_LIMIT = 20;
export type AiLanguage = "CN" | "KR";
export type AiDomain = "translation" | "search" | "moderation" | "complaint";
export type AiErrorCategory = "invalid_input" | "unsupported_version" | "forbidden" | "not_connected" | "unavailable" | "invalid_response";
export type AiValidation<T> = { ok: true; value: T } | { ok: false; error: AiErrorCategory };
export type AiContentReference = { kind: "post" | "comment"; id: string };
export type TranslationAiInput = { text: string; sourceLanguage: AiLanguage; targetLanguage: AiLanguage; context: "post" | "comment" | "interface" };
export type SearchAiInput = { query: string; language: AiLanguage; scope: "public_posts"; limit: number; cursor?: string };
export type ModerationAiInput = { contentType: "post" | "comment"; contentId: string; text: string; task: "risk_review" };
type Request<D extends AiDomain, I> = { version: typeof AI_CONTRACT_VERSION; requestId: string; domain: D; input: I };
export type TranslationAiRequest = Request<"translation", TranslationAiInput>;
export type SearchAiRequest = Request<"search", SearchAiInput>;
export type ModerationAiRequest = Request<"moderation", ModerationAiInput>;
export type ComplaintAiRequest = Request<"complaint", ComplaintAiInput>;
export type AiRequest = TranslationAiRequest | SearchAiRequest | ModerationAiRequest | ComplaintAiRequest;
export type TranslationAiOutput = { translatedText: string; modelVersion: string };
export type SearchAiOutput = { items: { postId: string; rank: number }[]; indexVersion: string; nextCursor?: string };
export type ModerationAiOutput = {
  source: "ai_suggestion"; category: ComplaintAiInput["category"] | "none" | "uncertain";
  risk: ComplaintAiSuggestion["risk"]; rationale: string; uncertain: boolean; modelVersion: string;
};
export type ComplaintAiOutput = { suggestion: ComplaintAiSuggestion; priority: "routine" | "priority" | "urgent" | "uncertain"; modelVersion: string };
type Response<D extends AiDomain, O> = { version: typeof AI_CONTRACT_VERSION; requestId: string; domain: D; status: "READY"; output: O };
export type AiResponse = Response<"translation", TranslationAiOutput> | Response<"search", SearchAiOutput>
  | Response<"moderation", ModerationAiOutput> | Response<"complaint", ComplaintAiOutput>
  | { version: typeof AI_CONTRACT_VERSION; requestId: string; domain: "search"; status: "NO_RESULTS"; output: SearchAiOutput }
  | { version: typeof AI_CONTRACT_VERSION; requestId: string; domain: AiDomain; status: "NOT_CONNECTED" | "UNAVAILABLE"; error: "not_connected" | "unavailable" };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reasons = ["spam", "harassment", "hate", "privacy", "other"] as const;
const risks = ["low", "medium", "high", "uncertain"] as const;
export function aiUuid(value: unknown): value is string { return typeof value === "string" && uuid.test(value); }
export function aiLanguage(value: unknown): value is AiLanguage { return value === "CN" || value === "KR"; }
export function aiText(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= max && (allowEmpty || value.trim().length > 0) && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value);
}
export function aiRecord(value: unknown): value is Record<string, unknown> {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return (prototype === Object.prototype || prototype === null) && Reflect.ownKeys(value).every(key => typeof key === "string" && "value" in Object.getOwnPropertyDescriptor(value, key)!);
  } catch { return false; }
}
export function aiKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) {
  return required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
}
const cursor = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,256}$/.test(value);
const model = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,99}$/.test(value);
const contains = <T extends string>(values: readonly T[], value: unknown): value is T => typeof value === "string" && values.includes(value as T);
function complaintInput(value: unknown): value is ComplaintAiInput {
  return aiRecord(value) && aiKeys(value, ["reportId", "language", "category", "complaintText"], ["evidenceText"])
    && aiUuid(value.reportId) && aiLanguage(value.language) && contains(reasons, value.category)
    && aiText(value.complaintText, 2000, true) && (!Object.hasOwn(value, "evidenceText") || aiText(value.evidenceText, 2000, true));
}
function inputValid(domain: unknown, input: unknown) {
  if (!aiRecord(input)) return false;
  if (domain === "translation") return aiKeys(input, ["text", "sourceLanguage", "targetLanguage", "context"])
    && aiText(input.text, 8000) && aiLanguage(input.sourceLanguage) && aiLanguage(input.targetLanguage)
    && input.sourceLanguage !== input.targetLanguage && contains(["post", "comment", "interface"], input.context);
  if (domain === "search") return aiKeys(input, ["query", "language", "scope", "limit"], ["cursor"])
    && aiText(input.query, 200) && aiLanguage(input.language) && input.scope === "public_posts"
    && Number.isSafeInteger(input.limit) && Number(input.limit) >= 1 && Number(input.limit) <= AI_SEARCH_LIMIT
    && (!Object.hasOwn(input, "cursor") || cursor(input.cursor));
  if (domain === "moderation") return aiKeys(input, ["contentType", "contentId", "text", "task"])
    && contains(["post", "comment"], input.contentType) && aiUuid(input.contentId) && aiText(input.text, 8000) && input.task === "risk_review";
  return domain === "complaint" && complaintInput(input);
}
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
export function parseAiRequest(value: unknown): AiValidation<AiRequest> {
  try {
    if (!aiRecord(value) || !aiKeys(value, ["version", "requestId", "domain", "input"])) return { ok: false, error: "invalid_input" };
    if (value.version !== AI_CONTRACT_VERSION) return { ok: false, error: "unsupported_version" };
    if (!aiUuid(value.requestId) || !inputValid(value.domain, value.input)) return { ok: false, error: "invalid_input" };
    return { ok: true, value: clone(value) as AiRequest };
  } catch { return { ok: false, error: "invalid_input" }; }
}
function suggestionValid(value: unknown): value is ComplaintAiSuggestion {
  return aiRecord(value) && aiKeys(value, ["source", "category", "risk", "summary", "recommendedReview"], ["translatedText"])
    && value.source === "ai_suggestion" && contains(reasons, value.category) && contains(risks, value.risk)
    && aiText(value.summary, 2000) && aiText(value.recommendedReview, 1000)
    && (!Object.hasOwn(value, "translatedText") || aiText(value.translatedText, 4000));
}
function outputValid(request: AiRequest, output: unknown, status: unknown) {
  if (!aiRecord(output)) return false;
  if (request.domain === "translation") return status === "READY" && aiKeys(output, ["translatedText", "modelVersion"]) && aiText(output.translatedText, 16000) && model(output.modelVersion);
  if (request.domain === "search") {
    if (!aiKeys(output, ["items", "indexVersion"], ["nextCursor"]) || !model(output.indexVersion) || !Array.isArray(output.items)
      || output.items.length > request.input.limit || (!output.items.length ? status !== "NO_RESULTS" : status !== "READY")
      || (Object.hasOwn(output, "nextCursor") && !cursor(output.nextCursor))) return false;
    if (Object.keys(output.items).length !== output.items.length || Reflect.ownKeys(output.items).some(key => key !== "length" && (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || !("value" in Object.getOwnPropertyDescriptor(output.items, key)!)))) return false;
    const ids = new Set<string>(); let previousRank = 0;
    return output.items.every(item => {
      if (!aiRecord(item) || !aiKeys(item, ["postId", "rank"]) || !aiUuid(item.postId) || ids.has(item.postId)
        || !Number.isSafeInteger(item.rank) || Number(item.rank) <= previousRank || Number(item.rank) > 1000000) return false;
      ids.add(item.postId); previousRank = Number(item.rank); return true;
    });
  }
  if (request.domain === "moderation") return status === "READY" && aiKeys(output, ["source", "category", "risk", "rationale", "uncertain", "modelVersion"])
    && output.source === "ai_suggestion" && contains([...reasons, "none", "uncertain"], output.category) && contains(risks, output.risk)
    && aiText(output.rationale, 2000) && typeof output.uncertain === "boolean" && model(output.modelVersion)
    && (!(output.category === "uncertain" || output.risk === "uncertain") || output.uncertain === true);
  return status === "READY" && aiKeys(output, ["suggestion", "priority", "modelVersion"]) && suggestionValid(output.suggestion)
    && contains(["routine", "priority", "urgent", "uncertain"], output.priority) && model(output.modelVersion);
}
export function parseAiResponse(value: unknown, expected: AiRequest): AiValidation<AiResponse> {
  try {
    if (!parseAiRequest(expected).ok || !aiRecord(value) || value.version !== AI_CONTRACT_VERSION
      || value.requestId !== expected.requestId || value.domain !== expected.domain) return { ok: false, error: "invalid_response" };
    if (value.status === "NOT_CONNECTED" || value.status === "UNAVAILABLE") {
      if (!aiKeys(value, ["version", "requestId", "domain", "status", "error"]) || value.error !== (value.status === "NOT_CONNECTED" ? "not_connected" : "unavailable")) return { ok: false, error: "invalid_response" };
    } else if (!aiKeys(value, ["version", "requestId", "domain", "status", "output"]) || !outputValid(expected, value.output, value.status)) return { ok: false, error: "invalid_response" };
    return { ok: true, value: clone(value) as AiResponse };
  } catch { return { ok: false, error: "invalid_response" }; }
}
