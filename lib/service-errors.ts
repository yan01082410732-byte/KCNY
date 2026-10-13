export type AuthFailure = "invalid_credentials" | "configuration" | "service_unavailable" | "rate_limit" | "auth_unknown";

export function classifyAuthError(error: unknown): AuthFailure {
  const value = error as { code?: unknown; status?: unknown; name?: unknown } | null;
  if (value?.code === "invalid_credentials" || value?.code === "email_not_confirmed" || value?.code === "user_banned") return "invalid_credentials";
  if (value?.status === 429 || value?.code === "over_request_rate_limit" || value?.code === "over_email_send_rate_limit") return "rate_limit";
  if (value?.code === "configuration" || value?.code === "invalid_api_key") return "configuration";
  if (value?.name === "AuthRetryableFetchError" || value?.name === "TypeError" || value?.status === 0 || (typeof value?.status === "number" && value.status >= 500)) return "service_unavailable";
  return "auth_unknown";
}

// Only fixed categories are logged; raw backend errors can contain private data.
export function logServiceFailure(operation: string, error: unknown) {
  console.error("KCNY service failure", { operation, category: classifyAuthError(error) });
}

export function contentLoadState(error: unknown, rowCount: number) {
  return error ? "unavailable" : rowCount === 0 ? "empty" : "ready";
}

export async function attemptSignOut(signOut: () => Promise<{ error: unknown }>) {
  try {
    const { error } = await signOut();
    return error ? { ok: false as const, category: classifyAuthError(error) } : { ok: true as const };
  } catch (error) {
    return { ok: false as const, category: classifyAuthError(error) };
  }
}
