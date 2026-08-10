"use client";

import { useState } from "react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/notifications/actions";
import { Header } from "@/components/Header";
import type { Language } from "@/lib/auth";
import { notificationLabels, type NotificationType } from "@/lib/notifications";

export type NotificationItem = { id: string; type: NotificationType; postId: string | null; createdAt: string; readAt: string | null; actor?: { username: string; displayName?: string } };

export function NotificationsPageClient({ initialLanguage, username, displayName, notifications }: { initialLanguage: Language; username?: string; displayName?: string; notifications: NotificationItem[] }) {
  const [language, setLanguage] = useState(initialLanguage);
  const labels = notificationLabels(language);
  return <main><Header language={language} onLanguageChange={setLanguage} authenticated username={username} displayName={displayName} /><section className="shell notifications-page"><div className="notifications-heading"><div><p className="eyebrow"><span /> KCNY</p><h1>{labels.title}</h1></div><form action={markAllNotificationsRead}><input type="hidden" name="language" value={language} /><button className="button secondary" type="submit">{labels.markAll}</button></form></div>{notifications.length ? <div className="notification-list">{notifications.map((notification) => { const actor = notification.actor; const actorUsername = actor?.username ?? ""; const href = notification.type === "new_follower" ? `/u/${encodeURIComponent(actorUsername)}?lang=${language}` : notification.postId ? `/posts/${encodeURIComponent(notification.postId)}?lang=${language}` : `/notifications?lang=${language}`; return <article className={`notification-card${notification.readAt ? "" : " unread"}`} key={notification.id}><a href={href}><strong>{actor?.displayName || actorUsername || "K"}</strong><p>{labels.message(notification.type, actorUsername || "K")}</p><time>{new Date(notification.createdAt).toLocaleString(language === "KR" ? "ko-KR" : "zh-CN")}</time></a>{!notification.readAt && <form action={markNotificationRead}><input type="hidden" name="language" value={language} /><input type="hidden" name="notificationId" value={notification.id} /><button type="submit">{language === "KR" ? "읽음" : "标为已读"}</button></form>}</article>; })}</div> : <div className="notifications-empty"><h2>{labels.emptyTitle}</h2><p>{labels.emptyText}</p></div>}</section></main>;
}
