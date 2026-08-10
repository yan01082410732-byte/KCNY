import { redirect } from "next/navigation";
import { NotificationsPageClient, type NotificationItem } from "@/components/NotificationsPageClient";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const language = isLanguage(lang) ? lang : normalizeLanguage(lang);
  const supabase = await createClient();
  const { data: claims } = await supabase?.auth.getClaims() ?? {};
  const userId = claims?.claims?.sub;
  if (!supabase || !userId) redirect(`/auth/login?lang=${language}&returnTo=/notifications`);
  const { data: profile } = await supabase.from("profiles").select("username, display_name").eq("id", userId).maybeSingle();
  const { data } = await supabase.from("notifications").select("id, type, post_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey(username, display_name)").order("created_at", { ascending: false }).limit(50);
  const notifications: NotificationItem[] = (data ?? []).flatMap((notification) => {
    const actor = Array.isArray(notification.actor) ? notification.actor[0] : notification.actor;
    if (notification.type !== "post_comment" && notification.type !== "comment_reply" && notification.type !== "post_like" && notification.type !== "new_follower") return [];
    return [{ id: notification.id, type: notification.type, postId: notification.post_id, createdAt: notification.created_at, readAt: notification.read_at, actor: actor?.username ? { username: actor.username, displayName: actor.display_name ?? undefined } : undefined }];
  });
  return <NotificationsPageClient initialLanguage={language} username={profile?.username} displayName={profile?.display_name ?? undefined} notifications={notifications} />;
}
