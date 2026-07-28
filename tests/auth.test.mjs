import test from "node:test";
import assert from "node:assert/strict";
import { safeReturnTo, validateProfile, isLanguage } from "../lib/auth.ts";
test("safe return paths", () => { assert.equal(safeReturnTo("/"), "/"); assert.equal(safeReturnTo("/profile"), "/profile"); });
test("unsafe return paths", () => { for (const path of ["//evil.com", "https://evil.com", "/\\evil", "/%2f%2fevil.com"]) assert.equal(safeReturnTo(path), "/"); });
test("profile validation", () => { assert.equal(validateProfile({username:"valid_name",displayName:"A",email:"a@b.com",password:"password1",confirmPassword:"different"}), "password_mismatch"); assert.equal(validateProfile({username:"!",displayName:"A",email:"a@b.com",password:"password1",confirmPassword:"password1"}), "invalid_username"); });
test("language validation", () => { assert.equal(isLanguage("zh"), true); assert.equal(isLanguage("ko"), true); assert.equal(isLanguage("en"), false); });
