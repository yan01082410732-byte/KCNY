import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { normalizeLanguage } from "@/lib/auth";
import { attemptSignOut } from "@/lib/service-errors";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const formData = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data") ? await request.formData() : new FormData();
  const language = normalizeLanguage(formData.get("language"));
  const response = NextResponse.redirect(new URL(`/?lang=${language}`, request.url), 303);
  function failure(category: string) {
    console.error("KCNY service failure", { operation: "sign-out", category });
    const failed = NextResponse.redirect(new URL(`/auth/logout-error?lang=${language}`, request.url), 303);
    // Preserve any cookie changes made by the client even when remote revocation fails.
    response.cookies.getAll().forEach((cookie) => failed.cookies.set(cookie));
    return failed;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return failure("configuration");
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const result = await attemptSignOut(() => supabase.auth.signOut());
  if (!result.ok) return failure(result.category);

  return response;
}
