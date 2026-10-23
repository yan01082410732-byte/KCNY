"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { reviewReport } from "@/app/reports/actions";
import { canSubmitReport, reportErrorMessage, reportStatusLabel, type ReportCase, type ReportSubmissionState } from "@/lib/reporting";
import type { Language } from "@/lib/auth";

export function ReportReviewForm({ report, language }: { report: ReportCase; language: Language }) {
  const [state, action, pending] = useActionState<ReportSubmissionState, FormData>(reviewReport, { status: "idle" });
  const locked = useRef(false); const kr = language === "KR";
  useEffect(() => { if (state.status !== "idle") locked.current = false; }, [state]);
  const choices = report.status === "pending" ? ["under_review"] as const : report.status === "under_review" ? ["resolved", "dismissed"] as const : [];
  const [nextStatus, setNextStatus] = useState<string>(choices[0] ?? "");
  const [publicResolution, setPublicResolution] = useState(report.public_resolution);
  const [decisionReason, setDecisionReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  if (!choices.length) return <p role="status">{kr ? "이 사건은 종료되었습니다." : "此案件已结束。"}</p>;
  return <section className="case-card"><h2>{kr ? "사람에 의한 검토" : "人工审核操作"}</h2><p>{kr ? "사건 처리 완료는 게시물 삭제나 계정 제재를 의미하지 않습니다." : "完成案件不代表已删除内容或处罚账号。"}</p>
    {state.status === "error" && <p role="alert">{reportErrorMessage(state.reason, language)}</p>}
    {state.status === "success" && <p role="status">{kr ? "처리되었습니다. 최신 상태를 확인해 주세요." : "处理已保存，请核对最新状态。"}</p>}
    <form action={action} onSubmit={e => { if (!canSubmitReport(pending, locked.current)) e.preventDefault(); else locked.current = true; }}>
      <input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="version" value={report.version} />
      <label htmlFor="review-next">{kr ? "다음 상태" : "下一状态"}<select id="review-next" name="nextStatus" value={nextStatus} onChange={e => setNextStatus(e.target.value)}>{choices.map(s => <option key={s} value={s}>{reportStatusLabel(s, language)}</option>)} </select></label>
      <label htmlFor="review-public">{kr ? "제출자에게 공개할 결과" : "向提交者公开的处理结果"}<textarea id="review-public" name="publicResolution" maxLength={2000} required={report.status === "under_review"} value={publicResolution} onChange={e => setPublicResolution(e.target.value)} /></label>
      <label htmlFor="review-reason">{kr ? "내부 처리 사유 (필수)" : "内部处理理由（必填）"}<textarea id="review-reason" name="decisionReason" required minLength={1} maxLength={2000} value={decisionReason} onChange={e => setDecisionReason(e.target.value)} /></label>
      <label htmlFor="review-note">{kr ? "내부 메모 (제출자에게 비공개)" : "内部备注（不向提交者公开）"}<textarea id="review-note" name="internalNote" maxLength={4000} value={internalNote} onChange={e => setInternalNote(e.target.value)} /></label>
      <button className="button primary" type="submit" disabled={pending || state.status === "success"}>{pending ? (kr ? "저장 중…" : "正在保存…") : (kr ? "검토 저장" : "保存审核")}</button>
    </form></section>;
}
