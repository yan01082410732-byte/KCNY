import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { followLabels, toPublicFollowProfiles } from "../lib/user-follows.ts";

const migration = readFileSync(new URL("../supabase/migrations/202608100001_create_user_follows.sql", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/follows/actions.ts", import.meta.url), "utf8");
const button = readFileSync(new URL("../components/FollowButton.tsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../app/u/[username]/page.tsx", import.meta.url), "utf8");

test("follow migration creates user_follows with composite primary key", () => assert.match(migration, /primary key \(follower_id, following_id\)/));
test("follow migration cascades both profile foreign keys", () => assert.equal((migration.match(/references public\.profiles\(id\) on delete cascade/g) ?? []).length, 2));
test("follow migration rejects self follows", () => assert.match(migration, /check \(follower_id <> following_id\)/));
test("follow migration has RLS and no update policy", () => { assert.match(migration, /enable row level security/); assert.doesNotMatch(migration, / for update /); });
test("follow migration permits public reads and owner-only writes", () => { assert.match(migration, /for select using \(true\)/); assert.match(migration, /auth\.uid\(\) = follower_id/); });
test("follow migration includes list indexes", () => { assert.match(migration, /following_id_idx/); assert.match(migration, /follower_id, created_at desc/); });
test("follow labels are bilingual", () => { assert.equal(followLabels("CN").follow, "关注"); assert.equal(followLabels("KR").followers, "팔로워"); });
test("public follow profiles exclude private fields", () => assert.deepEqual(toPublicFollowProfiles([{ username: "kcny", display_name: "KCNY", email: "private@example.com", id: "private" }]), [{ username: "kcny", display_name: "KCNY" }]));
test("follow actions derive follower from server session", () => { assert.match(actions, /auth\.getUser\(\)/); assert.match(actions, /follower_id: userId/); assert.doesNotMatch(actions, /formData\.get\("followerId"\)/); });
test("follow action is idempotent and blocks self follow", () => { assert.match(actions, /ignoreDuplicates: true/); assert.match(actions, /target\.id === user\.id/); });
test("unfollow action is idempotent and scoped to current follower", () => assert.match(actions, /delete\(\)\.eq\("follower_id", userId\)\.eq\("following_id", target\.id\)/));
test("follow action safely redirects unauthenticated users", () => assert.match(actions, /auth\/login\?lang=/));
test("follow button exposes pressed state and pending state", () => { assert.match(button, /aria-pressed=\{following\}/); assert.match(button, /useFormStatus/); });
test("follow button submits only target username", () => { assert.match(button, /name="targetUsername"/); assert.doesNotMatch(button, /name="followerId"/); });
test("profile page queries database-backed follower counts", () => { assert.match(profilePage, /followerCount/); assert.match(profilePage, /followingCount/); assert.match(profilePage, /user_follows/); });
