"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import type { PublicPost } from "@/lib/posts";
import { POST_CATEGORIES, postCategoryLabel, type PostCategory } from "@/lib/posts";

const copy = {
  CN: { eyebrow: "中国 × 韩国，近一点", title: "跨越语言，\n认识彼此。", description: "一个为喜欢中国与韩国文化的人准备的温暖社区。分享、学习、提问，或只是和新朋友聊聊天。", explore: "浏览讨论", create: "发布帖子", feed: "正在讨论", all: "全部", cn: "中文", kr: "韩文", empty: "暂时还没有帖子，成为第一个分享故事的人吧。", welcome: "欢迎来到 KCNY" },
  KR: { eyebrow: "중국 × 한국, 더 가까이", title: "언어를 넘어,\n서로를 만나요.", description: "중국과 한국 문화를 좋아하는 사람들을 위한 따뜻한 커뮤니티입니다. 이야기하고, 배우고, 질문하며 새로운 친구를 만나 보세요.", explore: "둘러보기", create: "글 쓰기", feed: "지금 이야기", all: "전체", cn: "중국어", kr: "한국어", empty: "아직 게시글이 없습니다. 첫 번째 이야기를 들려주세요.", welcome: "KCNY에 오신 것을 환영합니다" },
};

export function HomePageClient({ authenticated, username, displayName, posts }: { authenticated: boolean; username?: string; displayName?: string; posts: PublicPost[] }) {
  const [language, setLanguage] = useState<"CN" | "KR">("CN");
  const [activeCategory, setActiveCategory] = useState<"All" | PostCategory>("All");
  const text = copy[language];
  const shownPosts = activeCategory === "All" ? posts : posts.filter((post) => post.category === activeCategory);
  const createHref = authenticated ? `/posts/new?lang=${language}` : `/auth/login?lang=${language}&returnTo=/posts/new`;

  return <main>
    <Header language={language} onLanguageChange={setLanguage} authenticated={authenticated} username={username} displayName={displayName} />
    <section className="hero shell"><div className="hero-copy"><p className="eyebrow"><span /> {text.eyebrow}</p><h1>{text.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1><p className="intro">{text.description}</p><div className="hero-actions"><a href="#feed" className="button primary">{text.explore} <b>→</b></a><a className="button secondary" href={createHref}>{text.create}</a></div></div><div className="hero-art" aria-label="KCNY illustration"><div className="sun" /><div className="speech speech-one">안녕하세요! <small>Hello!</small></div><div className="speech speech-two">你好！<small>Nice to meet you.</small></div><div className="bridge"><i /><i /><i /></div><div className="land land-left" /><div className="land land-right" /></div></section>
    <section className="content shell" id="feed"><div className="section-heading"><div><p className="eyebrow"><span /> COMMUNITY</p><h2>{text.feed}</h2></div><a className="new-post" href={createHref}>＋ {text.create}</a></div><div className="filters"><button onClick={() => setActiveCategory("All")} className={activeCategory === "All" ? "active" : ""}>{text.all}</button>{POST_CATEGORIES.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={activeCategory === category ? "active" : ""}>{postCategoryLabel(category, language)}</button>)}</div><div className="feed">{shownPosts.map((post) => <PostCard key={post.id} post={post} language={language} />)}{shownPosts.length === 0 && <p className="empty">{text.empty}</p>}</div></section>
    <footer><div className="shell"><strong>KCNY</strong><span>{text.welcome}</span><span>China × Korea Community</span></div></footer>
  </main>;
}
