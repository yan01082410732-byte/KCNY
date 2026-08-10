"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isLanguage, normalizeLanguage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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

export async function markAllNotificationsRead(formData: FormData) {
  const { supabase, userId, language } = await context(formData);
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", userId).is("read_at", null);
  revalidatePath("/notifications");
  redirect(`/notifications?lang=${language}`);
}

export async function markNotificationRead(formData: FormData) {
  const { supabase, userId, language } = await context(formData);
  const notificationId = formData.get("notificationId");
  if (!validNotificationId(notificationId)) redirect(`/notifications?lang=${language}`);
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId).eq("recipient_id", userId).is("read_at", null);
  revalidatePath("/notifications");
  redirect(`/notifications?lang=${language}`);
}
