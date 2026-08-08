"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import type { Language } from "@/lib/auth";
import type { PublicPost } from "@/lib/posts";

const copy = {
  CN: {
    eyebrow: "SAVED POSTS",
    title: "我的收藏",
    emptyTitle: "还没有收藏帖子",
    emptyBody: "看到喜欢的内容时，可以点一下收藏。",
  },
  KR: {
    eyebrow: "SAVED POSTS",
    title: "내 저장글",
    emptyTitle: "아직 저장한 게시물이 없습니다",
    emptyBody: "마음에 드는 게시물을 저장해 보세요.",
  },
};

export function BookmarksPageClient({ posts, initialLanguage, username, displayName }: {
  posts: PublicPost[];
  initialLanguage: Language;
  username?: string;
  displayName?: string;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const text = copy[language];
  const returnTo = `/bookmarks?lang=${language}`;
  return <main>
    <Header language={language} onLanguageChange={setLanguage} authenticated username={username} displayName={displayName} />
    <section className="shell bookmarks-page">
      <div className="section-heading"><div><p className="eyebrow"><span /> {text.eyebrow}</p><h1>{text.title}</h1></div></div>
      <div className="feed">{posts.map((post) => <PostCard key={post.id} post={post} language={language} authenticated returnTo={returnTo} />)}
        {posts.length === 0 && <div className="bookmarks-empty"><h2>{text.emptyTitle}</h2><p>{text.emptyBody}</p></div>}
      </div>
    </section>
  </main>;
}
