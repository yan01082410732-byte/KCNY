"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import type { Language } from "@/lib/auth";
import { followingFeedHref, followingFeedLabels, type FeedMode } from "@/lib/following-feed";
import { POST_CATEGORIES, postCategoryLabel, type PostCategory, type PublicPost } from "@/lib/posts";

const copy = {
  CN: { eyebrow: "中国 × 韩国", title: "从语言开始，\n与彼此相遇", description: "一个面向喜爱中韩文化、语言与生活交流的人们的社区。分享故事、提问、学习，也认识新的朋友。", explore: "浏览讨论", create: "发布帖子", feed: "最新讨论", empty: "暂时还没有帖子，期待第一条分享。", welcome: "欢迎来到 KCNY" },
  KR: { eyebrow: "중국 × 한국", title: "언어로 시작해,\n서로를 만나요", description: "중국과 한국의 문화, 언어, 생활을 좋아하는 사람들을 위한 커뮤니티입니다. 이야기를 나누고 배우며 새로운 친구를 만나보세요.", explore: "둘러보기", create: "글 쓰기", feed: "최신 이야기", empty: "아직 게시글이 없습니다. 첫 번째 이야기를 들려주세요.", welcome: "KCNY에 오신 것을 환영합니다" },
};

export function HomePageClient({ authenticated, username, displayName, posts, initialLanguage, initialFeed, initialCategory }: { authenticated: boolean; username?: string; displayName?: string; posts: PublicPost[]; initialLanguage: Language; initialFeed: FeedMode; initialCategory?: PostCategory }) {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const feed = initialFeed;
  const category = initialCategory;
  const text = copy[language];
  const followingText = followingFeedLabels(language);
  const hrefFor = (nextLanguage = language, nextFeed = feed, nextCategory = category) => followingFeedHref(nextLanguage, nextFeed, nextCategory);
  const navigate = (nextLanguage = language, nextFeed = feed, nextCategory = category) => router.push(hrefFor(nextLanguage, nextFeed, nextCategory));
  const changeLanguage = (nextLanguage: Language) => { setLanguage(nextLanguage); navigate(nextLanguage); };
  const createHref = authenticated ? `/posts/new?lang=${language}` : `/auth/login?lang=${language}&returnTo=${encodeURIComponent(hrefFor())}`;
  const feedReturnTo = hrefFor();
  const followingLoginHref = `/auth/login?lang=${language}&returnTo=${encodeURIComponent(hrefFor(language, "following", category))}`;

  return <main>
    <Header language={language} onLanguageChange={changeLanguage} authenticated={authenticated} username={username} displayName={displayName} />
    <section className="hero shell"><div className="hero-copy"><p className="eyebrow"><span /> {text.eyebrow}</p><h1>{text.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1><p className="intro">{text.description}</p><div className="hero-actions"><a href="#feed" className="button primary">{text.explore} <b>→</b></a><a className="button secondary" href={createHref}>{text.create}</a></div></div><div className="hero-art" aria-label="KCNY illustration"><div className="sun" /><div className="speech speech-one">你好 <small>Hello!</small></div><div className="speech speech-two">반가워요 <small>Nice to meet you.</small></div><div className="bridge"><i /><i /><i /></div><div className="land land-left" /><div className="land land-right" /></div></section>
    <section className="content shell" id="feed"><div className="section-heading"><div><p className="eyebrow"><span /> COMMUNITY</p><h2>{feed === "following" ? followingText.feed : text.feed}</h2></div><a className="new-post" href={createHref}>＋ {text.create}</a></div>
      <nav className="feed-tabs" aria-label={language === "KR" ? "피드 선택" : "动态筛选"}><a href={hrefFor(language, "all", category)} className={feed === "all" ? "active" : ""} aria-current={feed === "all" ? "page" : undefined}>{followingText.all}</a><a href={hrefFor(language, "following", category)} className={feed === "following" ? "active" : ""} aria-current={feed === "following" ? "page" : undefined}>{followingText.following}</a></nav>
      <div className="filters"><button type="button" onClick={() => navigate(language, feed)} className={!category ? "active" : ""}>{followingText.all}</button>{POST_CATEGORIES.map((item) => <button type="button" key={item} onClick={() => navigate(language, feed, item)} className={category === item ? "active" : ""}>{postCategoryLabel(item, language)}</button>)}</div>
      {feed === "following" && !authenticated ? <div className="following-empty"><h3>{followingText.signInTitle}</h3><p>{followingText.signInText}</p><a className="button primary" href={followingLoginHref}>{followingText.signIn}</a></div> : <div className="feed">{posts.map((post) => <PostCard key={post.id} post={post} language={language} authenticated={authenticated} returnTo={feedReturnTo} />)}{posts.length === 0 && <div className="following-empty"><h3>{feed === "following" ? followingText.emptyTitle : text.empty}</h3>{feed === "following" && <p>{followingText.emptyText}</p>}</div>}</div>}
    </section>
    <footer><div className="shell"><strong>KCNY</strong><span>{text.welcome}</span><span>China × Korea Community</span></div></footer>
  </main>;
}
