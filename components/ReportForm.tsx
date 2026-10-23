"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { submitReport } from "@/app/reports/actions";
import { canSubmitReport, reportErrorMessage, reportTargetLabel, type ReportKind, type ReportReason, type ReportTargetType, type ReportSubmissionState } from "@/lib/reporting";
import type { Language } from "@/lib/auth";

const reasons: ReportReason[] = ["spam", "harassment", "hate", "privacy", "other"];
const copy = {
  CN: { title: "举报与投诉", report: "举报内容", complaint: "提交投诉", category: "原因", description: "补充说明", optional: "可选；最多 2000 字", required: "请至少填写 10 字；最多 2000 字", submit: "提交", pending: "正在检查…", unavailable: "举报与投诉尚未开通保存功能，当前不能提交。请勿在此填写敏感信息。", invalid: "请检查举报类型和填写内容。", login: "请先登录再提交。", target: "关联对象", noTarget: "一般投诉（未关联内容）", status: "我的举报状态", reasons: { spam: "垃圾信息", harassment: "骚扰", hate: "仇恨言论", privacy: "隐私侵害", other: "其他" } },
  KR: { title: "신고 및 민원", report: "콘텐츠 신고", complaint: "민원 제출", category: "사유", description: "상세 설명", optional: "선택 사항 · 최대 2000자", required: "10자 이상 · 최대 2000자", submit: "제출", pending: "확인 중…", unavailable: "신고 및 민원 저장 기능이 아직 준비되지 않아 제출할 수 없습니다. 민감한 정보를 입력하지 마세요.", invalid: "신고 유형과 내용을 확인해 주세요.", login: "로그인 후 제출해 주세요.", target: "관련 대상", noTarget: "일반 민원 (콘텐츠 미지정)", status: "내 신고 상태", reasons: { spam: "스팸", harassment: "괴롭힘", hate: "혐오 표현", privacy: "개인정보 침해", other: "기타" } },
} as const;

export function ReportForm({ kind, targetType, targetId, language, username, displayName, enabled = false }: { kind: ReportKind; targetType?: ReportTargetType; targetId?: string; language: Language; username?: string; displayName?: string; enabled?: boolean }) {
  const [state, action, pending] = useActionState<ReportSubmissionState, FormData>(submitReport, { status: "idle" });
  const [reason, setReason] = useState<ReportReason>("other");
  const [description, setDescription] = useState("");
  const [requestId, setRequestId] = useState("");
  useEffect(() => { setRequestId(crypto.randomUUID()); }, []);
  const locked = useRef(false);
  useEffect(() => { if (state.status !== "idle") locked.current = false; }, [state]);
  const text = copy[language];
  const message = state.status === "error" ? reportErrorMessage(state.reason, language) : undefined;
  const href = (next: Language) => `/reports/new?${new URLSearchParams({ lang: next, kind, ...(targetType && targetId ? { targetType, targetId } : {}) })}`;
  return <main><Header language={language} onLanguageChange={() => {}} languageHref={href} authenticated username={username} displayName={displayName} />
    <section className="auth-page report-page"><div className="report-layout"><section className="auth-card report-card">
      <h1>{text.title}</h1><h2>{kind === "report" ? text.report : text.complaint}</h2>
      {!enabled && <p className="auth-error" role="status">{text.unavailable}</p>}
      {message && <p className="auth-error" role="alert">{message}</p>}
      {state.status === "success" && <p className="auth-notice" role="status">{language === "KR" ? "저장되었습니다. 접수 번호: " : "已保存，案件编号："}<a className="report-success" href={`/reports/${state.reportId}?lang=${language}`}>{state.reportId}</a></p>}
      <form action={action} onSubmit={(event) => { if (!canSubmitReport(pending, locked.current)) event.preventDefault(); else locked.current = true; }}>
        <input type="hidden" name="requestId" value={requestId} />
        <input type="hidden" name="kind" value={kind} /><input type="hidden" name="targetType" value={targetType ?? ""} /><input type="hidden" name="targetId" value={targetId ?? ""} />
        <p>{text.target}: {targetType && targetId ? `${reportTargetLabel(targetType, language)} · ${targetId}` : text.noTarget}</p>
        <label htmlFor="report-reason">{text.category}<select id="report-reason" name="reason" value={reason} onChange={(event) => setReason(event.target.value as ReportReason)}>{reasons.map((item) => <option key={item} value={item}>{text.reasons[item]}</option>)}</select></label>
        <label htmlFor="report-description">{text.description}<textarea id="report-description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} minLength={kind === "complaint" ? 10 : undefined} maxLength={2000} aria-describedby="report-help" /></label>
        <p id="report-help" className="field-help">{kind === "complaint" ? text.required : text.optional}</p>
        <button className="button primary" type="submit" disabled={pending || !enabled || !requestId || state.status === "success"}>{pending ? text.pending : text.submit}</button>
      </form>
      <a href={`/reports?lang=${language}`}>{text.status}</a>
    </section></div></section>
  </main>;
}
