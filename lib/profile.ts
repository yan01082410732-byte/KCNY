export type ProfileLanguage = "CN" | "KR";

export const PUBLIC_PROFILE_FIELDS =
  "username, display_name, bio, preferred_language, created_at";

export type PublicProfile = {
  username: string;
  display_name: string | null;
  bio: string | null;
  preferred_language: ProfileLanguage;
  created_at: string;
};

export function isSafeUsername(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9_\u4e00-\u9fff\uac00-\ud7af]{2,30}$/u.test(value)
  );
}

export function profileAvatarInitial(
  profile: Pick<PublicProfile, "display_name" | "username">,
) {
  const source = profile.display_name?.trim() || profile.username.trim();
  return Array.from(source)[0] || "K";
}

export function validateProfileUpdate(input: {
  displayName: unknown;
  bio: unknown;
  preferredLanguage: unknown;
}) {
  const displayName =
    typeof input.displayName === "string" ? input.displayName.trim() : "";
  const bio = typeof input.bio === "string" ? input.bio.trim() : "";

  if (displayName.length < 1 || displayName.length > 50) {
    return { error: "invalid_display_name" as const };
  }
  if (bio.length > 500) {
    return { error: "invalid_bio" as const };
  }
  if (input.preferredLanguage !== "CN" && input.preferredLanguage !== "KR") {
    return { error: "invalid_language" as const };
  }

  return {
    error: null,
    displayName,
    bio,
    preferredLanguage: input.preferredLanguage,
  };
}
