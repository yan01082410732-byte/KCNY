"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { defaultNotificationPreferences, notificationPreferenceLabels, parseNotificationPreferences, preferenceTypes } from "@/lib/notification-preferences";
import type { Language } from "@/lib/auth";

export function NotificationPreferences({ language }: { language: Language }) {
  const [draft, setDraft] = useState(defaultNotificationPreferences);
  const [loading, setLoading] = useState(true), [ready, setReady] = useState(false), [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"saved" | "loadError" | "saveError" | "authentication" | null>(null);
  const busy = useRef(false), active = useRef(true);
  const copy = notificationPreferenceLabels(language);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setFeedback(null); setReady(false);
    try {
      const response = await fetch("/api/notification-preferences", { cache: "no-store", signal });
      const data = await response.json();
      if (!active.current || signal?.aborted) return;
      const preferences = parseNotificationPreferences(data.preferences);
      if (!response.ok || !preferences) { setFeedback(response.status === 401 ? "authentication" : "loadError"); return; }
      setDraft(preferences); setReady(true);
    } catch { if (active.current && !signal?.aborted) setFeedback("loadError"); }
    finally { if (active.current && !signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController(); void load(controller.signal);
    return () => { active.current = false; controller.abort(); };
  }, [load]);
  return <section className="auth-card notification-preferences" aria-labelledby="notification-preferences-title">
    <h2 id="notification-preferences-title">{copy.title}</h2><p>{copy.description}</p>
    {loading && <p role="status">{copy.loading}</p>}
    {feedback && <p role={feedback === "saved" ? "status" : "alert"} className={feedback === "saved" ? "auth-notice" : "auth-error"}>{copy[feedback]}</p>}
    {!loading && !ready && <button type="button" className="button secondary-link" onClick={() => void load()}>{copy.retry}</button>}
    {feedback === "authentication" && <a href={`/auth/login?lang=${language}&returnTo=/settings/profile`}>{copy.login}</a>}
    <form onSubmit={async event => {
      event.preventDefault(); if (busy.current || !ready) return;
      busy.current = true; setSaving(true); setFeedback(null);
      try {
        const response = await fetch("/api/notification-preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
        const data = await response.json(), saved = parseNotificationPreferences(data.preferences);
        if (!active.current) return;
        if (!response.ok || !saved || preferenceTypes.some(type => saved[type] !== draft[type])) { setFeedback(response.status === 401 ? "authentication" : "saveError"); return; }
        setDraft(saved); setFeedback("saved");
      } catch { if (active.current) setFeedback("saveError"); }
      finally { busy.current = false; if (active.current) setSaving(false); }
    }}>
      <fieldset disabled={!ready || loading || saving} aria-busy={loading || saving}>
        <legend className="sr-only">{copy.title}</legend>
        {preferenceTypes.map(type => <label key={type} htmlFor={`notification-${type}`}>
          <input id={`notification-${type}`} name={type} type="checkbox" checked={draft[type]} onChange={event => { setDraft(current => ({ ...current, [type]: event.target.checked })); setFeedback(null); }} />
          <span>{copy[type]}</span>
        </label>)}
      </fieldset>
      <button type="submit" className="button" disabled={!ready || loading || saving}>{saving ? copy.saving : copy.save}</button>
    </form>
    <a href={`/notifications?lang=${language}`}>{copy.centre}</a>
  </section>;
}
