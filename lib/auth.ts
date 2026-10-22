export type Language = "CN" | "KR";

export const AUTH_ERROR_REASONS = [
  "missing_code",
  "configuration",
  "verification_failed",
  "invalid_link",
] as const;

export type AuthErrorReason = (typeof AUTH_ERROR_REASONS)[number];

export function isAuthErrorReason(value: unknown): value is AuthErrorReason {
  return (
    typeof value === "string" &&
    AUTH_ERROR_REASONS.includes(value as AuthErrorReason)
  );
}

export function isLanguage(value: unknown): value is Language {
  return value === "CN" || value === "KR";
}

export function normalizeLanguage(value: unknown): Language {
  return value === "KR" ? "KR" : "CN";
}

export const LANGUAGE_COOKIE = "kcny-language";

export function resolveLanguagePreference(query: unknown, stored: unknown): Language {
  return isLanguage(query) ? query : isLanguage(stored) ? stored : "CN";
}

export function shouldApplyLanguagePreference(method: string, pathname: string, accept: string) {
  return method === "GET" && accept.includes("text/html") && !pathname.startsWith("/auth/callback") && !pathname.startsWith("/api/");
}

export function htmlLanguage(value: Language) {
  return value === "KR" ? "ko-KR" : "zh-CN";
}

export function safeReturnTo(value: unknown) {
  if (
    typeof value !== "string" ||
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\x00-\x1f]/.test(value)
  ) {
    return "/";
  }

  let decoded = value;
  for (let index = 0; index < 2; index += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return "/";
    }
  }

  return decoded.startsWith("/") &&
    !decoded.startsWith("//") &&
    !decoded.includes("\\")
    ? value
    : "/";
}

export function safeAuthReturnTo(value: unknown) {
  const destination = safeReturnTo(value);
  let pathname = new URL(destination, "https://kcny.invalid").pathname;
  for (let index = 0; index < 2; index += 1) {
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      return "/";
    }
  }
  return pathname === "/auth" || pathname.startsWith("/auth/")
    ? "/"
    : destination;
}

export function authPageHref(page: "login" | "signup", language: Language, returnTo: unknown, status?: { kind: "error" | "notice"; value: string }) {
  const query = new URLSearchParams({ lang: language });
  const destination = safeAuthReturnTo(returnTo);
  if (destination !== "/") query.set("returnTo", destination);
  if (status) query.set(status.kind, status.value);
  return `/auth/${page}?${query.toString()}`;
}

export function destinationWithLanguage(returnTo: unknown, language: Language) {
  const destination = new URL(safeAuthReturnTo(returnTo), "https://kcny.invalid");
  if (!destination.searchParams.has("lang")) destination.searchParams.set("lang", language);
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && email.test(value.trim());
}

export function validateSignUp(input: {
  username: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  preferredLanguage: unknown;
}) {
  if (!/^[A-Za-z0-9_\u4e00-\u9fff\uac00-\ud7af]{2,30}$/u.test(input.username)) {
    return "invalid_username";
  }
  if (input.displayName.trim().length < 1 || input.displayName.trim().length > 50) {
    return "invalid_display_name";
  }
  if (!isValidEmail(input.email)) {
    return "invalid_email";
  }
  if (input.password.length < 8) {
    return "weak_password";
  }
  if (input.password !== input.confirmPassword) {
    return "password_mismatch";
  }
  if (!isLanguage(input.preferredLanguage)) {
    return "invalid_language";
  }
  return null;
}

export function validateSignIn(input: {
  email: string;
  password: string;
  language: unknown;
  returnTo: unknown;
}) {
  if (!isLanguage(input.language)) {
    return "invalid_language";
  }
  if (!isValidEmail(input.email)) {
    return "invalid_email";
  }
  if (!input.password) {
    return "invalid_password";
  }
  return null;
}

export function validateResendConfirmation(input: {
  email: unknown;
  language: unknown;
}) {
  if (!isLanguage(input.language)) {
    return "invalid_language";
  }
  if (!isValidEmail(input.email)) {
    return "invalid_email";
  }
  return null;
}
