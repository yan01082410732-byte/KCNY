import type { Language } from "@/lib/auth";
import { reportStatusLabel, reportKindLabel, reportReasonLabel, reportTargetLabel, type ReportCase, type ReviewStatus } from "@/lib/reporting";

export function ReportsUnavailable({ language, forbidden = false }: { language: Language; forbidden?: boolean }) {
  const kr = language === "KR";
  return <main className="auth-page"><section className="auth-card"><h1>{forbidden ? (kr ? "접근 권한 없음" : "无审核权限") : (kr ? "신고 및 민원" : "举报与投诉")}</h1><p role="status">{forbidden ? (kr ? "현재 계정으로 검토할 수 없습니다." : "当前账号不能访问人工审核。") : (kr ? "이 환경에서는 신고 및 민원 저장 기능이 비활성화되어 있습니다." : "当前环境未启用举报与投诉保存功能。")}</p><a href={`/?lang=${language}`}>{kr ? "커뮤니티로 돌아가기" : "返回社区"}</a></section></main>;
}

export function ReportList({ language, reports, error, nextCursor, reviewer, review = false, status }: { language: Language; reports: ReportCase[]; error: boolean; nextCursor?: string; reviewer?: boolean; review?: boolean; status?: ReviewStatus }) {
  const kr = language === "KR"; const base = review ? "/reports/review" : "/reports";
  return <main className="shell cases-page"><h1>{review ? (kr ? "수동 검토" : "人工审核") : (kr ? "내 신고 및 민원" : "我的举报与投诉")}</h1>
    <nav className="case-navigation"><a href={`/?lang=${language}`}>{kr ? "커뮤니티" : "社区"}</a><a href={`/reports/new?kind=complaint&lang=${language}`}>{kr ? "민원 제출" : "提交投诉"}</a><a href={`/reports?lang=${language}`}>{kr ? "내 사건" : "我的案件"}</a>{reviewer && <a href={`/reports/review?lang=${language}`}>{kr ? "검토 대기열" : "审核队列"}</a>}<a href={`${base}?lang=${kr ? "CN" : "KR"}`}>{kr ? "中文" : "한국어"}</a></nav>
    {review && <form className="case-filters" method="get"><input type="hidden" name="lang" value={language} /><label htmlFor="case-status">{kr ? "상태" : "状态"}</label><select name="status" id="case-status" defaultValue={status ?? ""}><option value="">{kr ? "전체" : "全部"}</option>{(["pending","under_review","resolved","dismissed"] as const).map(s => <option key={s} value={s}>{reportStatusLabel(s, language)}</option>)}</select><button className="button" type="submit">{kr ? "적용" : "筛选"}</button></form>}
    {error ? <div role="alert"><p>{kr ? "사건을 불러오지 못했습니다." : "案件加载失败。"}</p><a href={`${base}?lang=${language}${status ? `&status=${status}` : ""}`}>{kr ? "다시 시도" : "重试"}</a></div> : reports.length === 0 ? <p role="status">{kr ? "표시할 사건이 없습니다." : "暂无案件。"}</p> : <div className="case-list">{reports.map(report => <article className="case-card" key={report.id}><h2><a href={`${base}/${report.id}?lang=${language}`}>{report.kind === "complaint" ? (kr ? "민원" : "投诉") : (kr ? "신고" : "举报")} · {report.id}</a></h2><p className="case-status">{reportStatusLabel(report.status, language)}</p><p>{report.description || (kr ? "추가 설명 없음" : "无补充说明")}</p><time dateTime={report.created_at}>{new Date(report.created_at).toLocaleString(kr ? "ko-KR" : "zh-CN", { timeZone: "Asia/Seoul" })}</time></article>)}</div>}
    {!error && nextCursor && <a className="button case-more" href={`${base}?${new URLSearchParams({ lang: language, before: nextCursor, ...(status ? { status } : {}) })}`}>{kr ? "이전 사건 더 보기" : "查看更多案件"}</a>}
  </main>;
}

export function ReportDetail({ report, language, targetHref }: { report: ReportCase; language: Language; targetHref?: string }) {
  const kr = language === "KR";
  return <section className="case-card"><h1>{kr ? "사건 상세" : "案件详情"}</h1><p className="case-id">{report.id}</p><p className="case-status">{reportStatusLabel(report.status, language)}</p><dl><dt>{kr ? "유형 / 사유" : "类型 / 原因"}</dt><dd>{reportKindLabel(report.kind, language)} · {reportReasonLabel(report.reason, language)}</dd><dt>{kr ? "관련 대상" : "关联对象"}</dt><dd>{report.target_id && report.target_type ? <>{reportTargetLabel(report.target_type, language)} · {report.target_id} {targetHref && <a href={targetHref}>{kr ? "대상 보기" : "查看对象"}</a>}</> : (kr ? "일반 민원" : "无目标的一般投诉")}</dd><dt>{kr ? "설명" : "说明"}</dt><dd className="case-description">{report.description || "—"}</dd><dt>{kr ? "접수 시간" : "提交时间"}</dt><dd><time>{new Date(report.created_at).toLocaleString(kr ? "ko-KR" : "zh-CN", { timeZone: "Asia/Seoul" })}</time></dd><dt>{kr ? "수정 시간" : "更新时间"}</dt><dd><time>{new Date(report.updated_at).toLocaleString(kr ? "ko-KR" : "zh-CN", { timeZone: "Asia/Seoul" })}</time></dd><dt>{kr ? "공개 처리 결과" : "公开处理结果"}</dt><dd className="case-public-resolution">{report.public_resolution || (kr ? "아직 처리 결과가 없습니다." : "暂未公布处理结果。")}</dd></dl></section>;
}
