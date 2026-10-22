"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markAllNotificationsRead, markNotificationRead } from "@/app/notifications/actions";
import { Header } from "@/components/Header";
import type { Language } from "@/lib/auth";
import { notificationLabels, notificationsHref, notificationTarget, type NotificationType } from "@/lib/notifications";
import { NOTIFICATIONS_READ_EVENT } from "@/lib/notification-count";
import type { NotificationReadState } from "@/lib/notification-read";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  postId: string | null;
  commentId?: string | null;
  createdAt: string;
  readAt: string | null;
  actor?: { username: string; displayName?: string };
};

function formatNotificationTime(value: string, language: Language) {
  return new Intl.DateTimeFormat(language === "KR" ? "ko-KR" : "zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function NotificationsPageClient({
  initialLanguage,
  username,
  displayName,
  notifications,
  unavailable = false,
  before,
  nextCursor,
}: {
  initialLanguage: Language;
  username?: string;
  displayName?: string;
  notifications: NotificationItem[];
  unavailable?: boolean;
  before?: string;
  nextCursor?: string;
}) {
  const router = useRouter();
  const language = initialLanguage;
  const labels = notificationLabels(language);
  const previousNotifications = useRef(notifications);
  useEffect(() => {
    if (previousNotifications.current !== notifications) {
      previousNotifications.current = notifications;
      // A successful read can remove its own form before that form's effects run.
      // Refresh the persistent bell from the revalidated list instead.
      window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
    }
  }, [notifications]);

  return (
    <main>
      <Header language={language} onLanguageChange={(next) => router.push(notificationsHref(next, before))} languageHref={(next) => notificationsHref(next, before)} authenticated username={username} displayName={displayName} />
      <section className="shell notifications-page">
        <div className="notifications-heading">
          <div>
            <p className="eyebrow"><span /> KCNY</p>
            <h1>{labels.title}</h1>
          </div>
          {!unavailable && <NotificationReadControl language={language} all />}
        </div>

        {unavailable ? <p className="comments-message" role="alert">{language === "KR" ? "알림을 불러오지 못했습니다. 다시 시도해 주세요." : "暂时无法加载通知，请重试。"} <button type="button" onClick={() => router.refresh()}>{language === "KR" ? "다시 시도" : "重试"}</button></p> : notifications.length ? (
          <div className="notification-list">
            {notifications.map((notification) => {
              const actor = notification.actor;
              const actorUsername = actor?.username ?? "";
              const href = notificationTarget(notification, language);

              return (
                <article className={`notification-card${notification.readAt ? "" : " unread"}`} key={notification.id}>
                  <a href={href}>
                    <strong>{actor?.displayName || actorUsername || "K"}</strong>
                    <p>{labels.message(notification.type, actorUsername || "K")}</p>
                    <time dateTime={notification.createdAt}>{formatNotificationTime(notification.createdAt, language)}</time>
                    <span className="notification-read-status">{notification.readAt ? (language === "KR" ? "읽음" : "已读") : (language === "KR" ? "읽지 않음" : "未读")}</span>
                  </a>
                  {!notification.readAt && (
                    <NotificationReadControl language={language} notificationId={notification.id} />
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="notifications-empty">
            <h2>{labels.emptyTitle}</h2>
            <p>{labels.emptyText}</p>
          </div>
        )}
        {!unavailable && <nav className="community-pagination" aria-label={language === "KR" ? "알림 페이지" : "通知分页"}>
          {before && <a className="button secondary" href={notificationsHref(language)}>{language === "KR" ? "최신 알림" : "最新通知"}</a>}
          {nextCursor && <a className="button secondary" href={notificationsHref(language, nextCursor)}>{language === "KR" ? "이전 알림" : "更早通知"}</a>}
        </nav>}
      </section>
    </main>
  );
}

function NotificationReadControl({ language, notificationId, all = false }: { language: Language; notificationId?: string; all?: boolean }) {
  const [state, action, pending] = useActionState<NotificationReadState, FormData>(all ? markAllNotificationsRead : markNotificationRead, { status: "idle" });
  const korean = language === "KR";
  return <form action={action} className="notification-read-control">
    <input type="hidden" name="language" value={language} />
    {notificationId && <input type="hidden" name="notificationId" value={notificationId} />}
    <button className={all ? "button secondary" : undefined} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? (korean ? "저장 중…" : "保存中…") : all ? notificationLabels(language).markAll : (korean ? "읽음으로 표시" : "标为已读")}
    </button>
    {state.status === "error" && <p role="alert">{korean ? "저장하지 못했습니다. 다시 시도해 주세요." : "保存失败，请重试。"}</p>}
  </form>;
}
