"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notificationReadSucceeded, type NotificationReadState } from "@/lib/notification-read";

async function context(formData: FormData) {
  const language = normalizeLanguage(formData.get("language"));
  if (!isLanguage(formData.get("language"))) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase?.auth.getClaims() ?? {};
  const userId = data?.claims?.sub;
  if (!supabase || !userId) redirect(`/auth/login?lang=${language}&returnTo=/notifications`);
  return { supabase, userId, language };
}

function validNotificationId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
}

export async function markAllNotificationsRead(_previous: NotificationReadState, formData: FormData): Promise<NotificationReadState> {
  const { supabase, userId } = await context(formData);
  try {
    const { error, count } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }, { count: "exact" }).eq("recipient_id", userId).is("read_at", null);
    if (!notificationReadSucceeded(error, count, false)) return { status: "error" };
  } catch { return { status: "error" }; }
  revalidatePath("/notifications");
  return { status: "success" };
}

export async function markNotificationRead(_previous: NotificationReadState, formData: FormData): Promise<NotificationReadState> {
  const { supabase, userId } = await context(formData);
  const notificationId = formData.get("notificationId");
  if (!validNotificationId(notificationId)) return { status: "error" };
  try {
    const { error, count } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }, { count: "exact" }).eq("id", notificationId).eq("recipient_id", userId);
    if (!notificationReadSucceeded(error, count, true)) return { status: "error" };
  } catch { return { status: "error" }; }
  revalidatePath("/notifications");
  return { status: "success" };
}
