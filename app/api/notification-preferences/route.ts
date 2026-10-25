import { createClient } from "@/lib/supabase/server";
import { loadNotificationPreferences, parseNotificationPreferences, persistNotificationPreferences } from "@/lib/notification-preferences";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const failure = (error: string, status: number) => Response.json({ error }, { status, headers });

async function viewer() {
  const client = await createClient();
  if (!client) throw Error("configuration_unavailable");
  const result = await client.auth.getUser();
  if (result.error && (!result.error.status || result.error.status >= 500)) throw Error("authentication_service_unavailable");
  return !result.error && result.data.user && !result.data.user.is_anonymous ? { client, id: result.data.user.id } : null;
}
export async function GET() {
  try {
    const user = await viewer();
    if (!user) return failure("authentication_required", 401);
    const preferences = await loadNotificationPreferences(() => user.client.from("notification_preferences")
      .select("post_comment,comment_reply,post_like,new_follower").eq("user_id", user.id).maybeSingle());
    return preferences ? Response.json({ preferences }, { headers }) : failure("load_failed", 503);
  } catch { return failure("load_failed", 503); }
}
export async function PUT(request: Request) {
  try {
    if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return failure("invalid_origin", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return failure("invalid_request", 400);
    const user = await viewer();
    if (!user) return failure("authentication_required", 401);
    const reader = request.body?.getReader(), chunks: Uint8Array[] = []; let size = 0;
    if (reader) for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length; if (size > 4096) { await reader.cancel(); return failure("invalid_request", 413); } chunks.push(next.value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let value: unknown;
    try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { return failure("invalid_request", 400); }
    const input = parseNotificationPreferences(value);
    if (!input) return failure("invalid_request", 400);
    const preferences = await persistNotificationPreferences(input, () => user.client.rpc("set_notification_preferences", {
      p_post_comment: input.post_comment, p_comment_reply: input.comment_reply, p_post_like: input.post_like, p_new_follower: input.new_follower,
    }));
    return preferences ? Response.json({ preferences }, { headers }) : failure("save_failed", 503);
  } catch { return failure("save_failed", 503); }
}
