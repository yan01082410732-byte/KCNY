import { createClient } from "@/lib/supabase/server";
import { mediaReadsAvailable, mediaWritesAvailable, mediaUuid } from "@/lib/post-media-policy";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
async function invoke(body: Record<string, unknown>) {
  const supabase = await createClient();
  if (!supabase) return Response.json({ error: "media_disabled" }, { status: 503, headers });
  const { data, error } = await supabase.functions.invoke("kcny-post-media", { body });
  if (error) {
    const response = "context" in error && error.context instanceof Response ? error.context : null;
    const failure = response ? await response.json().catch(() => null) : null;
    return Response.json({ error: typeof failure?.error === "string" && /^[a-z_]+$/.test(failure.error) ? failure.error : "media_request_failed" }, { status: response?.status ?? 503, headers });
  }
  return Response.json(data, { headers });
}
export async function GET(request: Request) {
  if (!mediaReadsAvailable(process.env)) return Response.json({ images: [] }, { headers });
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") ?? "").split(","))];
  if (!ids.length || ids.length > 20 || !ids.every(mediaUuid)) return Response.json({ error: "invalid_request" }, { status: 400, headers });
  return invoke({ operation: "read", ids });
}
export async function POST(request: Request) {
  if (!mediaReadsAvailable(process.env)) return Response.json({ error: "media_disabled" }, { status: 403, headers });
  // Cookies authorize the caller; this endpoint never accepts file bodies or arbitrary URLs.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "invalid_origin" }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length")) > 32768) return Response.json({ error: "invalid_request" }, { status: 413, headers });
  const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  if (reader) for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 32768) { await reader.cancel(); return Response.json({ error: "invalid_request" }, { status: 413, headers }); } chunks.push(next.value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes) || "null"); } catch { return Response.json({ error: "invalid_request" }, { status: 400, headers }); }
  if (!body || typeof body !== "object" || Array.isArray(body) || !["create","save","reserve","finalize","status","remove","cleanup","outcome"].includes(body.operation)) return Response.json({ error: "invalid_request" }, { status: 400, headers });
  if (!["status","cleanup","outcome"].includes(body.operation) && !mediaWritesAvailable(process.env)) return Response.json({ error: "media_disabled" }, { status: 403, headers });
  const client = await createClient();
  const user = await client?.auth.getUser();
  if (!user?.data.user) return Response.json({ error: "authentication_required" }, { status: 401, headers });
  return invoke(body);
}
