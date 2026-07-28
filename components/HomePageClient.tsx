"use client";

import { useState } from "react";
import { Header } from "./Header";
import { PostCard, type Post } from "./PostCard";

const posts: Post[] = [
  { id: 1, author: "민지 / Minji", place: "Seoul, Korea", time: "12 min", avatar: "민", title: "想找可以一起练习中文的朋友！", body: "我喜欢中国的音乐和美食，也正在学习中文。想认识愿意一起聊天、互相纠正语言的朋友。", tags: ["Language", "Friends"], comments: 8, accent: "coral" },
  { id: 2, author: "林夏", place: "Shanghai, China", time: "1 hr", avatar: "夏", title: "第一次去首尔，有什么安静又好逛的地方？", body: "我计划十月去韩国旅行，特别喜欢咖啡店、独立书店和当地人的小众推荐。", tags: ["Travel", "Korea"], comments: 14, accent: "blue" },
  { id: 3, author: "준호 / Junho", place: "Busan, Korea", time: "3 hrs", avatar: "준", title: "중국 드라마 추천 부탁드려요", body: "최근에 중국 드라마를 보기 시작했어요. 초보자도 보기 쉬운 작품이 있으면 알려 주세요!", tags: ["Culture", "Drama"], comments: 21, accent: "yellow" }
];

export function HomePageClient({ authenticated, username, displayName }: { authenticated: boolean; username?: string; displayName?: string }) {
  const [language, setLanguage] = useState<"CN" | "KR">("CN");
  const [activeTag, setActiveTag] = useState("All");
  const copy = language === "CN" ? {
    eyebrow: "中国 × 韩国，近一点",
    title: "跨越语言，\n认识彼此。",
    description: "一个为喜欢中国与韩国文化的人准备的温暖社区。分享、学习、提问，或只是和新朋友聊聊天。",
    explore: "浏览讨论", create: "发布帖子", feed: "正在讨论", all: "全部", signIn: "登录", welcome: "欢迎来到 KCNY"
  } : {
    eyebrow: "중국 × 한국, 더 가까이",
    title: "언어를 넘어,\n서로를 만나다.",
    description: "중국과 한국 문화를 좋아하는 사람들을 위한 따뜻한 커뮤니티입니다. 이야기하고, 배우고, 질문하고, 새로운 친구를 만나세요.",
    explore: "둘러보기", create: "글 쓰기", feed: "지금 이야기", all: "전체", signIn: "로그인", welcome: "KCNY에 오신 것을 환영합니다"
  };
  const tags = ["All", "Language", "Travel", "Culture", "Friends"];
  const shownPosts = activeTag === "All" ? posts : posts.filter((post) => post.tags.includes(activeTag));

  return <main>
    <Header language={language} onLanguageChange={setLanguage} authenticated={authenticated} username={username} displayName={displayName} />
    <section className="hero shell">
      <div className="hero-copy">
        <p className="eyebrow"><span /> {copy.eyebrow}</p>
        <h1>{copy.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1>
        <p className="intro">{copy.description}</p>
        <div className="hero-actions"><a href="#feed" className="button primary">{copy.explore} <b>→</b></a><button className="button secondary">{copy.create}</button></div>
      </div>
      <div className="hero-art" aria-label="KCNY illustration"><div className="sun" /><div className="speech speech-one">안녕하세요! <small>Hello!</small></div><div className="speech speech-two">你好！<small>Nice to meet you.</small></div><div className="bridge"><i /><i /><i /></div><div className="land land-left" /><div className="land land-right" /></div>
    </section>
    <section className="content shell" id="feed">
      <div className="section-heading"><div><p className="eyebrow"><span /> COMMUNITY</p><h2>{copy.feed}</h2></div><button className="new-post">＋ {copy.create}</button></div>
      <div className="filters">{tags.map((tag) => <button onClick={() => setActiveTag(tag)} className={activeTag === tag ? "active" : ""} key={tag}>{tag === "All" ? copy.all : tag}</button>)}</div>
      <div className="feed">{shownPosts.map((post) => <PostCard key={post.id} post={post} />)}{shownPosts.length === 0 && <p className="empty">No posts in this topic yet.</p>}</div>
    </section>
    <footer><div className="shell"><strong>KCNY</strong><span>{copy.welcome}</span><span>China × Korea Community</span></div></footer>
  </main>;
}
