export type Language = "zh" | "ko";

export function isLanguage(value: unknown): value is Language {
  return value === "zh" || value === "ko";
}

export function safeReturnTo(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/") && !decoded.startsWith("//") && !decoded.includes("\\") ? value : "/";
  } catch { return "/"; }
}
export function validateProfile(input: { username: string; displayName: string; email: string; password: string; confirmPassword: string }) {
  if (!/^[A-Za-z0-9_\u4e00-\u9fff\uac00-\ud7af]{2,30}$/u.test(input.username)) return "invalid_username";
  if (input.displayName.trim().length < 1 || input.displayName.trim().length > 50) return "invalid_display_name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "invalid_email";
  if (input.password.length < 8) return "weak_password";
  if (input.password !== input.confirmPassword) return "password_mismatch";
  return null;
}
