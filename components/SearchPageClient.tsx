"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import type { Language } from "@/lib/auth";
import { searchLabels, type PublicSearchProfile, type SearchType } from "@/lib/search";
import type { PublicPost } from "@/lib/posts";

export function SearchPageClient({
  initialLanguage,
  query,
  type,
  posts,
  users,
  authenticated,
  username,
  displayName,
}: {
  initialLanguage: Language;
  query: string;
  type: SearchType;
  posts: PublicPost[];
  users: PublicSearchProfile[];
  authenticated: boolean;
  username?: string;
  displayName?: string;
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const text = searchLabels(language);
  const activeResults = type === "posts" ? posts : users;
  const searchHref = (nextType: SearchType) => `/search?lang=${language}&type=${nextType}&q=${encodeURIComponent(query)}`;
  const returnTo = `/search?lang=${language}&type=posts&q=${encodeURIComponent(query)}`;

  return <main>
    <Header language={language} onLanguageChange={setLanguage} authenticated={authenticated} username={username} displayName={displayName} />
    <section className="shell search-page">
      <p className="eyebrow"><span /> {text.eyebrow}</p>
      <h1>{text.title}</h1>
      <p className="search-intro">{text.description}</p>
      <form className="search-form" action="/search" method="get">
        <input type="hidden" name="lang" value={language} />
        <input type="hidden" name="type" value={type} />
        <label className="sr-only" htmlFor="site-search">{text.placeholder}</label>
        <input id="site-search" name="q" type="search" defaultValue={query} maxLength={80} placeholder={text.placeholder} />
        <button className="button primary" type="submit">{text.submit}</button>
      </form>
      <div className="search-tabs" role="tablist" aria-label={text.results}>
        <a role="tab" aria-selected={type === "posts"} className={type === "posts" ? "active" : ""} href={searchHref("posts")}>{text.posts}</a>
        <a role="tab" aria-selected={type === "users"} className={type === "users" ? "active" : ""} href={searchHref("users")}>{text.users}</a>
      </div>
      {!query && <div className="search-empty"><h2>{text.start}</h2></div>}
      {query && <section className="search-results" aria-live="polite">
        <div className="section-heading"><h2>{text.results}</h2></div>
        {type === "posts" && <div className="feed">{posts.map((post) => <PostCard key={post.id} post={post} language={language} authenticated={authenticated} returnTo={returnTo} />)}</div>}
        {type === "users" && <div className="search-user-list">{users.map((user) => <a className="search-user-card" key={user.username} href={`/u/${encodeURIComponent(user.username)}?lang=${language}`}><span className="avatar blue" aria-hidden="true">{Array.from((user.display_name || user.username).trim())[0] || "K"}</span><span><strong>{user.display_name || user.username}</strong><small>@{user.username}</small></span></a>)}</div>}
        {activeResults.length === 0 && <div className="search-empty"><h2>{text.empty}</h2><p>{text.emptyHelp}</p></div>}
      </section>}
    </section>
  </main>;
}
