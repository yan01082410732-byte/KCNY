"use client";

import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import type { Language } from "@/lib/auth";
import { formatKcnyMonth, type PublicPost } from "@/lib/posts";
import { profileAvatarInitial, profilePostsHref, type PublicProfile } from "@/lib/profile";
import { followLabels } from "@/lib/user-follows";
import { postLikeErrorMessage } from "@/lib/post-likes";
import { reportHref } from "@/lib/reporting";

type Props = {
  profile: PublicProfile;
  posts: PublicPost[];
  initialLanguage: Language;
  authenticated: boolean;
  currentUsername?: string;
  currentDisplayName?: string;
  followerCount: number;
  followingCount: number;
  followingByCurrentUser: boolean;
  socialUnavailable?: boolean;
  postsUnavailable?: boolean;
  before?: string;
  nextCursor?: string;
  deleted?: boolean;
  actionError?: string;
};

export function ProfilePageClient({ profile, posts, initialLanguage, authenticated, currentUsername, currentDisplayName, followerCount, followingCount, followingByCurrentUser, socialUnavailable, postsUnavailable, before, nextCursor, deleted, actionError }: Props) {
  const language = initialLanguage;
  const korean = language === "KR";
  const month = formatKcnyMonth(profile.created_at, language);
  const profileReturnTo = profilePostsHref(profile.username, language, before);
  const follows = followLabels(language);
  const ownProfile = currentUsername === profile.username;
  return <main>
    <Header language={language} onLanguageChange={() => {}} languageHref={(next) => profilePostsHref(profile.username, next, before)} authenticated={authenticated} username={currentUsername} displayName={currentDisplayName} />
    <section className="shell profile-page">
      {postLikeErrorMessage(actionError, language) && <p className="auth-error" role="alert">{postLikeErrorMessage(actionError, language)}</p>}
      {deleted && <p className="auth-notice" role="status">{korean ? "게시글을 삭제했습니다." : "帖子已删除。"}</p>}
      <article className="profile-card">
        <div className="profile-avatar" aria-hidden="true">{profileAvatarInitial(profile)}</div>
        <div className="profile-heading"><h1>{profile.display_name || profile.username}</h1><p>@{profile.username}</p></div>
        {!ownProfile && !socialUnavailable && <FollowButton targetUsername={profile.username} language={language} following={followingByCurrentUser} authenticated={authenticated} />}
        {!ownProfile && <a className="report-link profile-report-link" href={reportHref("profile", profile.username, language)}>{korean ? "프로필 신고" : "举报用户资料"}</a>}
        <dl className="profile-details">
          <div><dt>{korean ? "소개" : "简介"}</dt><dd>{profile.bio || (korean ? "아직 자기소개가 없습니다." : "这位用户还没有填写简介。")}</dd></div>
          <div><dt>{korean ? "선호 언어" : "首选语言"}</dt><dd>{profile.preferred_language === "KR" ? "한국어" : "中文"}</dd></div>
          <div><dt>{korean ? "가입 시기" : "注册时间"}</dt><dd>{month}</dd></div>
        </dl>
        {socialUnavailable ? <p className="comments-message" role="alert">{korean ? "팔로우 정보를 불러오지 못했습니다." : "无法加载关注信息。"} <a href={profilePostsHref(profile.username, language, before)}>{korean ? "다시 시도" : "重试"}</a></p> : <nav className="follow-summary" aria-label={korean ? "팔로우 정보" : "关注信息"}>
          <a href={`/u/${encodeURIComponent(profile.username)}/followers?lang=${language}`}><strong>{followerCount}</strong><span>{follows.followers}</span></a>
          <a href={`/u/${encodeURIComponent(profile.username)}/following?lang=${language}`}><strong>{followingCount}</strong><span>{follows.following}</span></a>
        </nav>}
      </article>
      <section id="posts" className="profile-posts">
        <div className="section-heading"><div><p className="eyebrow"><span /> POSTS</p><h2>{korean ? "게시글" : "发布的帖子"}</h2></div></div>
        {postsUnavailable ? <div className="profile-empty" role="alert"><h2>{korean ? "게시글을 불러오지 못했습니다." : "无法加载帖子。"}</h2><a className="button secondary" href={profilePostsHref(profile.username, language, before)}>{korean ? "다시 시도" : "重试"}</a></div> : <>
          <div className="feed">{posts.map((post) => <PostCard key={post.id} post={post} language={language} authenticated={authenticated} returnTo={profileReturnTo} />)}{posts.length === 0 && <div className="profile-empty"><h2>{korean ? "아직 게시글이 없습니다" : "暂时还没有发布帖子"}</h2><p>{korean ? "첫 번째 이야기를 들려주세요." : "期待分享第一条故事。"}</p></div>}</div>
          <nav className="community-pagination" aria-label={korean ? "게시글 페이지" : "帖子分页"}>
            {before && <a className="button secondary" href={profilePostsHref(profile.username, language)}>{korean ? "최신 게시글" : "最新帖子"}</a>}
            {nextCursor && <a className="button secondary" href={profilePostsHref(profile.username, language, nextCursor)}>{korean ? "이전 게시글" : "更多帖子"}</a>}
          </nav>
        </>}
      </section>
    </section>
  </main>;
}
