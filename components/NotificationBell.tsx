"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { unreadBadge } from "@/lib/notifications";
import type { Language } from "@/lib/auth";
import { notificationCountLabel, NOTIFICATIONS_READ_CHANNEL, NOTIFICATIONS_READ_EVENT } from "@/lib/notification-count";
import { createNotificationRefreshController, type NotificationCountState } from "@/lib/notification-refresh";

export function NotificationBell({ language }: { language: Language }) {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<NotificationCountState & { path: string | null }>({ path: pathname, count: null, unavailable: false });
  useEffect(() => {
    setSnapshot({ path: pathname, count: null, unavailable: false });
    const supabase = createClient();
    if (!supabase) { setSnapshot({ path: pathname, count: null, unavailable: true }); return; }
    const loader = createNotificationRefreshController({
      load: (recipientId, signal) => supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", recipientId).is("read_at", null).abortSignal(signal),
      update: (state) => setSnapshot({ path: pathname, ...state }),
      isVisible: () => document.visibilityState === "visible",
    });
    let disposed = false;
    let authVersion = 0;
    let authIdentity: string | null = null;
    let authPending: Promise<void> | null = null;
    // Session identity scopes the query, but the signed-in JWT and existing RLS
    // enforce access. Never accept a recipient ID from URL/props or broadcast data.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authVersion++;
      authIdentity = session?.user.id ?? null;
      loader.setIdentity(authIdentity);
    });
    const syncSession = () => {
      if (disposed || authPending) return;
      const initialAuthVersion = authVersion;
      authPending = supabase.auth.getSession().then(({ data, error }) => {
        if (disposed || authVersion !== initialAuthVersion) return;
        if (error) loader.unavailable();
        else {
          authIdentity = data.session?.user.id ?? null;
          loader.setIdentity(authIdentity);
        }
      }).catch(() => { if (!disposed && authVersion === initialAuthVersion) loader.unavailable(); })
        .finally(() => { authPending = null; });
    };
    syncSession();

    // Only an invalidation string crosses tabs, never counts, IDs or notification
    // contents. Each visible tab re-reads its own authenticated, RLS-limited count.
    let channel: BroadcastChannel | null = null;
    try { channel = new BroadcastChannel(NOTIFICATIONS_READ_CHANNEL); } catch { /* Polling still works. */ }
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (authIdentity) loader.refresh();
      else syncSession();
    };
    const read = () => {
      refresh();
      try { channel?.postMessage("read"); } catch { /* Optional cross-tab hint. */ }
    };
    if (channel) channel.onmessage = (event) => { if (event.data === "read") refresh(); };
    const visibilityChanged = () => { loader.visibilityChanged(); if (!authIdentity) refresh(); };
    window.addEventListener(NOTIFICATIONS_READ_EVENT, read);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      disposed = true;
      authVersion++;
      subscription.unsubscribe();
      loader.dispose();
      channel?.close();
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, read);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [pathname]);
  // Navigation must not paint the previous page/account's value before cleanup.
  const { count, unavailable } = snapshot.path === pathname ? snapshot : { count: null, unavailable: false };
  const badge = count === null ? "" : unreadBadge(count);
  const label = notificationCountLabel(language, count, unavailable);
  return <a className="notification-bell" href={`/notifications?lang=${language}`} aria-label={label} title={label}>🔔{badge ? <span>{badge}</span> : null}</a>;
}
