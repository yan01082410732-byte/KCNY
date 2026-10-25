import { createClient } from "@supabase/supabase-js";
import { maintainMediaBatch } from "../../../lib/media-maintenance.ts";
import { mediaEnvironment } from "../../../lib/post-media-policy.ts";

// Installation in production remains a separately authorized operation.
const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const code = (error: unknown) => error instanceof Error && /^maintenance_[a-z_]+$/.test(error.message) ? error.message : "maintenance_failed";
export async function handler(request: Request) {
  const environment = mediaEnvironment({ SUPABASE_URL: url, KCNY_MEDIA_ENVIRONMENT: Deno.env.get("KCNY_MEDIA_ENVIRONMENT"), KCNY_MEDIA_DEPLOYMENT_ENV: Deno.env.get("KCNY_MEDIA_DEPLOYMENT_ENV") });
  if (!environment) return json({ error: "maintenance_environment_denied" }, 403);
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  // Neither publishable API keys nor ordinary Auth JWTs grant global cleanup rights.
  const nonce = request.headers.get("x-kcny-maintenance-id") ?? "";
  const timestamp = request.headers.get("x-kcny-maintenance-time") ?? "";
  const signature = request.headers.get("x-kcny-maintenance-signature") ?? "";
  if (!/^[a-f0-9-]{36}$/.test(nonce) || !/^\d{10,11}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return json({ error: "maintenance_authentication_required" }, 401);
  const controller = new AbortController(), deadline = Date.now() + 35_000;
  const timer = setTimeout(() => controller.abort(), 42_000);
  const boundedFetch: typeof fetch = (input, init = {}) => fetch(input, { ...init, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8_000), ...(init.signal ? [init.signal] : [])]) });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: boundedFetch } });
  let run: { runId: string; lease: string; after: string | null } | undefined;
  try {
    const begun = await admin.rpc("media_maintenance_begin_v2", { p_nonce: nonce, p_timestamp: timestamp, p_signature: signature, p_environment: environment, p_project_url: url });
    if (begun.error) return json({ error: begun.error.code === "PT401" ? "maintenance_authentication_required" : "maintenance_start_failed" }, begun.error.code === "PT401" ? 401 : 503);
    if (begun.data.state === "busy") return json({ error: "maintenance_already_running" }, 409);
    run = begun.data;
    const current = run!;
    const result = await maintainMediaBatch(admin, current.after, {
      maxOwners: 3,
      canContinue: async () => {
        if (Date.now() >= deadline) return false;
        const guard = await admin.rpc("media_maintenance_guard", { p_run: current.runId, p_lease: current.lease });
        if (guard.error || !guard.data) throw Error("maintenance_lease_lost");
        return Date.now() < deadline;
      },
      progress: async progress => {
        const saved = await admin.rpc("media_maintenance_progress", { p_run: current.runId, p_lease: current.lease, p_progress: progress });
        if (saved.error) throw Error("maintenance_progress_failed");
      },
    });
    const finished = await admin.rpc("media_maintenance_finish", { p_run: current.runId, p_lease: current.lease, p_result: result, p_error: null });
    if (finished.error) throw Error("maintenance_finish_failed");
    return json({ runId: current.runId, ...finished.data }, result.failed ? 503 : 200);
  } catch (error) {
    // An unacknowledged deletion remains a durable leased job; do not fake success.
    if (run) {
      const finalizer = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(5_000) }) } });
      try { await finalizer.rpc("media_maintenance_finish", { p_run: run.runId, p_lease: run.lease, p_result: null, p_error: code(error) }); } catch { /* Expired run/job leases remain recoverable. */ }
    }
    return json({ error: code(error), runId: run?.runId }, 503);
  } finally { clearTimeout(timer); controller.abort(); }
}
Deno.serve(handler);
