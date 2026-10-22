"use server";

import { redirect } from "next/navigation";
import {
  authPageHref,
  destinationWithLanguage,
  isLanguage,
  normalizeLanguage,
  safeAuthReturnTo,
  validateResendConfirmation,
  validateSignIn,
  validateSignUp,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { classifyAuthError, logServiceFailure, type AuthFailure } from "@/lib/service-errors";

function authCallbackUrl(language: "CN" | "KR", returnTo: string) {
  const url = new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
  url.searchParams.set("lang", language);
  if (returnTo !== "/") url.searchParams.set("next", returnTo);
  return url.toString();
}

export async function signUp(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const preferredLanguage = formData.get("preferredLanguage");
  const returnTo = safeAuthReturnTo(formData.get("returnTo"));

  if (!isLanguage(rawLanguage) || !isLanguage(preferredLanguage)) {
    redirect(authPageHref("signup", language, returnTo, { kind: "error", value: "invalid_language" }));
  }

  const input = {
    username: String(formData.get("username") || ""),
    displayName: String(formData.get("displayName") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    confirmPassword: String(formData.get("confirmPassword") || ""),
    preferredLanguage,
  };
  const error = validateSignUp(input);

  if (error) {
    redirect(authPageHref("signup", language, returnTo, { kind: "error", value: error }));
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(authPageHref("signup", language, returnTo, { kind: "error", value: "configuration" }));
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: authCallbackUrl(language, returnTo),
      data: {
        username: input.username,
        display_name: input.displayName,
        preferred_language: preferredLanguage,
      },
    },
  });

  if (signUpError) {
    redirect(authPageHref("signup", language, returnTo, { kind: "error", value: "auth_failed" }));
  }

  if (signUpData.session) redirect(destinationWithLanguage(returnTo, language));
  redirect(authPageHref("login", language, returnTo, { kind: "notice", value: "check_email" }));
}

export async function signIn(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const returnTo = safeAuthReturnTo(formData.get("returnTo"));

  if (!isLanguage(rawLanguage)) {
    redirect(authPageHref("login", language, returnTo, { kind: "error", value: "invalid_language" }));
  }

  const input = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    language,
    returnTo,
  };
  const error = validateSignIn(input);

  if (error) {
    redirect(authPageHref("login", language, returnTo, { kind: "error", value: error }));
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(authPageHref("login", language, returnTo, { kind: "error", value: "configuration" }));
  }

  let failure: AuthFailure | undefined;
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (signInError) {
      failure = classifyAuthError(signInError);
      logServiceFailure("sign-in", signInError);
    }
  } catch (error) {
    failure = classifyAuthError(error);
    logServiceFailure("sign-in", error);
  }
  if (failure) redirect(authPageHref("login", language, returnTo, { kind: "error", value: failure }));

  redirect(destinationWithLanguage(input.returnTo, language));
}

export async function resendConfirmation(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const returnTo = safeAuthReturnTo(formData.get("returnTo"));
  const email = String(formData.get("email") || "");
  const error = validateResendConfirmation({
    email,
    language: rawLanguage,
  });

  if (error) {
    redirect(authPageHref("login", language, returnTo, { kind: "error", value: error }));
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(authPageHref("login", language, returnTo, { kind: "error", value: "configuration" }));
  }

  const { error: resendError } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: authCallbackUrl(language, returnTo),
    },
  });

  if (resendError) {
    redirect(authPageHref("login", language, returnTo, { kind: "error", value: "resend_failed" }));
  }

  redirect(authPageHref("login", language, returnTo, { kind: "notice", value: "confirmation_resent" }));
}
