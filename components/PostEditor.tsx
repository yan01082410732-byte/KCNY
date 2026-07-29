"use client";

import { useState } from "react";
import { updatePost } from "@/app/posts/actions";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import type { Language } from "@/lib/auth";
import {
  POST_CATEGORIES,
  postCategoryLabel,
  type PostCategory,
} from "@/lib/posts";

type EditablePost = {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  language: Language;
};

export function PostEditor({
  post,
  language,
}: {
  post: EditablePost;
  language: Language;
}) {
  const [postLanguage, setPostLanguage] = useState<Language>(post.language);
  const [category, setCategory] = useState<PostCategory>(post.category);
  const korean = language === "KR";
  const text = korean
    ? {
        heading: "게시글 수정",
        description: "게시글 내용을 수정한 뒤 저장하세요.",
        title: "제목",
        content: "내용",
        category: "분류",
        postLanguage: "게시글 언어",
        helper: "본문은 최대 5000자까지 입력할 수 있습니다.",
        save: "수정 저장",
        saving: "저장 중…",
        cancel: "게시글로 돌아가기",
      }
    : {
        heading: "编辑帖子",
        description: "修改帖子内容后保存。",
        title: "标题",
        content: "正文",
        category: "分类",
        postLanguage: "帖子语言",
        helper: "正文最多可输入 5000 字。",
        save: "保存修改",
        saving: "保存中…",
        cancel: "取消并返回帖子",
      };

  return (
    <main className="auth-page post-composer-page">
      <section className="auth-card post-composer-card">
        <p className="eyebrow"><span /> KCNY</p>
        <h1>{text.heading}</h1>
        <p className="field-help">{text.description}</p>
        <form action={updatePost}>
          <input type="hidden" name="postId" value={post.id} />
          <label htmlFor="title">
            {text.title}
            <input id="title" name="title" type="text" required minLength={1} maxLength={120} autoComplete="off" defaultValue={post.title} />
          </label>
          <label htmlFor="content">
            {text.content}
            <textarea id="content" name="content" required minLength={1} maxLength={5000} defaultValue={post.content} />
          </label>
          <label htmlFor="category">
            {text.category}
            <select id="category" name="category" value={category} onChange={(event) => setCategory(event.target.value as PostCategory)}>
              {POST_CATEGORIES.map((value) => <option key={value} value={value}>{postCategoryLabel(value, language)}</option>)}
            </select>
          </label>
          <label htmlFor="postLanguage">
            {text.postLanguage}
            <select id="postLanguage" value={postLanguage} onChange={(event) => setPostLanguage(event.target.value as Language)}>
              <option value="CN">中文</option>
              <option value="KR">한국어</option>
            </select>
          </label>
          <input type="hidden" name="language" value={postLanguage} />
          <p className="field-help">{text.helper}</p>
          <AuthSubmitButton idleText={text.save} pendingText={text.saving} />
        </form>
        <a className="button secondary post-editor-cancel" href={`/posts/${encodeURIComponent(post.id)}?lang=${language}`}>{text.cancel}</a>
      </section>
    </main>
  );
}
