"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { deletePost } from "@/app/posts/actions";
import { formatPostDate, postAvatarInitial, type PublicPost } from "@/lib/posts";
import type { Language } from "@/lib/auth";

export function PostDetailClient({ post, language, authenticated, currentUsername, currentDisplayName, canDelete }: { post: PublicPost; language: Language; authenticated: boolean; currentUsername?: string; currentDisplayName?: string; canDelete: boolean }) {
  const [activeLanguage, setActiveLanguage] = useState(language);
  const korean = activeLanguage === "KR";
  const author = post.author;
  if (!author) return null;
  return <main><Header language={activeLanguage} onLanguageChange={setActiveLanguage} authenticated={authenticated} username={currentUsername} displayName={currentDisplayName} /><section className="shell post-detail-page"><article className="post-detail-card"><div className="post-detail-author"><div className="avatar coral" aria-hidden="true">{postAvatarInitial(author)}</div><div><a href={`/u/${encodeURIComponent(author.username)}?lang=${activeLanguage}`}>{author.display_name || author.username}</a><p>@{author.username} · {formatPostDate(post.created_at, activeLanguage)}</p></div></div><p className="post-language">{post.language === "KR" ? "한국어" : "中文"}</p><h1>{post.title}</h1><p className="post-detail-content">{post.content}</p>{canDelete && <form action={deletePost} className="post-delete-form"><input type="hidden" name="postId" value={post.id} /><input type="hidden" name="language" value={activeLanguage} /><button type="submit" className="delete-post">{korean ? "게시글 삭제" : "删除帖子"}</button></form>}</article></section></main>;
}
