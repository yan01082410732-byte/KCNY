import { createClient } from "@/lib/supabase/server";
import { reportsEnvironmentEnabled, type ReportCase } from "@/lib/reporting";

export async function reportingContext() {
  const supabase = await createClient();
  const { data } = await supabase?.auth.getClaims() ?? {};
  const userId = data?.claims?.sub;
  if (!supabase || !userId) return { supabase, userId: undefined, enabled: false, reviewer: false };
  if (!reportsEnvironmentEnabled(process.env)) return { supabase, userId, enabled: false, reviewer: false };
  const access = await supabase.rpc("reporting_access");
  return { supabase, userId, enabled: !access.error && access.data?.enabled === true, reviewer: !access.error && access.data?.reviewer === true };
}

export async function reportTargetHref(report: ReportCase) {
  const supabase = await createClient();
  if (!supabase || !report.target_id) return undefined;
  if (report.target_type === "post") return `/posts/${report.target_id}`;
  if (report.target_type === "profile") {
    const { data } = await supabase.from("profiles").select("username").eq("id", report.target_id).maybeSingle();
    return data ? `/u/${encodeURIComponent(data.username)}` : undefined;
  }
  const { data } = await supabase.from("comments").select("post_id").eq("id", report.target_id).maybeSingle();
  return data ? `/posts/${data.post_id}#comment-${report.target_id}` : undefined;
}
