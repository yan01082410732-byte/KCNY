"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { unreadBadge } from "@/lib/notifications";
import type { Language } from "@/lib/auth";
import { createUnreadCountLoader, NOTIFICATIONS_READ_EVENT } from "@/lib/notification-count";

export function NotificationBell({ language }: { language: Language }) {
  const [count, setCount] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setUnavailable(true); return; }
    const loader = createUnreadCountLoader(
      () => supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
      setCount, setUnavailable,
    );
    const refresh = () => { void loader.refresh(); };
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    window.addEventListener(NOTIFICATIONS_READ_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      loader.dispose();
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [pathname]);
  const badge = unavailable ? "" : unreadBadge(count);
  const label = language === "KR" ? (unavailable ? "알림 — 읽지 않은 수를 불러올 수 없습니다" : `알림, 읽지 않음 ${count}개`) : (unavailable ? "通知，暂时无法获取未读数" : `通知，${count} 条未读`);
  return <a className="notification-bell" href={`/notifications?lang=${language}`} aria-label={label} title={label}>🔔{badge ? <span>{badge}</span> : null}</a>;
}
