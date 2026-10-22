"use client";

import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import type { Language } from "@/lib/auth";
import type { PublicPost } from "@/lib/posts";
import { postLikeErrorMessage } from "@/lib/post-likes";

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

export function BookmarksPageClient({ posts, initialLanguage, username, displayName, unavailable, actionError }: {
  posts: PublicPost[];
  initialLanguage: Language;
  username?: string;
  displayName?: string;
  unavailable?: boolean;
  actionError?: string;
}) {
  const language = initialLanguage;
  const text = copy[language];
  const returnTo = `/bookmarks?lang=${language}`;
  return <main>
    <Header language={language} onLanguageChange={() => {}} languageHref={(next) => `/bookmarks?lang=${next}`} authenticated username={username} displayName={displayName} />
    <section className="shell bookmarks-page">
      {postLikeErrorMessage(actionError, language) && <p className="auth-error" role="alert">{postLikeErrorMessage(actionError, language)}</p>}
      <div className="section-heading"><div><p className="eyebrow"><span /> {text.eyebrow}</p><h1>{text.title}</h1></div></div>
      {unavailable ? <div className="bookmarks-empty" role="alert"><h2>{language === "KR" ? "저장글을 불러오지 못했습니다." : "无法加载收藏帖子。"}</h2><a className="button secondary" href={returnTo}>{language === "KR" ? "다시 시도" : "重试"}</a></div> : <div className="feed">{posts.map((post) => <PostCard key={post.id} post={post} language={language} authenticated returnTo={returnTo} />)}
        {posts.length === 0 && <div className="bookmarks-empty"><h2>{text.emptyTitle}</h2><p>{text.emptyBody}</p></div>}
      </div>}
    </section>
  </main>;
}
