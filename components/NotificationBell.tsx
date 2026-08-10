"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { unreadBadge } from "@/lib/notifications";
import type { Language } from "@/lib/auth";

export function NotificationBell({ language }: { language: Language }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null).then(({ count: total }) => setCount(total ?? 0));
  }, []);
  const badge = unreadBadge(count);
  return <a className="notification-bell" href={`/notifications?lang=${language}`} aria-label={language === "KR" ? "알림" : "通知"}>🔔{badge ? <span>{badge}</span> : null}</a>;
}
