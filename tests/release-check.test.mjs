import test from "node:test";
import assert from "node:assert/strict";
import { productionConfigurationChecks } from "../lib/release-check.ts";

const production = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_SUPABASE_URL: "https://czcyarmramlpmilfhpqo.supabase.co",
  NEXT_PUBLIC_SITE_URL: "https://kcny.vercel.app",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-public-key",
};

test("release configuration accepts only the intended production target", () => {
  assert.equal(Object.values(productionConfigurationChecks(production)).every(Boolean), true);
  assert.equal(productionConfigurationChecks({ ...production, VERCEL_ENV: "preview" }).productionEnvironment, false);
  assert.equal(productionConfigurationChecks({ ...production, NEXT_PUBLIC_SUPABASE_URL: "https://independent-test.supabase.co" }).productionBackend, false);
});

test("release configuration rejects localhost callbacks and missing client configuration", () => {
  assert.equal(productionConfigurationChecks({ ...production, NEXT_PUBLIC_SITE_URL: "http://localhost:3100" }).productionSite, false);
  assert.equal(productionConfigurationChecks({ ...production, NEXT_PUBLIC_SITE_URL: undefined }).productionSite, false);
  assert.equal(productionConfigurationChecks({ ...production, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: " " }).publicClientConfigured, false);
  assert.equal(productionConfigurationChecks({ ...production, NEXT_PUBLIC_SITE_URL: "https://kcny.vercel.app/" }).productionSite, true);
});

test("release configuration exposes only booleans and never credential values", () => {
  const result = productionConfigurationChecks(production);
  assert.equal(Object.values(result).every(value => typeof value === "boolean"), true);
  assert.equal(JSON.stringify(result).includes(production.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY), false);
  assert.equal(JSON.stringify(result).includes("supabase.co"), false);
});
