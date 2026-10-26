"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { reviewReport } from "@/app/reports/actions";
import { canSubmitReport, reportErrorMessage, reportStatusLabel, type ReportCase, type ReportSubmissionState } from "@/lib/reporting";
import type { Language } from "@/lib/auth";
import { useRouter } from "next/navigation";

export function ReportReviewForm({ report, language, continueHref }: { report: ReportCase; language: Language; continueHref?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ReportSubmissionState, FormData>(reviewReport, { status: "idle" });
  const locked = useRef(false); const kr = language === "KR";
  useEffect(() => { if (state.status !== "idle") locked.current = false; }, [state]);
  // Do not silently adopt a concurrently changed version while an operator is typing.
  const [expectedVersion, setExpectedVersion] = useState(report.version);
  const [baseStatus, setBaseStatus] = useState(report.status);
  const [refreshRequested, setRefreshRequested] = useState(false);
  const [draftRefreshed, setDraftRefreshed] = useState(false);
  const choices = baseStatus === "pending" ? ["under_review"] as const : baseStatus === "under_review" ? ["resolved", "dismissed"] as const : [];
  const [nextStatus, setNextStatus] = useState<string>(choices[0] ?? "");
  const [publicResolution, setPublicResolution] = useState(report.public_resolution);
  const [decisionReason, setDecisionReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  useEffect(() => {
    if (!refreshRequested || report.version === expectedVersion) return;
    setExpectedVersion(report.version); setBaseStatus(report.status);
    setNextStatus(report.status === "pending" ? "under_review" : report.status === "under_review" ? "resolved" : "");
    setRefreshRequested(false); setDraftRefreshed(true);
    // Text fields deliberately remain untouched; notes never enter browser storage.
  }, [refreshRequested, report.version, report.status, expectedVersion]);
  return <section className="case-card"><h2>{kr ? "사람에 의한 검토" : "人工审核操作"}</h2><p>{kr ? "사건 처리 완료는 게시물 삭제나 계정 제재를 의미하지 않습니다." : "完成案件不代表已删除内容或处罚账号。"}</p>
    <p>{kr ? "이 입력의 기준 버전" : "当前草稿基于版本"}: <strong>{expectedVersion}</strong></p>
    {state.status === "error" && !draftRefreshed && <p role="alert">{reportErrorMessage(state.reason, language)}</p>}
    {state.status === "error" && state.reason === "conflict" && <button className="button" type="button" disabled={pending} onClick={() => { setRefreshRequested(true); setDraftRefreshed(false); router.refresh(); }}>{kr ? "초안 보존하며 최신 버전 불러오기" : "刷新最新版本并保留草稿"}</button>}
    {draftRefreshed && <p role="status">{kr ? "최신 버전을 적용했습니다. 입력한 텍스트는 유지됩니다. 다음 상태를 확인하고 저장해 주세요." : "已采用最新案件版本，输入文字已保留，请核对下一状态后保存。"}</p>}
    {state.status === "success" && <div className="report-success" role="status"><p>{kr ? "처리 결과가 저장되었습니다. 저장 버전" : "处理已确认保存，版本"}: {state.caseVersion ?? expectedVersion + 1}</p>{continueHref && <a className="button" href={continueHref}>{kr ? "저장 결과 확인 후 계속 검토" : "查看已保存结果并继续处理"}</a>}</div>}
    {choices.length === 0 && <p role="status">{kr ? "이 사건은 종료되었습니다. 새 검토를 제출할 수 없습니다." : "此案件已结束，不能继续提交审核。"}</p>}
    <form action={action} aria-busy={pending} onSubmit={e => { if (!canSubmitReport(pending, locked.current) || state.status === "success" || !choices.length) e.preventDefault(); else { locked.current = true; setDraftRefreshed(false); } }}>
      <input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="version" value={expectedVersion} />
      <fieldset disabled={pending || state.status === "success" || !choices.length}><legend>{kr ? "현재 사건의 처리 입력" : "当前案件处理输入"}</legend>
      <label htmlFor="review-next">{kr ? "다음 상태" : "下一状态"}<select id="review-next" name="nextStatus" value={nextStatus} onChange={e => setNextStatus(e.target.value)}>{choices.map(s => <option key={s} value={s}>{reportStatusLabel(s, language)}</option>)} </select></label>
      <label htmlFor="review-public">{kr ? "제출자에게 공개할 결과" : "向提交者公开的处理结果"}<textarea id="review-public" name="publicResolution" maxLength={2000} required={baseStatus === "under_review"} value={publicResolution} onChange={e => setPublicResolution(e.target.value)} /></label>
      <label htmlFor="review-reason">{kr ? "내부 처리 사유 (필수)" : "内部处理理由（必填）"}<textarea id="review-reason" name="decisionReason" required minLength={1} maxLength={2000} value={decisionReason} onChange={e => setDecisionReason(e.target.value)} /></label>
      <label htmlFor="review-note">{kr ? "내부 메모 (제출자에게 비공개)" : "内部备注（不向提交者公开）"}<textarea id="review-note" name="internalNote" maxLength={4000} value={internalNote} onChange={e => setInternalNote(e.target.value)} /></label>
      <button className="button primary" type="submit" disabled={pending || state.status === "success" || !choices.length}>{pending ? (kr ? "저장 중…" : "正在保存…") : (kr ? "검토 저장" : "保存审核")}</button>
      </fieldset>
    </form></section>;
}
