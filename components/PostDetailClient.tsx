"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { deletePost } from "@/app/posts/actions";
import { formatPostDate, postAvatarInitial, postCategoryLabel, postLanguageLabel, type PublicPost } from "@/lib/posts";
import type { Language } from "@/lib/auth";

export function PostDetailClient({ post, language, authenticated, currentUsername, currentDisplayName, canDelete }: { post: PublicPost; language: Language; authenticated: boolean; currentUsername?: string; currentDisplayName?: string; canDelete: boolean }) {
  const [activeLanguage, setActiveLanguage] = useState(language);
  const korean = activeLanguage === "KR";
  const author = post.author;
  if (!author) return null;
  return <main><Header language={activeLanguage} onLanguageChange={setActiveLanguage} authenticated={authenticated} username={currentUsername} displayName={currentDisplayName} /><section className="shell post-detail-page"><article className="post-detail-card"><div className="post-detail-author"><div className="avatar coral" aria-hidden="true">{postAvatarInitial(author)}</div><div><a href={`/u/${encodeURIComponent(author.username)}?lang=${activeLanguage}`}>{author.display_name || author.username}</a><p>@{author.username} · {formatPostDate(post.created_at, activeLanguage)}</p></div></div><p className="post-language">{postCategoryLabel(post.category, activeLanguage)} · {postLanguageLabel(post.language, activeLanguage)}</p><h1>{post.title}</h1><p className="post-detail-content">{post.content}</p>{canDelete && <DeletePostControl postId={post.id} language={activeLanguage} korean={korean} />}</article></section></main>;
}

function DeletePostControl({ postId, language, korean }: { postId: string; language: Language; korean: boolean }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" className="delete-post" onClick={() => setConfirming(true)}>{korean ? "게시글 삭제" : "删除帖子"}</button>;
  return <section className="delete-confirmation" aria-live="polite"><p>{korean ? "이 게시글을 정말 삭제할까요? 이 작업은 되돌릴 수 없습니다." : "确定删除这篇帖子吗？此操作无法撤销。"}</p><div><button type="button" className="button secondary" onClick={() => setConfirming(false)}>{korean ? "취소" : "取消"}</button><form action={deletePost}><input type="hidden" name="postId" value={postId} /><input type="hidden" name="language" value={language} /><button type="submit" className="delete-post">{korean ? "삭제 확인" : "确认删除"}</button></form></div></section>;
}
