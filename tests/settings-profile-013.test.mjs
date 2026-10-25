import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveLanguagePreference, shouldApplyLanguagePreference } from "../lib/auth.ts";
import { validateProfileUpdate } from "../lib/profile.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("explicit language wins and invalid saved preference falls back safely", () => {
  assert.equal(resolveLanguagePreference("CN", "KR"), "CN");
  assert.equal(resolveLanguagePreference("KR", "CN"), "KR");
  assert.equal(resolveLanguagePreference(undefined, "KR"), "KR");
  assert.equal(resolveLanguagePreference(undefined, "invalid"), "CN");
});
test("language cookie is only used for document GETs", () => {
  assert.equal(shouldApplyLanguagePreference("GET", "/search", "text/html"), true);
  assert.equal(shouldApplyLanguagePreference("POST", "/auth/login", "text/html"), false);
  assert.equal(shouldApplyLanguagePreference("GET", "/auth/callback", "text/html"), false);
  assert.equal(shouldApplyLanguagePreference("GET", "/api/posts", "text/html"), false);
});
test("profile accepts supported public fields and rejects invalid values", () => {
  assert.deepEqual(validateProfileUpdate({ displayName: "  민지  ", bio: " 소개 ", preferredLanguage: "KR" }), { error: null, displayName: "민지", bio: "소개", preferredLanguage: "KR" });
  assert.equal(validateProfileUpdate({ displayName: "", bio: "", preferredLanguage: "CN" }).error, "invalid_display_name");
  assert.equal(validateProfileUpdate({ displayName: "Name", bio: "", preferredLanguage: "invalid" }).error, "invalid_language");
});
test("profile mutation is claim-scoped and confirms an updated row", () => {
  const action = read("app/settings/profile/actions.ts");
  assert.match(action, /auth\.getClaims\(\)/);
  assert.match(action, /\.eq\("id", userId\)/);
  assert.match(action, /\.select\("username"\)/);
  assert.match(action, /if \(error \|\| !data\)/);
  assert.doesNotMatch(action, /formData\.get\("userId"\)/);
});
test("settings preserves profile edits and uses persisted notification preferences", () => {
  const client = read("components/ProfileSettingsClient.tsx");
  assert.match(client, /sessionStorage\.setItem\(draftKey\(profile\.username\)/);
  assert.match(client, /sessionStorage\.removeItem\(draftKey\(profile\.username\)/);
  assert.match(client, /role="alert"/);
  assert.match(client, /<NotificationPreferences language=\{language\}/);
  assert.match(read("components/NotificationPreferences.tsx"), /api\/notification-preferences/);
  assert.match(read("app/api/notification-preferences/route.ts"), /rpc\("set_notification_preferences"/);
  assert.doesNotMatch(client, /type="checkbox"/);
});
