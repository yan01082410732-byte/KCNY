import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { isAuthErrorReason, isLanguage, normalizeLanguage } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/auth/error") {
    const rawLanguage = request.nextUrl.searchParams.get("lang");
    const rawReason = request.nextUrl.searchParams.get("reason");
    const language = normalizeLanguage(rawLanguage);
    if (!isLanguage(rawLanguage) || !isAuthErrorReason(rawReason)) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/error";
      url.search = "";
      url.searchParams.set("lang", language);
      url.searchParams.set("reason", "invalid_link");
      return NextResponse.redirect(url);
    }
  }
  return updateSession(request);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
