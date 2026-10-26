"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import type { Language } from "@/lib/auth";
import { reportErrorMessage, reportKindLabel, reportStatusLabel } from "@/lib/reporting";
import { DATA_REQUEST_KINDS, dataRequestKindLabel, dataRequestStatusLabel, dataRequestTransitions, retentionDecisionLabel, retentionHoldLabel, type DataRequest, type DataRequestKind, type OperationsActionState, type OperationsOverview, type RetentionCandidate, type RetentionDecision, type RetentionHold, type ReviewerDataRequest } from "@/lib/report-operations";
import { submitDataRequest, recordRetention, reviewDataRequest } from "@/app/reports/operations/actions";

function displayTime(value: string, language: Language) {
  return new Date(value).toLocaleString(language === "KR" ? "ko-KR" : "zh-CN", { timeZone: "Asia/Seoul" });
}

function OperationsNavigation({ language, reviewer = false }: { language: Language; reviewer?: boolean }) {
  const kr = language === "KR";
  return <nav className="case-navigation reporting-operations-navigation" aria-label={kr ? "사건 탐색" : "案件导航"}>
    <a href={`/reports?lang=${language}`}>{kr ? "내 사건" : "我的案件"}</a>
    <a href={`/reports/privacy?lang=${language}`}>{kr ? "내 정보 요청" : "我的资料请求"}</a>
    {reviewer && <><a href={`/reports/review?lang=${language}`}>{kr ? "검토 대기열" : "审核队列"}</a><a href={`/reports/operations?lang=${language}`}>{kr ? "운영 및 보관 검토" : "运营与留存复核"}</a></>}
  </nav>;
}

export function OperationsUnavailable({ language, forbidden = false }: { language: Language; forbidden?: boolean }) {
  const kr = language === "KR";
  return <main className="shell cases-page reporting-operations"><h1>{kr ? "신고 운영" : "举报运营"}</h1>
    <p role="status">{forbidden ? (kr ? "현재 계정에는 운영 검토 권한이 없습니다." : "当前账号没有运营复核权限。") : (kr ? "이 환경에서는 사건 정보 요청과 운영 검토가 활성화되어 있지 않습니다." : "当前环境未启用案件资料请求与运营复核。")}</p>
    <a className="button" href={`/?lang=${language}`}>{kr ? "커뮤니티로" : "返回社区"}</a>
  </main>;
}

function ActionFeedback({ state, language, saved }: { state: OperationsActionState; language: Language; saved: string }) {
  if (state.status === "error") return <p role="alert">{reportErrorMessage(state.reason, language)}</p>;
  if (state.status === "success") return <p role="status" className="report-success">{saved}</p>;
  return null;
}

function useSubmitGuard(pending: boolean, state: OperationsActionState) {
  const locked = useRef(false);
  useEffect(() => { if (state.status !== "idle") locked.current = false; }, [state]);
  return (event: FormEvent<HTMLFormElement>) => {
    if (pending || locked.current || state.status === "success") event.preventDefault();
    else locked.current = true;
  };
}

function PrivacyRequestForm({ language, initialCaseId }: { language: Language; initialCaseId: string }) {
  const kr = language === "KR";
  const [state, action, pending] = useActionState<OperationsActionState, FormData>(submitDataRequest, { status: "idle" });
  const guard = useSubmitGuard(pending, state);
  const [reportId, setReportId] = useState(initialCaseId);
  const [kind, setKind] = useState<DataRequestKind>("access");
  const [details, setDetails] = useState("");
  const [requestId, setRequestId] = useState("");
  useEffect(() => { setRequestId(crypto.randomUUID()); }, []);
  useEffect(() => { if (state.status === "success") setDetails(""); }, [state]);
  return <section className="case-card"><h2>{kr ? "새 정보 요청" : "提交资料请求"}</h2>
    <p>{kr ? "본인이 제출한 사건에 대해서만 요청할 수 있습니다. 불필요한 개인 정보나 비밀번호를 적지 마세요. 하루 최대 5건입니다." : "只能针对自己提交的案件提出请求。请勿填写不必要的个人信息或密码。每天最多提交5次。"}</p>
    <ActionFeedback state={state} language={language} saved={kr ? "요청이 저장되었습니다. 승인은 실제 열람·정정·삭제의 완료를 뜻하지 않습니다." : "请求已保存。审核批准不代表已完成查阅、更正或删除。"} />
    {state.status === "success" && <p className="case-id">{kr ? "요청 번호" : "请求编号"}: {state.entityId} · <a href={`/reports/privacy?lang=${language}`}>{kr ? "목록 새로고침 / 새 요청" : "刷新列表／再次提交"}</a></p>}
    <form action={action} onSubmit={guard} aria-busy={pending}>
      <fieldset disabled={pending || state.status === "success"}>
      <legend>{kr ? "요청 내용" : "请求内容"}</legend>
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor="privacy-report-id">{kr ? "내 사건 번호" : "我的案件编号"}<input id="privacy-report-id" name="reportId" type="text" maxLength={36} pattern="[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}" required value={reportId} onChange={event => setReportId(event.target.value)} /></label>
      <label htmlFor="privacy-request-kind">{kr ? "요청 유형" : "请求类型"}<select id="privacy-request-kind" name="kind" value={kind} onChange={event => setKind(event.target.value as DataRequestKind)}>{DATA_REQUEST_KINDS.map(value => <option key={value} value={value}>{dataRequestKindLabel(value, language)}</option>)}</select></label>
      <label htmlFor="privacy-request-details">{kr ? "요청 설명 (10~1000자)" : "请求说明（10–1000字）"}<textarea id="privacy-request-details" name="details" required minLength={10} maxLength={1000} value={details} onChange={event => setDetails(event.target.value)} /></label>
      <button type="submit" className="button primary" disabled={pending || !requestId || state.status === "success"}>{pending ? (kr ? "제출 중…" : "正在提交…") : (kr ? "요청 제출" : "提交请求")}</button>
      </fieldset>
    </form>
  </section>;
}

export function ReportPrivacyRequests({ language, initialCaseId = "", requests, error, nextCursor, reviewer }: { language: Language; initialCaseId?: string; requests: DataRequest[]; error: boolean; nextCursor?: string; reviewer: boolean }) {
  const kr = language === "KR";
  return <main className="shell cases-page reporting-operations"><h1>{kr ? "내 사건 정보 요청" : "我的案件资料请求"}</h1>
    <OperationsNavigation language={language} reviewer={reviewer} />
    <p>{kr ? "열람·정정·삭제 요청은 사람의 검토를 거칩니다. 이 화면은 파일을 내보내거나 사건·감사 기록을 삭제하지 않습니다." : "查阅、更正与删除请求需要人工审核。本页面不会直接导出文件或删除案件与审计记录。"}</p>
    <PrivacyRequestForm key={initialCaseId} language={language} initialCaseId={initialCaseId} />
    <section aria-labelledby="privacy-history"><h2 id="privacy-history">{kr ? "내 요청 이력" : "我的请求记录"}</h2>
      {error ? <div role="alert"><p>{kr ? "요청 목록을 불러오지 못했습니다. 빈 목록으로 간주하지 않습니다." : "请求列表加载失败，不能视为没有请求。"}</p><a className="button" href={`/reports/privacy?lang=${language}`}>{kr ? "다시 시도" : "重试"}</a></div>
        : requests.length === 0 ? <p role="status">{kr ? "아직 정보 요청이 없습니다." : "暂无资料请求。"}</p>
          : requests.map(request => <article className="case-card" key={request.id}><h3>{dataRequestKindLabel(request.request_kind, language)}</h3>
            <p className="case-id">{kr ? "요청 번호" : "请求编号"}: {request.id}</p><p><a href={`/reports/${request.report_id}?lang=${language}`}>{kr ? "관련 내 사건" : "关联的我的案件"}</a></p>
            <p className="case-status">{dataRequestStatusLabel(request.status, language)}</p><p className="case-description">{request.details}</p>
            <p>{kr ? "공개 답변" : "公开答复"}: {request.public_response || (kr ? "아직 답변이 없습니다." : "暂未答复。")}</p>
            <p>{kr ? "접수 / 수정 (한국 시간)" : "提交／更新（韩国时间）"}: <time dateTime={request.created_at}>{displayTime(request.created_at, language)}</time> / <time dateTime={request.updated_at}>{displayTime(request.updated_at, language)}</time></p>
          </article>)}
      {!error && nextCursor && <a className="button case-more" href={`/reports/privacy?${new URLSearchParams({ lang: language, before: nextCursor })}`}>{kr ? "이전 요청 더 보기" : "查看更多请求"}</a>}
    </section>
    <a className="button" href={`/reports/privacy?${new URLSearchParams({ lang: kr ? "CN" : "KR", ...(initialCaseId ? { case: initialCaseId } : {}) })}`}>{kr ? "中文" : "한국어"}</a>
  </main>;
}

function RetentionReviewForm({ candidate, language }: { candidate: RetentionCandidate; language: Language }) {
  const kr = language === "KR";
  const [state, action, pending] = useActionState<OperationsActionState, FormData>(recordRetention, { status: "idle" });
  const guard = useSubmitGuard(pending, state);
  const [caseVersion] = useState(candidate.version);
  const [reviewVersion] = useState(candidate.review_version);
  const [decision, setDecision] = useState<RetentionDecision>(candidate.decision === "eligible_for_clear" ? candidate.decision : "retain");
  const [hold, setHold] = useState<RetentionHold>(candidate.hold);
  const [reason, setReason] = useState(candidate.reason);
  const [nextReviewAt, setNextReviewAt] = useState(candidate.next_review_at?.slice(0, 16) ?? "");
  const nextReviewISO = nextReviewAt && Number.isFinite(Date.parse(`${nextReviewAt}Z`)) ? new Date(`${nextReviewAt}Z`).toISOString() : "";
  return <section className="case-card"><h2>{kr ? "선택한 사건의 보관 검토" : "所选案件留存复核"}</h2><p className="case-id">{candidate.id}</p>
    <p>{reportKindLabel(candidate.kind, language)} · {reportStatusLabel(candidate.status, language)} · {retentionDecisionLabel(candidate.decision, language)}</p>
    <p>{kr ? "저장은 검토 결정과 다음 검토일만 기록합니다. 본문·멱등성 사본·내부 메모를 삭제하지 않습니다." : "保存仅记录复核决定和下次复核时间，不会清理正文、幂等副本或内部备注。"}</p>
    {candidate.cleared_at ? <p role="status">{kr ? "민감한 텍스트가 이미 정리된 사건입니다. 추가 정리는 이 화면에서 실행하지 않습니다." : "此案件敏感文本已有清理记录，本页面不执行额外清理。"}</p> : <>
      <ActionFeedback state={state} language={language} saved={kr ? "보관 검토가 저장되었습니다. 실제 정리는 실행되지 않았습니다." : "留存复核已保存，未执行实际清理。"} />
      {state.status === "success" && <a className="button" href={`/reports/operations?case=${candidate.id}&lang=${language}`}>{kr ? "저장 결과 새로고침" : "刷新核对保存结果"}</a>}
      <form action={action} onSubmit={guard} aria-busy={pending}>
        <fieldset disabled={pending || state.status === "success"}>
        <legend>{kr ? "보관 검토 내용" : "留存复核内容"}</legend>
        <input type="hidden" name="reportId" value={candidate.id} /><input type="hidden" name="caseVersion" value={caseVersion} /><input type="hidden" name="reviewVersion" value={reviewVersion} />
        <label htmlFor="retention-decision">{kr ? "보관 결정" : "留存决定"}<select id="retention-decision" name="decision" value={decision} onChange={event => setDecision(event.target.value as RetentionDecision)}>{(["retain", "eligible_for_clear"] as const).map(value => <option key={value} value={value}>{retentionDecisionLabel(value, language)}</option>)}</select></label>
        <label htmlFor="retention-hold">{kr ? "보류 사유" : "暂停清理原因"}<select id="retention-hold" name="hold" value={hold} onChange={event => setHold(event.target.value as RetentionHold)}>{(["none", "appeal", "legal", "investigation"] as const).map(value => <option key={value} value={value}>{retentionHoldLabel(value, language)}</option>)}</select></label>
        <label htmlFor="retention-reason">{kr ? "내부 검토 사유 (5~1000자)" : "内部复核理由（5–1000字）"}<textarea id="retention-reason" name="reason" minLength={5} maxLength={1000} required value={reason} onChange={event => setReason(event.target.value)} /></label>
        <label htmlFor="retention-next-review">{kr ? "다음 검토 시간 (UTC, 향후 366일 이내)" : "下次复核时间（UTC，未来366天内）"}<input id="retention-next-review" type="datetime-local" required value={nextReviewAt} onChange={event => setNextReviewAt(event.target.value)} /></label><input type="hidden" name="nextReviewAt" value={nextReviewISO} />
        <button className="button primary" type="submit" disabled={pending || state.status === "success"}>{pending ? (kr ? "저장 중…" : "正在保存…") : (kr ? "보관 검토 저장" : "保存留存复核")}</button>
        </fieldset>
      </form>
    </>}
  </section>;
}

function DataRequestReviewForm({ request, language }: { request: ReviewerDataRequest; language: Language }) {
  const kr = language === "KR"; const choices = dataRequestTransitions(request.status);
  const [state, action, pending] = useActionState<OperationsActionState, FormData>(reviewDataRequest, { status: "idle" });
  const guard = useSubmitGuard(pending, state);
  const [expectedVersion] = useState(request.version);
  const [nextStatus, setNextStatus] = useState<string>(choices[0] ?? "");
  const [publicResponse, setPublicResponse] = useState(request.public_response);
  const [internalReason, setInternalReason] = useState("");
  const [approvalReference, setApprovalReference] = useState("");
  return <article className="case-card"><h3>{dataRequestKindLabel(request.request_kind, language)} · {dataRequestStatusLabel(request.status, language)}</h3>
    <p className="case-id">{kr ? "요청 번호" : "请求编号"}: {request.id}</p><p><a href={`/reports/review/${request.report_id}?lang=${language}`}>{kr ? "사건 검토 보기" : "查看案件审核"}</a></p>
    <p className="case-description">{request.details}</p><p>{kr ? "접수 (한국 시간)" : "提交（韩国时间）"}: <time dateTime={request.created_at}>{displayTime(request.created_at, language)}</time></p>
    <p>{kr ? "기존 공개 답변" : "已有公开答复"}: {request.public_response || "—"}</p>
    <details><summary>{kr ? "내부 검토 기록" : "内部处理记录"}</summary><p className="internal-note">{request.internal_reason || "—"}</p><p>{kr ? "승인 근거 번호" : "批准依据编号"}: {request.approval_reference || "—"}</p></details>
    <p>{kr ? "승인은 검토 결과일 뿐입니다. 파일 제공·원문 정정·삭제를 자동 수행하거나 완료로 표시하지 않습니다." : "批准只是审核结果，不会自动提供文件、更正原文、删除数据或将请求标为已执行。"}</p>
    <ActionFeedback state={state} language={language} saved={kr ? "검토 결과가 저장되었습니다. 실제 자료 처리는 별도 승인 절차입니다." : "审核结果已保存，实际资料处理仍需单独批准执行。"} />
    {state.status === "success" && <a className="button" href={`/reports/operations?lang=${language}`}>{kr ? "검토 결과 새로고침" : "刷新审核结果"}</a>}
    {choices.length > 0 && <form action={action} onSubmit={guard} aria-busy={pending}>
      <fieldset disabled={pending || state.status === "success"}>
      <legend>{kr ? "요청 검토 내용" : "请求审核内容"}</legend>
      <input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="version" value={expectedVersion} />
      <label htmlFor={`data-request-status-${request.id}`}>{kr ? "다음 상태" : "下一状态"}<select id={`data-request-status-${request.id}`} name="nextStatus" value={nextStatus} onChange={event => setNextStatus(event.target.value)}>{choices.map(value => <option key={value} value={value}>{dataRequestStatusLabel(value, language)}</option>)}</select></label>
      <label htmlFor={`data-request-public-${request.id}`}>{kr ? "요청자에게 공개할 답변" : "向请求人公开的答复"}<textarea id={`data-request-public-${request.id}`} name="publicResponse" minLength={nextStatus === "under_review" ? 0 : 1} maxLength={2000} required={nextStatus !== "under_review"} value={publicResponse} onChange={event => setPublicResponse(event.target.value)} /></label>
      <label htmlFor={`data-request-reason-${request.id}`}>{kr ? "비공개 검토 사유 (5~1000자)" : "非公开审核理由（5–1000字）"}<textarea id={`data-request-reason-${request.id}`} name="internalReason" minLength={5} maxLength={1000} required value={internalReason} onChange={event => setInternalReason(event.target.value)} /></label>
      <label htmlFor={`data-request-reference-${request.id}`}>{kr ? "승인 근거 번호 (승인 시 필수, 영문·숫자 및 . _ : / -)" : "批准依据编号（批准时必填，限字母、数字及 . _ : / -）"}<input id={`data-request-reference-${request.id}`} name="approvalReference" type="text" pattern="[A-Za-z0-9]([A-Za-z0-9._:]|/|-){4,119}" minLength={nextStatus === "approved" ? 5 : 0} maxLength={120} required={nextStatus === "approved"} value={approvalReference} onChange={event => setApprovalReference(event.target.value)} /></label>
      <button className="button primary" type="submit" disabled={pending || state.status === "success"}>{pending ? (kr ? "저장 중…" : "正在保存…") : (kr ? "요청 검토 저장" : "保存请求审核")}</button>
      </fieldset>
    </form>}
  </article>;
}

export function ReportOperations({ language, overview, error, selectedMissing = false, selectedId }: { language: Language; overview: OperationsOverview | null; error: boolean; selectedMissing?: boolean; selectedId?: string }) {
  const kr = language === "KR";
  return <main className="shell cases-page reporting-operations"><h1>{kr ? "사건 운영 및 보관 검토" : "案件运营与留存复核"}</h1>
    <OperationsNavigation language={language} reviewer />
    <p>{kr ? "90일 규칙은 내부 검토 후보 기준이며 법률 준수를 보증하지 않습니다. 불필요한 개인정보를 검토 메모에 복사하지 마세요." : "90天规则仅为内部复核候选标准，不表示已满足任何法律合规要求。请勿在复核备注中复制不必要的个人信息。"}</p>
    {error || !overview ? <div role="alert"><p>{kr ? "운영 대기열을 불러오지 못했습니다. 대기 건수가 0이라는 뜻이 아닙니다." : "运营队列加载失败，不代表待办为0。"}</p><a className="button" href={`/reports/operations?${new URLSearchParams({ lang: language, ...(selectedId ? { case: selectedId } : {}) })}`}>{kr ? "다시 시도" : "重试"}</a></div> : <>
      <p role="status">{overview.policy.policy_approved ? (kr ? `보관 정책 승인 버전: ${overview.policy.policy_version ?? "—"}` : `留存政策已批准版本：${overview.policy.policy_version ?? "—"}`) : (kr ? "보관 정책이 승인되지 않았습니다. 실제 정리는 실행할 수 없습니다." : "留存政策尚未批准，不能执行实际清理。")}</p>
      {selectedMissing && <p role="status">{kr ? "선택한 사건이 없거나 접근할 수 없습니다." : "所选案件不存在或不可访问。"}</p>}
      {overview.selected && <RetentionReviewForm key={overview.selected.id} candidate={overview.selected} language={language} />}
      <section aria-labelledby="retention-due"><h2 id="retention-due">{kr ? "보관 검토 후보 (최대 20건)" : "留存复核候选（最多20项）"}</h2>
        {overview.retention.length === 0 ? <p role="status">{kr ? "현재 검토 후보가 없습니다." : "当前无复核候选。"}</p> : overview.retention.map(candidate => <article className="case-card" key={candidate.id}>
          <h3><a href={`/reports/operations?case=${candidate.id}&lang=${language}`}>{reportKindLabel(candidate.kind, language)} · {candidate.id}</a></h3>
          <p>{reportStatusLabel(candidate.status, language)} · {retentionDecisionLabel(candidate.decision, language)} · {retentionHoldLabel(candidate.hold, language)}</p>
          <p>{kr ? "수정 시간 (한국 시간)" : "更新时间（韩国时间）"}: <time dateTime={candidate.updated_at}>{displayTime(candidate.updated_at, language)}</time></p>
          {candidate.next_review_at && <p>{kr ? "다음 검토 (한국 시간)" : "下次复核（韩国时间）"}: <time dateTime={candidate.next_review_at}>{displayTime(candidate.next_review_at, language)}</time></p>}
        </article>)}
      </section>
      <section aria-labelledby="data-request-review"><h2 id="data-request-review">{kr ? "최근 정보 요청 (최대 20건)" : "最近资料请求（最多20项）"}</h2>
        {overview.requests.length === 0 ? <p role="status">{kr ? "표시할 정보 요청이 없습니다." : "暂无资料请求。"}</p> : overview.requests.map(request => <DataRequestReviewForm key={request.id} request={request} language={language} />)}
      </section>
    </>}
    <a className="button" href={`/reports/operations?${new URLSearchParams({ lang: kr ? "CN" : "KR", ...(selectedId ? { case: selectedId } : {}) })}`}>{kr ? "中文" : "한국어"}</a>
  </main>;
}
