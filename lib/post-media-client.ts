"use client";
import { createClient } from "@/lib/supabase/client";
import { mediaFileError } from "@/lib/post-media-policy";
export class MediaRequestError extends Error { constructor(public code: string) { super(code); } }
export async function requestMedia(body: Record<string, unknown>) {
  let response: Response;
  try { response = await fetch("/api/post-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" }); }
  catch { throw new MediaRequestError("network_failed"); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new MediaRequestError(data?.error ?? "media_request_failed");
  return data;
}
export function mediaFailureCode(error: unknown) { return error instanceof MediaRequestError ? error.code : "media_request_failed"; }
export async function uploadPostImage(postId: string, file: File, expectedVersion: number, requestId: string, onStage: (stage: "uploading" | "validating") => void) {
  const invalid = mediaFileError(file.size, file.type); if (invalid) throw new MediaRequestError(invalid);
  const reservation = await requestMedia({ operation: "reserve", postId, requestId, expectedVersion, mime: file.type, size: file.size });
  if (reservation.completed) return { imageId: reservation.uploadId, version: reservation.version };
  const client = createClient(); if (!client) throw new MediaRequestError("media_disabled");
  onStage("uploading");
  const { error } = reservation.uploaded ? { error: null } : await client.storage.from("kcny-post-staging").uploadToSignedUrl(reservation.path, reservation.token, file, { contentType: file.type, upsert: false });
  // A previous attempt may already have uploaded this immutable object. Never overwrite it.
  if (error && String("statusCode" in error ? error.statusCode : "") !== "409") throw new MediaRequestError("upload_failed");
  onStage("validating");
  return requestMedia({ operation: "finalize", uploadId: reservation.uploadId });
}
export function invalidatePostImage(postId: string) { window.dispatchEvent(new CustomEvent("kcny-post-image", { detail: postId })); }
