"use server";

import { redirect } from "next/navigation";
import {
  isLanguage,
  normalizeLanguage,
  safeReturnTo,
  validateResendConfirmation,
  validateSignIn,
  validateSignUp,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function authCallbackUrl(language: "CN" | "KR") {
  return `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?lang=${language}`;
}

export async function signUp(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const preferredLanguage = formData.get("preferredLanguage");

  if (!isLanguage(rawLanguage) || !isLanguage(preferredLanguage)) {
    redirect(`/auth/signup?lang=${language}&error=invalid_language`);
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
    redirect(`/auth/signup?lang=${language}&error=${error}`);
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(`/auth/signup?lang=${language}&error=configuration`);
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: authCallbackUrl(language),
      data: {
        username: input.username,
        display_name: input.displayName,
        preferred_language: preferredLanguage,
      },
    },
  });

  if (signUpError) {
    redirect(`/auth/signup?lang=${language}&error=auth_failed`);
  }

  redirect(`/auth/login?lang=${language}&notice=check_email`);
}

export async function signIn(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);

  if (!isLanguage(rawLanguage)) {
    redirect(`/auth/login?lang=${language}&error=invalid_language`);
  }

  const input = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    language,
    returnTo: safeReturnTo(formData.get("returnTo")),
  };
  const error = validateSignIn(input);

  if (error) {
    redirect(`/auth/login?lang=${language}&error=${error}`);
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(`/auth/login?lang=${language}&error=configuration`);
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError) {
    redirect(`/auth/login?lang=${language}&error=auth_failed`);
  }

  redirect(input.returnTo);
}

export async function resendConfirmation(formData: FormData) {
  const rawLanguage = formData.get("language");
  const language = normalizeLanguage(rawLanguage);
  const email = String(formData.get("email") || "");
  const error = validateResendConfirmation({
    email,
    language: rawLanguage,
  });

  if (error) {
    redirect(`/auth/login?lang=${language}&error=${error}`);
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(`/auth/login?lang=${language}&error=configuration`);
  }

  const { error: resendError } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: authCallbackUrl(language),
    },
  });

  if (resendError) {
    redirect(`/auth/login?lang=${language}&error=resend_failed`);
  }

  redirect(`/auth/login?lang=${language}&notice=confirmation_resent`);
}
