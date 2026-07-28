"use client";

import { useState } from "react";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import { createPost } from "@/app/posts/actions";
import type { Language } from "@/lib/auth";

const copy = {
  CN: { heading: "分享一段故事", titleLabel: "标题", contentLabel: "内容", languageLabel: "帖子语言", titlePlaceholder: "给你的帖子起一个标题", contentPlaceholder: "写下你想分享的内容…", helper: "最多 5000 字。仅支持纯文字。", publish: "发布帖子", publishing: "正在发布…" },
  KR: { heading: "이야기를 나눠 보세요", titleLabel: "제목", contentLabel: "내용", languageLabel: "게시글 언어", titlePlaceholder: "게시글 제목을 입력하세요", contentPlaceholder: "나누고 싶은 이야기를 작성해 보세요…", helper: "최대 5000자이며, 일반 텍스트만 지원합니다.", publish: "글 게시", publishing: "게시 중…" },
};

export function PostComposer({ language }: { language: Language }) {
  const [postLanguage, setPostLanguage] = useState<Language>(language);
  const text = copy[language];
  return <main className="auth-page post-composer-page"><section className="auth-card post-composer-card"><p className="eyebrow"><span /> KCNY</p><h1>{text.heading}</h1><form action={createPost}>
    <label htmlFor="title">{text.titleLabel}<input id="title" name="title" type="text" required minLength={1} maxLength={120} autoComplete="off" placeholder={text.titlePlaceholder} /></label>
    <label htmlFor="content">{text.contentLabel}<textarea id="content" name="content" required minLength={1} maxLength={5000} placeholder={text.contentPlaceholder} /></label>
    <label htmlFor="postLanguage">{text.languageLabel}<select id="postLanguage" value={postLanguage} onChange={(event) => setPostLanguage(event.target.value as Language)}><option value="CN">中文</option><option value="KR">한국어</option></select></label>
    <input type="hidden" name="language" value={postLanguage} />
    <p className="field-help">{text.helper}</p><AuthSubmitButton idleText={text.publish} pendingText={text.publishing} />
  </form></section></main>;
}
