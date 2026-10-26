import { createHmac, timingSafeEqual } from "node:crypto";

// Server-only composition. A receipt confirms an authenticated account, NOT a role.
export const BINDING_TTL_MS = 15 * 60 * 1000;
export type BindingActionState = { status: "idle" } | { status: "success"; receipt: string; expiresAt: string }
  | { status: "error"; reason: "unavailable" | "login_required" | "confirmation_required" };
export type BindingIdentity = { userId: string; projectRef: string; origin: string; requestId: string };
export type BindingReceipt = BindingIdentity & { version: "kcny.reviewer-binding.v1"; purpose: "self_confirmation_only"; issuedAt: number; expiresAt: number };
const testRef = "kirvcbkbkvotnsqnbcyf", prodRef = "czcyarmramlpmilfhpqo";
export const isBindingUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
function keyBytes(secret: string) {
  if (!/^[A-Za-z0-9_-]{43,86}$/.test(secret)) throw Error("binding_configuration_invalid");
  const key = Buffer.from(secret, "base64url");
  if (key.length < 32 || key.length > 64 || key.toString("base64url") !== secret) throw Error("binding_configuration_invalid");
  return key;
}
export function reviewerBindingEnvironment(env: Record<string, string | undefined>) {
  if (env.KCNY_REVIEWER_BINDING_ENABLED !== "true") return null;
  try {
    const site = new URL(env.NEXT_PUBLIC_SITE_URL ?? "");
    if (site.username || site.password || site.search || site.hash || site.pathname !== "/") return null;
    let projectRef: string;
    if (env.NEXT_PUBLIC_SUPABASE_URL === `https://${prodRef}.supabase.co` && env.VERCEL_ENV === "production" && site.origin === "https://kcny.vercel.app") projectRef = prodRef;
    else if (env.NEXT_PUBLIC_SUPABASE_URL === `https://${testRef}.supabase.co` && env.VERCEL_ENV !== "production" && site.protocol === "http:" && site.hostname === "localhost") projectRef = testRef;
    else return null;
    const secret = env.KCNY_REVIEWER_BINDING_SECRET ?? ""; keyBytes(secret);
    return { projectRef, origin: site.origin, secret };
  } catch { return null; }
}
function validIdentity(value: BindingIdentity) {
  return isBindingUuid(value.userId) && isBindingUuid(value.requestId) &&
    ((value.projectRef === prodRef && value.origin === "https://kcny.vercel.app") ||
      (value.projectRef === testRef && /^http:\/\/localhost(?::\d{1,5})?$/.test(value.origin)));
}
export function createReviewerBindingReceipt(identity: BindingIdentity, secret: string, now = Date.now()) {
  if (!validIdentity(identity) || !Number.isSafeInteger(now) || now < 0) throw Error("binding_input_invalid");
  const payload: BindingReceipt = { version: "kcny.reviewer-binding.v1", purpose: "self_confirmation_only", userId: identity.userId,
    projectRef: identity.projectRef, origin: identity.origin, requestId: identity.requestId, issuedAt: now, expiresAt: now + BINDING_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", keyBytes(secret)).update("KCNY-REVIEWER-BINDING\0" + body).digest("base64url");
  return "KCNYB1." + body + "." + signature;
}
export function verifyReviewerBindingReceipt(receipt: unknown, secret: string, expected: { projectRef: string; origin: string }, now = Date.now()): BindingReceipt | null {
  try {
    if (typeof receipt !== "string" || receipt.length > 2048 || !Number.isSafeInteger(now)) return null;
    const [prefix, body, signature, extra] = receipt.split(".");
    if (prefix !== "KCNYB1" || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(body ?? "") || !/^[A-Za-z0-9_-]{43}$/.test(signature ?? "")) return null;
    const actual = Buffer.from(signature, "base64url"), wanted = createHmac("sha256", keyBytes(secret)).update("KCNY-REVIEWER-BINDING\0" + body).digest();
    if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const keys = ["version","purpose","userId","projectRef","origin","requestId","issuedAt","expiresAt"];
    if (!p || typeof p !== "object" || Array.isArray(p) || Object.keys(p).length !== keys.length || !keys.every(k => Object.hasOwn(p,k))
      || p.version !== "kcny.reviewer-binding.v1" || p.purpose !== "self_confirmation_only" || !validIdentity(p)
      || p.projectRef !== expected.projectRef || p.origin !== expected.origin || !Number.isSafeInteger(p.issuedAt) || !Number.isSafeInteger(p.expiresAt)
      || p.issuedAt > now + 30_000 || p.issuedAt < 0 || p.expiresAt - p.issuedAt !== BINDING_TTL_MS || p.expiresAt <= now) return null;
    return p as BindingReceipt;
  } catch { return null; }
}
export function buildReviewerGrantDraft(receipt: BindingReceipt, approvedOwnerId: string, approvalReference: string, now = Date.now()) {
  if (!validIdentity(receipt) || receipt.userId !== approvedOwnerId || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{4,39}$/.test(approvalReference)
    || receipt.expiresAt <= now || receipt.issuedAt > now + 30_000 || receipt.expiresAt - receipt.issuedAt !== BINDING_TTL_MS) throw Error("binding_approval_invalid");
  // Call only AFTER signature validation. No connection is opened or SQL executed here.
  return `-- REVIEWED DRAFT ONLY: independently verify connected project ${receipt.projectRef} before execution.\n-- Signed self-confirmation is not owner approval; approval reference must be independently verified.\nBEGIN;\nSET LOCAL lock_timeout='5s';\nDO $binding033$\nBEGIN\n  IF current_user<>'postgres' THEN RAISE EXCEPTION 'management_only'; END IF;\n  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('BIND033/${receipt.requestId}',33));\n  IF clock_timestamp()>='${new Date(receipt.expiresAt).toISOString()}'::timestamptz THEN RAISE EXCEPTION 'binding_receipt_expired'; END IF;\n  IF EXISTS(SELECT 1 FROM reporting_private.reviewer_membership_events WHERE approval_reference LIKE 'BIND033/${receipt.requestId}/%') THEN RAISE EXCEPTION 'binding_receipt_already_used'; END IF;\n  PERFORM reporting_private.set_reviewer('${approvedOwnerId}'::uuid,true,'BIND033/${receipt.requestId}/${approvalReference}');\nEND;\n$binding033$;\nCOMMIT;\n`;
}
