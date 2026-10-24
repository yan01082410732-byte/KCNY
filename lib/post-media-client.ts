"use client";
import { createClient } from "@/lib/supabase/client";
import { mediaFileError } from "@/lib/post-media-policy";
export class MediaRequestError extends Error { constructor(public code: string) { super(code); } }
const uncertainRequests = new Set<string>();
const uploadAttempts = new Map<string, { version: number; uploadId?: string }>();
async function sendMedia(body: Record<string, unknown>) {
  let response: Response;
  try { response = await fetch("/api/post-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" }); }
  catch { throw new MediaRequestError("network_failed"); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new MediaRequestError(data?.error ?? "media_request_failed");
  return data;
}
export async function requestMedia(body: Record<string, unknown>) {
  const key = body.operation === "finalize" ? `finalize:${body.uploadId}` : body.operation === "remove" ? `remove:${body.requestId}` : "";
  async function reconcile() {
    const outcome = await sendMedia({ operation: "outcome", kind: body.operation, uploadId: body.uploadId, requestId: body.requestId }).catch(() => null);
    if (outcome?.state === "committed") { uncertainRequests.delete(key); return { ...outcome.result, committed: true, cleanup: { state: "pending", reason: "recovered_result" } }; }
    throw new MediaRequestError("outcome_unknown");
  }
  if (key && uncertainRequests.has(key)) return reconcile();
  try { return await sendMedia(body); }
  catch (error) {
    if (!(error instanceof MediaRequestError) || !["network_failed", "outcome_unknown"].includes(error.code) || !["finalize", "remove"].includes(String(body.operation))) throw error;
    // Reconcile by the same identifier. Do not blindly replay the mutation.
    if (uncertainRequests.size >= 100) uncertainRequests.delete(uncertainRequests.values().next().value!);
    uncertainRequests.add(key);
    return reconcile();
  }
}
export function mediaFailureCode(error: unknown) { return error instanceof MediaRequestError ? error.code : "media_request_failed"; }
export async function uploadPostImage(postId: string, file: File, expectedVersion: number, requestId: string, onStage: (stage: "uploading" | "validating") => void) {
  const invalid = mediaFileError(file.size, file.type); if (invalid) throw new MediaRequestError(invalid);
  const key = `${postId}:${requestId}`;
  const attempt = uploadAttempts.get(key) ?? { version: expectedVersion };
  if (uploadAttempts.size >= 100 && !uploadAttempts.has(key)) uploadAttempts.delete(uploadAttempts.keys().next().value!);
  uploadAttempts.set(key, attempt);
  if (attempt.uploadId && uncertainRequests.has(`finalize:${attempt.uploadId}`)) return requestMedia({ operation: "finalize", uploadId: attempt.uploadId });
  const reservation = await requestMedia({ operation: "reserve", postId, requestId, expectedVersion: attempt.version, mime: file.type, size: file.size });
  attempt.uploadId = reservation.uploadId;
  if (reservation.completed) return { imageId: reservation.uploadId, version: reservation.version };
  const client = createClient(); if (!client) throw new MediaRequestError("media_disabled");
  onStage("uploading");
  const { error } = reservation.uploaded ? { error: null } : await client.storage.from("kcny-post-staging").uploadToSignedUrl(reservation.path, reservation.token, file, { contentType: file.type, upsert: false });
  // A previous attempt may already have uploaded this immutable object. Never overwrite it.
  if (error && String("statusCode" in error ? error.statusCode : "") !== "409") throw new MediaRequestError("upload_failed");
  onStage("validating");
  const result = await requestMedia({ operation: "finalize", uploadId: reservation.uploadId });
  uploadAttempts.delete(key);
  return result;
}
export function invalidatePostImage(postId: string) { window.dispatchEvent(new CustomEvent("kcny-post-image", { detail: postId })); }
