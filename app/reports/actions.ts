"use server";

import { createClient } from "@/lib/supabase/server";
import { validateReportInput, type ReportSubmissionState } from "@/lib/reporting";

export async function submitReport(_previous: ReportSubmissionState, formData: FormData): Promise<ReportSubmissionState> {
  const result = validateReportInput({ kind: formData.get("kind"), targetType: formData.get("targetType"), targetId: formData.get("targetId"), reason: formData.get("reason"), description: formData.get("description") });
  if (!result.ok) return { status: "error", reason: "invalid_input" };
  const supabase = await createClient();
  if (!supabase) return { status: "error", reason: "unavailable" };
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { status: "error", reason: "login_required" };
  // No approved reports table or RLS contract exists. Never fabricate persistence.
  return { status: "error", reason: "unavailable" };
}
