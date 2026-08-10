import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { notificationLabels, notificationTypes, unreadBadge } from "../lib/notifications.ts";

const migration = readFileSync(new URL("../supabase/migrations/202608110001_create_notifications.sql", import.meta.url), "utf8");
const actions = readFileSync(new URL("../app/notifications/actions.ts", import.meta.url), "utf8");
const page = readFileSync(new URL("../app/notifications/page.tsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../components/NotificationsPageClient.tsx", import.meta.url), "utf8");
const bell = readFileSync(new URL("../components/NotificationBell.tsx", import.meta.url), "utf8");

test("notification types are fixed and bilingual", () => { assert.deepEqual(notificationTypes, ["post_comment", "comment_reply", "post_like", "new_follower"]); assert.match(notificationLabels("CN").message("post_like", "A"), /A/); assert.match(notificationLabels("KR").message("new_follower", "A"), /A/); });
test("notification migration has secure private table and cascades", () => { assert.match(migration, /references public\.profiles\(id\) on delete cascade/g); assert.match(migration, /references public\.posts\(id\) on delete cascade/); assert.match(migration, /references public\.comments\(id\) on delete cascade/); assert.match(migration, /enable row level security/); });
test("notification migration denies direct client creation and deletion", () => { assert.doesNotMatch(migration, /for insert to authenticated/); assert.doesNotMatch(migration, /for delete to authenticated/); assert.match(migration, /revoke all on public\.notifications from authenticated/); });
test("notification updates are recipient-only and limited to read_at", () => { assert.match(migration, /grant update \(read_at\) on public\.notifications to authenticated/); assert.match(migration, /recipient_id = auth\.uid\(\)/); assert.match(actions, /eq\("recipient_id", userId\)/); assert.doesNotMatch(actions, /recipientId/); });
test("trigger functions derive notification data from database rows", () => { assert.match(migration, /create trigger comments_create_notification/); assert.match(migration, /create trigger post_likes_create_notification/); assert.match(migration, /create trigger user_follows_create_notification/); assert.match(migration, /new\.author_id/); assert.match(migration, /old\.user_id/); assert.match(migration, /on conflict do nothing/); });
test("notification trigger functions are hardened", () => { assert.match(migration, /security definer/); assert.match(migration, /set search_path = public, pg_temp/); assert.match(migration, /revoke execute on function public\.create_comment_notification\(\) from public, anon, authenticated/); });
test("notification page is login protected and only selects public actor fields", () => { assert.match(page, /auth\/login/); assert.match(page, /username, display_name/); assert.doesNotMatch(page, /email/); });
test("notification UI supports mark one mark all bell and 99 plus", () => { assert.match(actions, /markNotificationRead/); assert.match(actions, /markAllNotificationsRead/); assert.match(client, /markNotificationRead/); assert.match(bell, /unreadBadge/); assert.equal(unreadBadge(100), "99+"); assert.equal(unreadBadge(0), ""); });
