"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/auth";
import { confirmReviewerIdentity, type ReviewerBindingActionState } from "@/app/reports/reviewer-binding/actions";

export function ReviewerBindingConfirmation({ language, userId }: { language: Language; userId: string }) {
  const kr = language === "KR";
  const [state, action, pending] = useActionState<ReviewerBindingActionState, FormData>(confirmReviewerIdentity, { status: "idle" });
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [expired, setExpired] = useState(false);
  const locked = useRef(false);
  useEffect(() => { setRequestId(crypto.randomUUID()); }, []);
  useEffect(() => { if (state.status !== "idle") locked.current = false; }, [state]);
  useEffect(() => {
    if (state.status !== "success") return;
    const remaining = Date.parse(state.expiresAt) - Date.now();
    setExpired(remaining <= 0);
    if (remaining <= 0) return;
    const timer = setTimeout(() => setExpired(true), remaining);
    return () => clearTimeout(timer);
  }, [state]);
  const errors = {
    unavailable: kr ? "현재 환경에서 본인 확인 영수증을 생성할 수 없습니다. 권한이 부여되지 않았습니다." : "当前环境无法生成本人确认回执，未授予任何权限。",
    login_required: kr ? "본인의 인증이 완료된 일반 계정으로 다시 로그인해 주세요." : "请用本人已完成验证的普通账号重新登录。",
    confirmation_required: kr ? "표시된 계정이 본인 계정임을 확인하고 체크해 주세요." : "请核对页面显示的账号属于本人，并勾选确认。",
  };
  return <main className="shell binding-page"><section className="case-card binding-card"><h1>{kr ? "검토자 계정 본인 확인" : "审核员账号本人确认"}</h1>
    <p>{kr ? "이 단계는 현재 로그인한 계정에 대한 본인 확인 영수증만 만듭니다. 로그인 자격 증명이 아니며 검토자 권한을 부여하지 않습니다." : "此步骤仅生成当前登录账号的本人确认回执。它不是登录凭据，也不会授予审核权限。"}</p>
    <p>{kr ? "관리자는 별도의 책임자 승인과 신뢰할 수 있는 UUID 바인딩을 확인한 뒤에만 관리 경로에서 권한을 부여할 수 있습니다." : "管理员仍须核对独立的负责人批准和可信 UUID 绑定，才能通过管理通道授予权限。"}</p>
    <p className="binding-identity"><strong>{kr ? "현재 로그인 계정 UUID" : "当前登录账号 UUID"}</strong><code>{userId}</code></p>
    {state.status === "error" && <p role="alert" className="auth-error">{errors[state.reason]}</p>}
    {state.status === "error" && state.reason === "login_required" && <a className="button" href={`/auth/login?lang=${language}&returnTo=/reports/reviewer-binding`}>{kr ? "공식 로그인 페이지" : "前往官方登录页"}</a>}
    {state.status !== "success" && <form action={action} aria-busy={pending} onSubmit={event => {
      if (pending || locked.current || !requestId || !confirmed) event.preventDefault();
      else locked.current = true;
    }}>
      <input type="hidden" name="requestId" value={requestId} />
      <label className="binding-confirm" htmlFor="reviewer-binding-confirm"><input id="reviewer-binding-confirm" name="confirmSelf" type="checkbox" value="yes" required checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} /><span>{kr ? "표시된 UUID가 본인 계정임을 확인합니다. 영수증 생성이 권한 부여가 아님을 이해합니다." : "我确认页面显示的 UUID 对应本人账号，并理解生成回执不等于授予权限。"}</span></label>
      <button className="button primary" type="submit" disabled={pending || !requestId || !confirmed}>{pending ? (kr ? "확인 중…" : "正在确认…") : (kr ? "본인 확인 영수증 생성" : "生成本人确认回执")}</button>
    </form>}
    {state.status === "success" && <section className="binding-result" aria-labelledby="reviewer-binding-result"><h2 id="reviewer-binding-result">{kr ? "본인 확인 영수증" : "本人确认回执"}</h2>
      <p role="status">{expired ? (kr ? "영수증이 만료되었습니다. 관리자에게 새 영수증이 필요할 수 있습니다." : "回执已到期，管理员可能需要新的回执。") : (kr ? "영수증이 생성되었습니다. 검토자 권한은 아직 부여되지 않았습니다." : "回执已生成，仍未授予审核权限。")}</p>
      <p>{kr ? "만료 (한국 시간)" : "到期时间（韩国时间）"}: <time dateTime={state.expiresAt}>{new Date(state.expiresAt).toLocaleString(kr ? "ko-KR" : "zh-CN", { timeZone: "Asia/Seoul" })}</time></p>
      {!expired && <><label htmlFor="reviewer-binding-receipt">{kr ? "신뢰할 수 있는 관리자에게만 안전한 경로로 전달" : "仅通过安全渠道交给可信管理员"}</label><textarea id="reviewer-binding-receipt" value={state.receipt} readOnly rows={7} spellCheck={false} autoComplete="off" /><p>{kr ? "공개 게시물·Git·일반 채팅·스크린샷에 올리지 마세요. 이 화면은 영수증을 브라우저 저장소에 보관하지 않습니다." : "请勿发布到公开帖子、Git、普通聊天或截图中。本页面不会把回执写入浏览器存储。"}</p></>}
      <a className="button" href={`/reports/reviewer-binding?lang=${language}`}>{kr ? "다시 확인" : "重新确认"}</a>
    </section>}
    <nav className="case-navigation" aria-label={kr ? "계정 탐색" : "账号导航"}><a className="button" href={`/settings/profile?lang=${language}`}>{kr ? "계정 설정" : "账号设置"}</a><a className="button" href={`/reports/reviewer-binding?lang=${kr ? "CN" : "KR"}`}>{kr ? "中文" : "한국어"}</a></nav>
  </section><style jsx>{`
    .binding-page { padding-top: 28px; padding-bottom: 48px; overflow-wrap: anywhere; }
    .binding-card { max-width: 760px; margin-inline: auto; min-width: 0; }
    .binding-identity { display: grid; gap: 8px; }
    .binding-identity code { display: block; white-space: normal; overflow-wrap: anywhere; }
    .binding-confirm { display: flex; align-items: flex-start; gap: 12px; min-height: 44px; }
    .binding-confirm input { flex: none; width: 22px; height: 22px; margin-top: 4px; }
    .binding-card .button { display: inline-flex; align-items: center; min-height: 44px; max-width: 100%; white-space: normal; }
    .binding-result { display: grid; gap: 12px; min-width: 0; }
    .binding-result textarea { box-sizing: border-box; width: 100%; min-height: 150px; resize: vertical; overflow-wrap: anywhere; font: inherit; }
    @media (max-width: 600px) { .binding-card { padding: 18px; } .binding-card h1 { font-size: 26px; } }
  `}</style></main>;
}
