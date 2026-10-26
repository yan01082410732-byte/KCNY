import {
  AI_CONTRACT_VERSION, AI_SERVICE_STATUS, aiKeys, aiLanguage, aiRecord, aiUuid, parseAiRequest, parseAiResponse,
  type AiContentReference, type AiDomain, type AiErrorCategory, type AiLanguage, type SearchAiRequest,
} from "./ai-integration-contract.ts";
import type { ComplaintAiInput } from "./report-ai-contract.ts";

// Server composition only. Never construct these adapters from request fields or client booleans.
// Implementations must use the current authenticated main-site session and current permissions.
// No adapter is wired to an actual provider, route, or SDK in TASK 032.
export type MainSiteAiScope = { domain: AiDomain; reference?: AiContentReference | { kind: "report"; id: string }; scope?: "public_posts" };
export type MainSiteAiAccess = {
  authorize: (scope: MainSiteAiScope) => Promise<boolean>;
  loadAuthorizedText: (reference: AiContentReference) => Promise<{ text: string; language: AiLanguage } | null>;
  loadAuthorizedComplaint: (reportId: string) => Promise<ComplaintAiInput | null>;
};
export type AiBoundaryResult = { status: "NOT_CONNECTED"; error: "not_connected"; version: typeof AI_CONTRACT_VERSION; requestId: string; domain: AiDomain }
  | { status: "REJECTED"; error: AiErrorCategory };
const reject = (error: AiErrorCategory): AiBoundaryResult => ({ status: "REJECTED", error });
const disconnected = (domain: AiDomain, requestId: string): AiBoundaryResult => ({ status: AI_SERVICE_STATUS, error: "not_connected", version: AI_CONTRACT_VERSION, requestId, domain });
const referenceValid = (value: unknown): value is AiContentReference => aiRecord(value) && aiKeys(value, ["kind", "id"]) && (value.kind === "post" || value.kind === "comment") && aiUuid(value.id);

export function createMainSiteAiBoundary(access: MainSiteAiAccess) {
  return {
    async translation(command: unknown): Promise<AiBoundaryResult> {
      if (!aiRecord(command) || !aiKeys(command, ["requestId", "reference", "targetLanguage"]) || !aiUuid(command.requestId) || !referenceValid(command.reference) || !aiLanguage(command.targetLanguage)) return reject("invalid_input");
      try {
        if (await access.authorize({ domain: "translation", reference: command.reference }) !== true) return reject("forbidden");
        const content = await access.loadAuthorizedText(command.reference);
        if (!content) return reject("forbidden");
        const request = parseAiRequest({ version: AI_CONTRACT_VERSION, requestId: command.requestId, domain: "translation", input: { text: content.text, sourceLanguage: content.language, targetLanguage: command.targetLanguage, context: command.reference.kind } });
        return request.ok ? disconnected("translation", command.requestId) : reject("invalid_input");
      } catch { return reject("unavailable"); }
    },
    async search(command: unknown): Promise<AiBoundaryResult> {
      if (!aiRecord(command) || !aiKeys(command, ["requestId", "query", "language", "scope", "limit"], ["cursor"])) return reject("invalid_input");
      const { requestId, ...input } = command;
      const request = parseAiRequest({ version: AI_CONTRACT_VERSION, requestId, domain: "search", input });
      if (!request.ok) return reject(request.error);
      try {
        if (await access.authorize({ domain: "search", scope: "public_posts" }) !== true) return reject("forbidden");
        return disconnected("search", request.value.requestId);
      } catch { return reject("unavailable"); }
    },
    async moderation(command: unknown): Promise<AiBoundaryResult> {
      if (!aiRecord(command) || !aiKeys(command, ["requestId", "reference"]) || !aiUuid(command.requestId) || !referenceValid(command.reference)) return reject("invalid_input");
      try {
        if (await access.authorize({ domain: "moderation", reference: command.reference }) !== true) return reject("forbidden");
        const content = await access.loadAuthorizedText(command.reference);
        if (!content) return reject("forbidden");
        const request = parseAiRequest({ version: AI_CONTRACT_VERSION, requestId: command.requestId, domain: "moderation", input: { contentType: command.reference.kind, contentId: command.reference.id, text: content.text, task: "risk_review" } });
        return request.ok ? disconnected("moderation", command.requestId) : reject("invalid_input");
      } catch { return reject("unavailable"); }
    },
    async complaint(command: unknown): Promise<AiBoundaryResult> {
      if (!aiRecord(command) || !aiKeys(command, ["requestId", "reportId"]) || !aiUuid(command.requestId) || !aiUuid(command.reportId)) return reject("invalid_input");
      try {
        if (await access.authorize({ domain: "complaint", reference: { kind: "report", id: command.reportId } }) !== true) return reject("forbidden");
        const input = await access.loadAuthorizedComplaint(command.reportId);
        if (!input || input.reportId !== command.reportId) return reject("forbidden");
        const request = parseAiRequest({ version: AI_CONTRACT_VERSION, requestId: command.requestId, domain: "complaint", input });
        return request.ok ? disconnected("complaint", command.requestId) : reject("invalid_input");
      } catch { return reject("unavailable"); }
    },
  };
}

export type VisibleAiSearchResult = { status: "READY" | "NO_RESULTS"; items: { postId: string; rank: number }[]; nextCursor?: string; indexVersion: string };
// This is a consumer-side gate for a future *approved* provider. Test fixtures are not inference.
// Every returned ID is checked against current main-site visibility before it may be displayed.
export async function recheckAiSearchVisibility(
  rawResponse: unknown,
  expected: SearchAiRequest,
  access: { authorize: MainSiteAiAccess["authorize"]; isPostCurrentlyVisible: (postId: string) => Promise<boolean> },
): Promise<VisibleAiSearchResult | { status: "REJECTED"; error: AiErrorCategory }> {
  const response = parseAiResponse(rawResponse, expected);
  if (!response.ok || response.value.domain !== "search") return { status: "REJECTED", error: "invalid_response" };
  if ("error" in response.value) return { status: "REJECTED", error: response.value.error };
  try {
    if (await access.authorize({ domain: "search", scope: "public_posts" }) !== true) return { status: "REJECTED", error: "forbidden" };
    const output = response.value.output;
    const checked = await Promise.all(output.items.map(async item => ({ item, visible: await access.isPostCurrentlyVisible(item.postId) === true })));
    const items = checked.filter(item => item.visible).map(item => ({ ...item.item }));
    return { status: items.length ? "READY" : "NO_RESULTS", items, indexVersion: output.indexVersion, ...(output.nextCursor ? { nextCursor: output.nextCursor } : {}) };
  } catch { return { status: "REJECTED", error: "unavailable" }; }
}
