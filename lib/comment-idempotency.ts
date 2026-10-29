export type CommentRequest = {
  version: 1;
  requestId: string;
  viewerId: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
};

export type CommentSubmitState = {
  status: "idle" | "success" | "error" | "unknown" | "not_found" | "deleted";
  reason?: string;
  requestId?: string;
  commentId?: string;
};

export function isCommentRequestId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function commentRequestStorageKey(draftKey: string) { return `${draftKey}:request-v1`; }

export function restoreCommentRequest(raw: string | null, viewerId: string, postId: string, parentCommentId?: string): CommentRequest | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const request = value as CommentRequest;
    if (request.version !== 1 || !isCommentRequestId(request.requestId)
      || request.viewerId !== viewerId || request.postId !== postId
      || request.parentCommentId !== (parentCommentId ?? null)
      || typeof request.content !== "string" || request.content.length > 1000 || !request.content.trim()) return null;
    return request;
  } catch { return null; }
}

export function commentRequestResult(data: unknown, requestId: string): CommentSubmitState {
  if (!Array.isArray(data) || data.length !== 1 || !data[0] || typeof data[0] !== "object") {
    return { status: "unknown", reason: "network_failed", requestId };
  }
  const row = data[0] as Record<string, unknown>;
  if (row.request_id !== requestId) return { status: "unknown", reason: "network_failed", requestId };
  if (row.outcome === "conflict") return { status: "error", reason: "request_conflict", requestId };
  if (row.outcome === "not_found") return { status: "not_found", reason: "request_not_found", requestId };
  if ((row.outcome === "confirmed" || row.outcome === "deleted") && isCommentRequestId(row.comment_id)) {
    return { status: row.outcome === "confirmed" ? "success" : "deleted", requestId, commentId: row.comment_id,
      ...(row.outcome === "deleted" ? { reason: "request_deleted" } : {}) };
  }
  return { status: "unknown", reason: "network_failed", requestId };
}

export function commentRequestFailure(error: { code?: string; message?: string }, requestId: string, reply: boolean): CommentSubmitState {
  const code = error.code;
  const reason = code === "PT409" ? "request_conflict"
    : code === "42501" ? "permission"
    : code === "PGRST301" || code === "PGRST302" || code === "PGRST303" ? "auth_required"
    : code === "P0002" ? (error.message === "invalid_post" ? "invalid_post" : "invalid_parent_comment")
    : code === "22023" ? "invalid_comment"
    : code === "23503" || code === "23514" ? (reply ? "reply_failed" : "invalid_post")
    : undefined;
  // Unclassified transport/server errors may be a committed response that was
  // lost. The client must keep the same frozen request and check/retry it.
  return reason ? { status: "error", reason, requestId } : { status: "unknown", reason: "network_failed", requestId };
}

export function canClearCommentDraft(request: CommentRequest | null, state: CommentSubmitState, currentContent: string) {
  return request !== null && state.status === "success" && state.requestId === request.requestId && currentContent === request.content;
}

// A rejected transaction may be corrected without allocating another request ID.
// Unknown outcomes and conflicts remain frozen until their receipt is resolved.
export function canEditRejectedComment(state: CommentSubmitState) {
  return state.status === "error" && ["invalid_comment", "invalid_post", "invalid_parent_comment", "reply_failed", "permission", "configuration"].includes(state.reason ?? "");
}
