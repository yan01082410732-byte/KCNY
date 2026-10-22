"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import type { Language } from "@/lib/auth";
import { searchHref as buildSearchHref, searchLabels, type PublicSearchProfile, type SearchType } from "@/lib/search";
import type { PublicPost } from "@/lib/posts";
import { POST_CATEGORIES, postCategoryLabel } from "@/lib/posts";
import { postLikeErrorMessage } from "@/lib/post-likes";
import type { SearchFilters } from "@/lib/search";

export function SearchPageClient({
  initialLanguage,
  query,
  type,
  posts,
  users,
  filters,
  nextCursor,
  error,
  actionError,
  authenticated,
  username,
  displayName,
}: {
  initialLanguage: Language;
  query: string;
  type: SearchType;
  posts: PublicPost[];
  users: PublicSearchProfile[];
  filters: SearchFilters;
  nextCursor?: string;
  error: boolean;
  actionError?: string;
  authenticated: boolean;
  username?: string;
  displayName?: string;
}) {
  const router = useRouter();
  const language = initialLanguage;
  const languageHref = (nextLanguage: Language) => buildSearchHref(nextLanguage, type, query, filters);
  const text = searchLabels(language);
  const activeResults = type === "posts" ? posts : users;
  const searchHref = (nextType: SearchType) => buildSearchHref(language, nextType, query, filters);
  const returnTo = buildSearchHref(language, "posts", query, filters);

  return <main>
    <Header language={language} onLanguageChange={(nextLanguage) => router.push(languageHref(nextLanguage))} languageHref={languageHref} authenticated={authenticated} username={username} displayName={displayName} />
    <section className="shell search-page">
      {postLikeErrorMessage(actionError, language) && <p className="auth-error" role="alert">{postLikeErrorMessage(actionError, language)}</p>}
      <p className="eyebrow"><span /> {text.eyebrow}</p>
      <h1>{text.title}</h1>
      <p className="search-intro">{text.description}</p>
      <form className="search-form" action="/search" method="get">
        <input type="hidden" name="lang" value={language} />
        <input type="hidden" name="type" value={type} />
        {filters.category && <input type="hidden" name="category" value={filters.category} />}
        {filters.postLanguage && <input type="hidden" name="postLanguage" value={filters.postLanguage} />}
        {filters.sort && <input type="hidden" name="sort" value={filters.sort} />}
        <label className="sr-only" htmlFor="site-search">{text.placeholder}</label>
        <input id="site-search" name="q" type="search" defaultValue={query} maxLength={80} placeholder={text.placeholder} />
        <button className="button primary" type="submit">{text.submit}</button>
      </form>
      {type === "posts" && <form className="search-filters" action="/search" method="get">
        <input type="hidden" name="lang" value={language} /><input type="hidden" name="type" value={type} /><input type="hidden" name="q" value={query} />
        <label>{text.category}<select name="category" defaultValue={filters.category ?? ""}><option value="">{text.allCategories}</option>{POST_CATEGORIES.map((category) => <option value={category} key={category}>{postCategoryLabel(category, language)}</option>)}</select></label>
        <label>{text.contentLanguage}<select name="postLanguage" defaultValue={filters.postLanguage ?? ""}><option value="">{text.allLanguages}</option><option value="CN">{text.chinese}</option><option value="KR">{text.korean}</option></select></label>
        <label>{text.sort}<select name="sort" defaultValue={filters.sort ?? "recent"}><option value="recent">{text.recent}</option><option value="relevant">{text.relevant}</option></select></label>
        <button className="button" type="submit">{text.apply}</button>
      </form>}
      <div className="search-tabs" role="tablist" aria-label={text.results}>
        <a role="tab" aria-selected={type === "posts"} className={type === "posts" ? "active" : ""} href={searchHref("posts")}>{text.posts}</a>
        <a role="tab" aria-selected={type === "users"} className={type === "users" ? "active" : ""} href={searchHref("users")}>{text.users}</a>
      </div>
      {!query && <div className="search-empty"><h2>{text.start}</h2></div>}
      {query && <section className="search-results" aria-live="polite">
        <div className="section-heading"><h2>{text.results}</h2></div>
        {error ? <div className="search-empty" role="alert"><h2>{text.error}</h2><a className="button" href={buildSearchHref(language, type, query, filters)}>{text.retry}</a></div> : <>
          {type === "posts" && <div className="feed">{posts.map((post) => <PostCard key={post.id} post={post} language={language} authenticated={authenticated} returnTo={returnTo} />)}</div>}
          {type === "users" && <div className="search-user-list">{users.map((user) => <a className="search-user-card" key={user.username} href={`/u/${encodeURIComponent(user.username)}?lang=${language}`}><span className="avatar blue" aria-hidden="true">{Array.from((user.display_name || user.username).trim())[0] || "K"}</span><span><strong>{user.display_name || user.username}</strong><small>@{user.username}</small></span></a>)}</div>}
          {activeResults.length === 0 && <div className="search-empty"><h2>{text.empty}</h2><p>{text.emptyHelp}</p></div>}
          {nextCursor && <a className="button search-more" href={buildSearchHref(language, type, query, { ...filters, before: nextCursor })}>{text.more}</a>}
        </>}
      </section>}
    </section>
  </main>;
}
