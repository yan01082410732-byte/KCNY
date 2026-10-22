import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinationWithLanguage, normalizeLanguage } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const language = normalizeLanguage(url.searchParams.get("lang"));
  const code = url.searchParams.get("code");
  const destination = destinationWithLanguage(url.searchParams.get("next"), language);
  const error = (reason: string) => NextResponse.redirect(new URL(`/auth/error?lang=${language}&reason=${reason}`, url.origin));

  if (!code) return error("missing_code");
  const supabase = await createClient();
  if (!supabase) return error("configuration");
  if ((await supabase.auth.exchangeCodeForSession(code)).error) return error("verification_failed");
  return NextResponse.redirect(new URL(destination, url.origin));
}
