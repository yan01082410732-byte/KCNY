"use client";
import { useState } from "react";

import { updatePost } from "@/app/posts/actions";
import { AuthSubmitButton } from "@/components/AuthSubmitButton";
import { usePostDraft } from "@/components/usePostDraft";
import type { Language } from "@/lib/auth";
import { postDraftKey } from "@/lib/post-drafts";
import { PostImageManager } from "@/components/PostImageControls";
import {
  POST_CATEGORIES,
  isPostCategory,
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
  viewerId,
  error,
  mediaEnabled = false,
}: {
  post: EditablePost;
  language: Language;
  viewerId: string;
  error?: string;
  mediaEnabled?: boolean;
}) {
  const [mediaBusy, setMediaBusy] = useState(false);
  const { draft, setDraft } = usePostDraft(viewerId, { title: post.title, content: post.content, category: post.category, language: post.language }, post.id);
  const korean = language === "KR";
  const postLanguageOptions = korean
    ? { CN: "중국어", KR: "한국어" }
    : { CN: "中文", KR: "韩文" };
  const text = korean
    ? {
        heading: "게시글 수정",
        description: "게시글 내용을 수정한 뒤 저장하세요.",
        title: "제목",
        content: "내용",
        category: "분류",
        postLanguage: "게시글 언어",
        helper: "본문은 최대 5000자까지 입력할 수 있습니다. 현재는 일반 텍스트만 지원합니다.",
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
        helper: "正文最多可输入 5000 字。目前仅支持纯文字。",
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
        {error && <p className="auth-error" role="alert">{korean ? "저장하지 못했습니다. 내용을 확인하고 다시 시도해 주세요. 수정 내용은 보관됩니다." : "保存失败，请检查内容后重试。修改内容已保留。"}</p>}
        <form action={updatePost} onSubmit={() => { try { sessionStorage.setItem(postDraftKey(viewerId, post.id), JSON.stringify(draft)); } catch { /* Keep the mounted draft. */ } }}>
          <input type="hidden" name="postId" value={post.id} />
          <label htmlFor="title">
            {text.title}
            <input id="title" name="title" type="text" required minLength={1} maxLength={120} autoComplete="off" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label htmlFor="content">
            {text.content}
            <textarea id="content" name="content" required minLength={1} maxLength={5000} value={draft.content} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} />
          </label>
          <label htmlFor="category">
            {text.category}
            <select id="category" name="category" value={draft.category} onChange={(event) => { if (isPostCategory(event.target.value)) setDraft((current) => ({ ...current, category: event.target.value as PostCategory })); }}>
              {POST_CATEGORIES.map((value) => <option key={value} value={value}>{postCategoryLabel(value, language)}</option>)}
            </select>
          </label>
          <label htmlFor="postLanguage">
            {text.postLanguage}
            <select id="postLanguage" value={draft.language} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value === "KR" ? "KR" : "CN" }))}>
              <option value="CN">{postLanguageOptions.CN}</option>
              <option value="KR">{postLanguageOptions.KR}</option>
            </select>
          </label>
          <input type="hidden" name="language" value={draft.language} />
          <p className="field-help">{mediaEnabled ? korean ? "글을 저장하거나 이미지를 별도로 업로드·교체할 수 있습니다." : "可保存文字，或单独上传、替换图片。" : text.helper}</p>
          {mediaEnabled && <PostImageManager postId={post.id} language={language} onBusyChange={setMediaBusy} />}
          <fieldset className="post-save-control" disabled={mediaBusy}><AuthSubmitButton idleText={text.save} pendingText={text.saving} /></fieldset>
        </form>
        <a className="button secondary post-editor-cancel" href={`/posts/${encodeURIComponent(post.id)}?lang=${language}`}>{text.cancel}</a>
      </section>
    </main>
  );
}
