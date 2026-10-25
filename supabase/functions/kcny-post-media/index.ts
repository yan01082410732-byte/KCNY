import { createClient } from "@supabase/supabase-js";
import { initializeImageMagick } from "@imagemagick/magick-wasm";
import { sanitizePostImage } from "../../../lib/media-codec.ts";
import { mediaReadsAvailable, MEDIA_MAX_BYTES, mediaFileError, mediaUuid } from "../../../lib/post-media-policy.ts";
import { commitMedia, MediaOutcomeUnknown } from "../../../lib/media-commit.ts";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
let codec: Promise<void> | undefined;
async function initializeCodec() {
  if (!codec) codec = (async () => {
    // No image is sent to a third party. Only the immutable dependency is fetched.
    const response = await fetch("https://cdn.jsdelivr.net/npm/@imagemagick/magick-wasm@0.0.45/dist/x86/magick.wasm");
    if (!response.ok) throw Error("image_decoder_unavailable");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (await digest(bytes) !== "54629cbcf06dd10db38b4d87fa6ab241b248c09c94f2d9689506e5f994ac5f0c") throw Error("image_decoder_integrity");
    await initializeImageMagick(bytes);
  })().catch(error => { codec = undefined; throw error; });
  await codec;
}
async function digest(bytes: Uint8Array) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)))).map(x => x.toString(16).padStart(2, "0")).join(""); }
class Failure extends Error { constructor(public code: string, public status = 400, public uncertain = false) { super(code); } }
async function service(operation: string, actor: string | null, request: unknown) {
  const { data, error } = await admin.rpc("media_service", { p_operation: operation, p_actor: actor, p_request: request });
  if (error) throw new Failure(/^[a-z_]+$/.test(error.message) ? error.message : "media_request_failed", /^PT\d{3}$/.test(error.code) ? Number(error.code.slice(2)) : 500, !/^[0-9A-Z]{5}$/.test(error.code ?? ""));
  return data;
}
async function cleanup(actor: string) {
  const orphans = await admin.rpc("media_queue_orphans", { p_actor: actor });
  if (orphans.error) throw new Failure("cleanup_queue_failed", 503);
  const tasks = await service("cleanup_claim", actor, {}); let deleted = 0, failed = 0;
  for (const task of tasks) {
    // Only fixed module buckets and DB-generated paths, never a request path.
    if (!["kcny-post-staging", "kcny-post-images"].includes(task.bucket) || !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}(?:\.webp|\/original)$/.test(task.path)) throw new Failure("cleanup_path_invalid", 500);
    const { error } = await admin.storage.from(task.bucket).remove([task.path]);
    await service("cleanup_ack", actor, { id: task.id, lease: task.lease, success: !error });
    if (error) failed++; else deleted++;
  }
  return { deleted, failed };
}
export async function handler(req: Request) {
  try {
    if (!mediaReadsAvailable({ SUPABASE_URL: url, KCNY_MEDIA_ENVIRONMENT: Deno.env.get("KCNY_MEDIA_ENVIRONMENT"), KCNY_MEDIA_DEPLOYMENT_ENV: Deno.env.get("KCNY_MEDIA_DEPLOYMENT_ENV") })) throw new Failure("media_disabled", 403);
    if (req.method !== "POST") throw new Failure("method_not_allowed", 405);
    if (Number(req.headers.get("content-length")) > 32768) throw new Failure("invalid_request", 413);
    const reader = req.body?.getReader(); let size = 0; const chunks: Uint8Array[] = [];
    if (reader) for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 32768) { await reader.cancel(); throw new Failure("invalid_request", 413); } chunks.push(next.value); }
    const joined = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.length; }
    const raw = new TextDecoder().decode(joined);
    const input = JSON.parse(raw);
    if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(x => ["path","url","bucket","ownerId","actorId","state"].includes(x))) throw new Failure("invalid_request");
    const authorization = req.headers.get("authorization") ?? "";
    const token = authorization.replace(/^Bearer /i, "");
    const viewer = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: token.split(".").length === 3 ? { Authorization: authorization } : {} }, auth: { persistSession: false, autoRefreshToken: false } });
    let actor: string | null = null;
    if (input.operation !== "read" || token.split(".").length === 3) {
      const { data, error } = await viewer.auth.getUser(token);
      if (error || !data.user || data.user.is_anonymous) throw new Failure("authentication_required", 401);
      actor = data.user.id;
    }
    if (input.operation === "read") {
      if (!Array.isArray(input.ids) || input.ids.length > 20 || !input.ids.every(mediaUuid)) throw new Failure("invalid_request");
      const { data, error } = await viewer.from("posts").select("id").in("id", [...new Set(input.ids)]);
      if (error) throw new Failure("media_read_failed", 503);
      const images = data.length ? await service("read", actor, { ids: data.map(p => p.id) }) : [];
      const result = [];
      for (const image of images) {
        const { data, error } = await admin.storage.from("kcny-post-images").createSignedUrl(image.path, 60);
        if (error) throw new Failure("media_read_failed", 503);
        result.push({ postId: image.postId, version: image.version, width: image.width, height: image.height, url: data.signedUrl });
      }
      return Response.json({ images: result }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (!actor) throw new Failure("authentication_required", 401);
    if (input.operation === "outcome") {
      if (!["finalize", "remove"].includes(input.kind) || (input.kind === "finalize" ? !mediaUuid(input.uploadId) : !mediaUuid(input.requestId))) throw new Failure("invalid_request");
      const { data, error } = await admin.rpc("media_operation_outcome", { p_actor: actor, p_request: input });
      if (error) throw new Failure(error.code === "PT404" ? "upload_not_found" : "outcome_unknown", error.code === "PT404" ? 404 : 503);
      return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
    }
    const afterCommit = (operation: "finish" | "remove", request: Record<string, unknown>) => commitMedia({
      commit: () => service(operation, actor, request),
      uncertain: error => !(error instanceof Failure) || error.uncertain,
      reconcile: async () => {
        const { data, error } = await admin.rpc("media_operation_outcome", { p_actor: actor, p_request: { ...request, kind: operation === "finish" ? "finalize" : "remove" } });
        if (error) throw new MediaOutcomeUnknown();
        return data;
      },
      cleanup: () => cleanup(actor),
    });
    if (input.operation === "create" || input.operation === "save") {
      if (!mediaUuid(input.requestId)) throw new Failure("invalid_request");
      if (input.operation === "save") {
        const payload = input.payload;
        if (!mediaUuid(input.postId) || !payload || Object.keys(payload).sort().join(",") !== "category,content,language,title" || typeof payload.title !== "string" || typeof payload.content !== "string" || !payload.title.trim() || payload.title.trim().length > 120 || !payload.content.trim() || payload.content.trim().length > 5000 || !["culture","language","travel","study","daily","other"].includes(payload.category) || !["CN","KR"].includes(payload.language)) throw new Failure("invalid_post");
        // Real user client: ownership RLS is still enforced, not the admin client.
        const { data, error } = await viewer.from("posts").update({ title: payload.title.trim(), content: payload.content.trim(), category: payload.category, language: payload.language }).eq("id", input.postId).eq("author_id", actor).select("id").maybeSingle();
        if (error || !data) throw new Failure("post_not_owned", 403);
        return Response.json({ postId: data.id });
      }
      const { data, error } = await viewer.rpc("media_create_post", { p_request_id: input.requestId, p_payload: input.payload });
      if (error) throw new Failure(/^[a-z_]+$/.test(error.message) ? error.message : "invalid_post", /^PT\d{3}$/.test(error.code) ? Number(error.code.slice(2)) : 400);
      return Response.json({ postId: data });
    }
    if (input.operation === "cleanup") return Response.json(await cleanup(actor));
    if (["status", "reserve", "remove"].includes(input.operation)) {
      if (!mediaUuid(input.postId)) throw new Failure("invalid_request");
      if (input.operation !== "status" && (!mediaUuid(input.requestId) || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0)) throw new Failure("invalid_request");
      if (input.operation === "reserve") {
        const invalid = mediaFileError(input.size, input.mime); if (invalid) throw new Failure(invalid);
        const upload = await service("reserve", actor, { postId: input.postId, requestId: input.requestId, expectedVersion: input.expectedVersion, mime: input.mime });
        if (upload.state === "ready") return Response.json({ uploadId: upload.id, completed: true, version: upload.version });
        if (upload.state !== "pending") throw new Failure("image_conflict", 409);
        const existing = await admin.storage.from("kcny-post-staging").info(upload.stage_path);
        if (existing.data) return Response.json({ uploadId: upload.id, uploaded: true });
        const { data, error } = await admin.storage.from("kcny-post-staging").createSignedUploadUrl(upload.stage_path, { upsert: false });
        if (error) throw new Failure("upload_failed", 503);
        return Response.json({ uploadId: upload.id, path: data.path, token: data.token });
      }
      const result = input.operation === "remove" ? await afterCommit("remove", input) : await service(input.operation, actor, input);
      return Response.json(result);
    }
    if (input.operation !== "finalize" || !mediaUuid(input.uploadId)) throw new Failure("invalid_request");
    const upload = await service("begin", actor, { uploadId: input.uploadId });
    if (upload.state === "ready") return Response.json({ imageId: upload.id, version: upload.version });
    let validated: { bytes: number; width: number; height: number; sha256: string };
    try {
      const { data: raw, error } = await admin.storage.from("kcny-post-staging").download(upload.stage_path);
      if (error || !raw) throw new Failure("upload_missing", 409);
      if (raw.size < 1 || raw.size > MEDIA_MAX_BYTES) throw new Failure("file_size");
      await initializeCodec();
      const image = sanitizePostImage(new Uint8Array(await raw.arrayBuffer()), upload.claimed_mime);
      const hash = await digest(image.bytes);
      const { error: writeError } = await admin.storage.from("kcny-post-images").upload(upload.final_path, image.bytes, { contentType: "image/webp", upsert: false, cacheControl: "60" });
      if (writeError) {
        const { data: existing } = await admin.storage.from("kcny-post-images").download(upload.final_path);
        if (!existing || await digest(new Uint8Array(await existing.arrayBuffer())) !== hash) throw new Failure("image_conflict", 409);
      }
      validated = { bytes: image.bytes.length, width: image.width, height: image.height, sha256: hash };
    } catch (error) {
      await service("reject", actor, { uploadId: upload.id, lease: upload.lease }).catch(() => {});
      throw error;
    }
    // Past this boundary, finish may have committed even if its response is lost.
    // Never reject a possibly/definitely committed upload because cleanup failed.
    return Response.json(await afterCommit("finish", { uploadId: upload.id, lease: upload.lease, ...validated }));
  } catch (error) {
    if (error instanceof MediaOutcomeUnknown) return Response.json({ error: "outcome_unknown" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const allowed = error instanceof Failure ? error.code : error instanceof Error && /^(file_|image_)[a-z_]+$/.test(error.message) ? error.message : "image_processing_failed";
    return Response.json({ error: allowed }, { status: error instanceof Failure ? error.status : 400, headers: { "Cache-Control": "no-store" } });
  }
}
Deno.serve(handler);
