import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { authPageHref, destinationWithLanguage, safeAuthReturnTo } from "../lib/auth.ts";

test("authentication return destinations remain internal and avoid auth loops", () => {
  assert.equal(safeAuthReturnTo("/posts/one?tab=comments#reply"), "/posts/one?tab=comments#reply");
  for (const unsafe of ["https://evil.example", "//evil.example", "/auth/login", "/auth/signup?lang=KR", "/auth/callback", "/%61uth/login", "/%2f%2fevil.example"]) {
    assert.equal(safeAuthReturnTo(unsafe), "/");
  }
});

test("auth entry links preserve the destination without exposing it as an external redirect", () => {
  const signup = new URL(authPageHref("signup", "KR", "/posts/one?tab=comments"), "https://kcny.invalid");
  assert.equal(signup.pathname, "/auth/signup");
  assert.equal(signup.searchParams.get("lang"), "KR");
  assert.equal(signup.searchParams.get("returnTo"), "/posts/one?tab=comments");
  assert.equal(authPageHref("login", "CN", "https://evil.example"), "/auth/login?lang=CN");
});

test("successful authentication keeps language and existing destination filters", () => {
  assert.equal(destinationWithLanguage("/posts/one?tab=comments#reply", "KR"), "/posts/one?tab=comments&lang=KR#reply");
  assert.equal(destinationWithLanguage("/search?lang=CN&q=hi", "KR"), "/search?lang=CN&q=hi");
  assert.equal(destinationWithLanguage("/auth/login", "KR"), "/?lang=KR");
});

test("login, registration, resend, and confirmation callback carry the safe destination", () => {
  const actions = readFileSync(new URL("../app/auth/actions.ts", import.meta.url), "utf8");
  const login = readFileSync(new URL("../app/auth/login/page.tsx", import.meta.url), "utf8");
  const signup = readFileSync(new URL("../app/auth/signup/page.tsx", import.meta.url), "utf8");
  const callback = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(actions, /emailRedirectTo: authCallbackUrl\(language, returnTo\)/);
  assert.match(actions, /if \(signUpData.session\) redirect\(destinationWithLanguage\(returnTo, language\)\)/);
  assert.match(actions, /redirect\(destinationWithLanguage\(input.returnTo, language\)\)/);
  assert.match(login, /authPageHref\("signup", language, returnTo\)/);
  assert.match(signup, /authPageHref\("login", language, returnTo\)/);
  assert.match(callback, /destinationWithLanguage\(url.searchParams.get\("next"\), language\)/);
});

test("authenticated home provides bilingual first-use navigation to existing routes", () => {
  const home = readFileSync(new URL("../components/HomePageClient.tsx", import.meta.url), "utf8");
  assert.match(home, /authenticated && username && <nav className="onboarding-links/);
  for (const route of ["/search?lang=", "/settings/profile?lang=", "/u/"]) assert.ok(home.includes(route));
  assert.match(home, /계정 설정/);
  assert.match(home, /账户设置/);
});
