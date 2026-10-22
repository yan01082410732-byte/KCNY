"use client";

import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import { usePostDraft } from "@/components/usePostDraft";
import { createPost } from "@/app/posts/actions";
import type { Language } from "@/lib/auth";
import { postDraftKey } from "@/lib/post-drafts";
import { isPostCategory } from "@/lib/posts";

const copy = {
  CN: { heading: "分享一段故事", titleLabel: "标题", contentLabel: "内容", categoryLabel: "分类", languageLabel: "帖子语言", titlePlaceholder: "给你的帖子起一个标题", contentPlaceholder: "写下你想分享的内容…", helper: "最多 5000 字。仅支持纯文字。", publish: "发布帖子", publishing: "正在发布…", categories: { culture: "文化交流", language: "语言学习", travel: "旅行", study: "留学生活", daily: "日常", other: "其他" } },
  KR: { heading: "이야기를 나눠 보세요", titleLabel: "제목", contentLabel: "내용", categoryLabel: "분류", languageLabel: "게시글 언어", titlePlaceholder: "게시글 제목을 입력하세요", contentPlaceholder: "나누고 싶은 이야기를 작성해 보세요…", helper: "최대 5000자이며, 일반 텍스트만 지원합니다.", publish: "글 게시", publishing: "게시 중…", categories: { culture: "문화 교류", language: "언어 학습", travel: "여행", study: "유학 생활", daily: "일상", other: "기타" } },
};

export function PostComposer({ language, viewerId, error }: { language: Language; viewerId: string; error?: string }) {
  const { draft, setDraft } = usePostDraft(viewerId, { title: "", content: "", category: "culture", language });
  const text = copy[language];
  const errorText = error ? language === "KR" ? "게시하지 못했습니다. 내용을 확인하고 다시 시도해 주세요. 작성 중인 글은 보관됩니다." : "发布失败，请检查内容后重试。草稿已保留。" : null;
  return <main className="auth-page post-composer-page"><section className="auth-card post-composer-card"><p className="eyebrow"><span /> KCNY</p><h1>{text.heading}</h1>{errorText && <p className="auth-error" role="alert">{errorText}</p>}<form action={createPost} onSubmit={() => { try { sessionStorage.setItem(postDraftKey(viewerId), JSON.stringify(draft)); } catch { /* Keep the mounted draft. */ } }}>
    <label htmlFor="title">{text.titleLabel}<input id="title" name="title" type="text" required minLength={1} maxLength={120} autoComplete="off" placeholder={text.titlePlaceholder} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
    <label htmlFor="content">{text.contentLabel}<textarea id="content" name="content" required minLength={1} maxLength={5000} placeholder={text.contentPlaceholder} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} /></label>
    <label htmlFor="category">{text.categoryLabel}<select id="category" name="category" value={draft.category} onChange={(event) => { if (isPostCategory(event.target.value)) setDraft((current) => ({ ...current, category: event.target.value as typeof current.category })); }}>{Object.entries(text.categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label htmlFor="postLanguage">{text.languageLabel}<select id="postLanguage" value={draft.language} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value === "KR" ? "KR" : "CN" }))}><option value="CN">中文</option><option value="KR">한국어</option></select></label>
    <input type="hidden" name="language" value={draft.language} />
    <p className="field-help">{text.helper}</p><AuthSubmitButton idleText={text.publish} pendingText={text.publishing} />
  </form></section></main>;
}
