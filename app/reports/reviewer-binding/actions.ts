"use server";

import { createClient } from "@/lib/supabase/server";
import { BINDING_TTL_MS, createReviewerBindingReceipt, isBindingUuid, reviewerBindingEnvironment, type BindingActionState } from "@/lib/reviewer-binding";

export type ReviewerBindingActionState = BindingActionState;

export async function confirmReviewerIdentity(_previous: ReviewerBindingActionState, formData: FormData): Promise<ReviewerBindingActionState> {
  const environment = reviewerBindingEnvironment(process.env);
  if (!environment) return { status: "error", reason: "unavailable" };
  try {
    const supabase = await createClient();
    if (!supabase) return { status: "error", reason: "unavailable" };
    const auth = await supabase.auth.getUser();
    if (auth.error) return { status: "error", reason: auth.error.status && auth.error.status < 500 ? "login_required" : "unavailable" };
    const user = auth.data.user;
    if (!user || user.is_anonymous || !isBindingUuid(user.id) || !(user.email_confirmed_at || user.confirmed_at)) return { status: "error", reason: "login_required" };
    const requestId = formData.get("requestId");
    if (formData.get("confirmSelf") !== "yes" || !isBindingUuid(requestId)) return { status: "error", reason: "confirmation_required" };
    const now = Date.now();
    // Only the verified current session chooses the UUID. This is identity proof,
    // not a reviewer grant; no client user/role/project/origin field is trusted.
    const receipt = createReviewerBindingReceipt({ userId: user.id, projectRef: environment.projectRef, origin: environment.origin, requestId }, environment.secret, now);
    if (typeof receipt !== "string" || receipt.length === 0) return { status: "error", reason: "unavailable" };
    return { status: "success", receipt, expiresAt: new Date(now + BINDING_TTL_MS).toISOString() };
  } catch { return { status: "error", reason: "unavailable" }; }
}
