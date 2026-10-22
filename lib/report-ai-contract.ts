// Future TASK B boundary only. No inference is called and no suggestion is a decision.
export type ComplaintAiInput = {
  reportId: string;
  language: "CN" | "KR";
  category: "spam" | "harassment" | "hate" | "privacy" | "other";
  complaintText: string;
  evidenceText?: string;
};

export type ComplaintAiSuggestion = {
  source: "ai_suggestion";
  category: ComplaintAiInput["category"];
  risk: "low" | "medium" | "high" | "uncertain";
  summary: string;
  recommendedReview: string;
  translatedText?: string;
};

export type HumanReviewDecision = {
  source: "human_decision";
  reportId: string;
  reviewerId: string;
  status: "under_review" | "resolved" | "dismissed";
  reason: string;
};
