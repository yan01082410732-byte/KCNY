import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLanguage, LANGUAGE_COOKIE, resolveLanguagePreference, shouldApplyLanguagePreference } from "@/lib/auth";

export async function updateSession(request: NextRequest) {
  const explicitLanguage = request.nextUrl.searchParams.get("lang");
  const savedLanguage = request.cookies.get(LANGUAGE_COOKIE)?.value;
  const language = resolveLanguagePreference(explicitLanguage, savedLanguage);
  const eligible = shouldApplyLanguagePreference(request.method, request.nextUrl.pathname, request.headers.get("accept") ?? "");
  if (eligible && !isLanguage(explicitLanguage) && isLanguage(savedLanguage)) {
    const destination = request.nextUrl.clone();
    destination.searchParams.set("lang", savedLanguage);
    return NextResponse.redirect(destination);
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-kcny-language", language);
  const nextResponse = () => NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const persistLanguage = (response: NextResponse) => {
    if (request.method === "GET" && isLanguage(explicitLanguage) && !request.nextUrl.pathname.startsWith("/api/") && !request.nextUrl.pathname.startsWith("/auth/callback")) response.cookies.set(LANGUAGE_COOKIE, explicitLanguage, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365, secure: request.nextUrl.protocol === "https:" });
    return response;
  };
  if (!url || !key) return persistLanguage(nextResponse());
  let response = nextResponse();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = nextResponse();
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims();
  return persistLanguage(response);
}
