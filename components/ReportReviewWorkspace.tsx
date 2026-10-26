import type { Language } from "@/lib/auth";
import { reportKindLabel, reportReasonLabel, reportStatusLabel, type ReportCase } from "@/lib/reporting";
import { REVIEW_AGES, REVIEW_REASONS, REVIEW_STATUSES, reviewCaseHref, reviewQueueHref, reviewQueryParams, type ReviewQuery, type ReviewSummary } from "@/lib/report-review-workspace";

function displayTime(value: string, language: Language) {
  return new Date(value).toLocaleString(language === "KR" ? "ko-KR" : "zh-CN", { timeZone: "Asia/Seoul" });
}

export function ReportReviewWorkspace({ language, query, reports, summary, listError, summaryError, nextCursor }: {
  language: Language; query: ReviewQuery; reports: ReportCase[]; summary: ReviewSummary | null;
  listError: boolean; summaryError: boolean; nextCursor?: string;
}) {
  const kr = language === "KR";
  const ageLabels = kr ? { all: "전체 기간", "24h": "24시간 이상 미처리", "7d": "7일 이상 미처리", "30d": "30일 이상 미처리" }
    : { all: "不限时间", "24h": "超过24小时未处理", "7d": "超过7天未处理", "30d": "超过30天未处理" };
  const refreshParams = reviewQueryParams({ ...query, before: undefined }, language); refreshParams.delete("asOf");
  return <main className="shell cases-page review-workspace">
    <h1>{kr ? "수동 검토 작업대" : "人工审核工作台"}</h1>
    <nav className="case-navigation" aria-label={kr ? "사건 탐색" : "案件导航"}>
      <a href={`/reports?lang=${language}`}>{kr ? "내 사건" : "我的案件"}</a>
      <a href={`/reports/operations?lang=${language}`}>{kr ? "운영 및 보관 검토" : "运营与留存复核"}</a>
      <a href={reviewQueueHref(query, kr ? "CN" : "KR")}>{kr ? "中文" : "한국어"}</a>
      <a href={`/reports/review?${refreshParams}`}>{kr ? "최신 대기열 새로고침" : "刷新最新队列"}</a>
    </nav>
    <form method="get" className="case-filters review-workspace-filters" aria-label={kr ? "검토 대기열 필터" : "审核队列筛选"}>
      <input type="hidden" name="lang" value={language} />
      <label htmlFor="review-kind">{kr ? "유형" : "类型"}<select id="review-kind" name="kind" defaultValue={query.kind ?? ""}><option value="">{kr ? "전체" : "全部"}</option>{(["report", "complaint"] as const).map(kind => <option key={kind} value={kind}>{reportKindLabel(kind, language)}</option>)}</select></label>
      <label htmlFor="review-reason-filter">{kr ? "사유" : "原因"}<select id="review-reason-filter" name="reason" defaultValue={query.reason ?? ""}><option value="">{kr ? "전체" : "全部"}</option>{REVIEW_REASONS.map(reason => <option key={reason} value={reason}>{reportReasonLabel(reason, language)}</option>)}</select></label>
      <label htmlFor="review-status">{kr ? "상태" : "状态"}<select id="review-status" name="status" defaultValue={query.status ?? ""}><option value="">{kr ? "전체" : "全部"}</option>{REVIEW_STATUSES.map(status => <option key={status} value={status}>{reportStatusLabel(status, language)}</option>)}</select></label>
      <label htmlFor="review-age">{kr ? "미처리 기간" : "未处理时长"}<select id="review-age" name="age" defaultValue={query.age}>{REVIEW_AGES.map(age => <option key={age} value={age}>{ageLabels[age]}</option>)}</select></label>
      <label htmlFor="review-order">{kr ? "접수 시간 정렬" : "创建时间排序"}<select id="review-order" name="order" defaultValue={query.order}><option value="newest">{kr ? "최신순" : "最新优先"}</option><option value="oldest">{kr ? "오래된순" : "最早优先"}</option></select></label>
      <label className="review-id-filter" htmlFor="review-id">{kr ? "정확한 사건 ID" : "准确案件ID"}<input id="review-id" name="id" maxLength={36} defaultValue={query.id ?? ""} autoComplete="off" spellCheck={false} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
      <button className="button primary" type="submit">{kr ? "필터 적용" : "应用筛选"}</button>
      <a className="button" href={`/reports/review?lang=${language}`}>{kr ? "전체 사건" : "全部案件"}</a>
    </form>
    {!query.valid ? <p role="alert">{kr ? "필터 또는 페이지 커서가 올바르지 않습니다. 조건을 확인해 다시 적용해 주세요." : "筛选条件或分页游标无效，请检查后重新应用。"}</p> : <>
      <section className="case-card" aria-labelledby="review-summary-title">
        <h2 id="review-summary-title">{kr ? "권한 범위 내 사건 개요" : "授权范围内案件概要"}</h2>
        <p>{kr ? "유형·사유·미처리 기간·정확한 ID 조건을 반영합니다. 현재 상태 필터와 페이지 위치는 집계에서 제외됩니다." : "统计按类型、原因、未处理时长及准确ID范围计算，不受当前状态筛选和分页位置影响。"}</p>
        {summaryError || !summary ? <p role="alert">{kr ? "집계를 불러오지 못했습니다. 0건으로 간주하지 마세요." : "统计加载失败，不能视为零案件。"}</p> : <>
          <dl className="review-summary-counts">{REVIEW_STATUSES.map(status => <div key={status}><dt>{reportStatusLabel(status, language)}</dt><dd data-review-count={status}>{summary.counts[status]}</dd></div>)}</dl>
          <p>{kr ? "가장 오래된 미처리 사건" : "最早待处理案件时间"}: {summary.oldest_open_created_at ? <time dateTime={summary.oldest_open_created_at}>{displayTime(summary.oldest_open_created_at, language)}</time> : (kr ? "해당 미처리 사건 없음" : "当前范围无待处理案件")}</p>
        </>}
        <p className="review-as-of">{kr ? "페이지 탐색 기준 시각" : "本次分页快照时间"}: <time dateTime={query.asOf}>{displayTime(query.asOf, language)}</time></p>
      </section>
      {listError ? <div role="alert"><p>{kr ? "사건 목록을 불러오지 못했습니다." : "案件列表加载失败。"}</p><a href={reviewQueueHref(query, language)}>{kr ? "다시 시도" : "重试"}</a></div>
        : reports.length === 0 ? <p role="status">{kr ? "이 조건의 사건이 없습니다." : "当前条件下暂无案件。"}</p>
          : <div className="case-list">{reports.map(report => <article className="case-card" key={report.id}>
            <h2><a href={reviewCaseHref(report.id, query, language)}>{reportKindLabel(report.kind, language)} · {report.id}</a></h2>
            <p className="case-status">{reportStatusLabel(report.status, language)} · {reportReasonLabel(report.reason, language)}</p>
            <p>{report.description || (kr ? "추가 설명 없음" : "无补充说明")}</p>
            <p>{kr ? "버전" : "版本"}: {report.version}</p>
            <time dateTime={report.created_at}>{displayTime(report.created_at, language)}</time>
          </article>)}</div>}
      {!listError && nextCursor && <a className="button case-more" href={reviewQueueHref({ ...query, before: { createdAt: nextCursor.split("|")[0], id: nextCursor.split("|")[1] } }, language)}>{kr ? "다음 사건 더 보기" : "查看更多案件"}</a>}
    </>}
  </main>;
}
