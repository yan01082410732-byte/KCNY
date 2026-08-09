"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { PostCard } from "@/components/PostCard";
import type { Language } from "@/lib/auth";
import { formatKcnyMonth, type PublicPost } from "@/lib/posts";
import { profileAvatarInitial, type PublicProfile } from "@/lib/profile";
import { FollowButton } from "@/components/FollowButton";
import { followLabels } from "@/lib/user-follows";

export function ProfilePageClient({ profile, posts, initialLanguage, authenticated, currentUsername, currentDisplayName, followerCount, followingCount, followingByCurrentUser }: { profile: PublicProfile; posts: PublicPost[]; initialLanguage: Language; authenticated: boolean; currentUsername?: string; currentDisplayName?: string; followerCount: number; followingCount: number; followingByCurrentUser: boolean }) {
  const [language, setLanguage] = useState(initialLanguage);
  const korean = language === "KR";
  const month = formatKcnyMonth(profile.created_at, language);
  const profileReturnTo = `/u/${encodeURIComponent(profile.username)}?lang=${language}`;
  const follows = followLabels(language);
  const ownProfile = currentUsername === profile.username;
  return <main><Header language={language} onLanguageChange={setLanguage} authenticated={authenticated} username={currentUsername} displayName={currentDisplayName} /><section className="shell profile-page"><article className="profile-card"><div className="profile-avatar" aria-hidden="true">{profileAvatarInitial(profile)}</div><div className="profile-heading"><h1>{profile.display_name || profile.username}</h1><p>@{profile.username}</p></div>{!ownProfile && <FollowButton targetUsername={profile.username} language={language} following={followingByCurrentUser} authenticated={authenticated} />}<dl className="profile-details"><div><dt>{korean ? "소개" : "简介"}</dt><dd>{profile.bio || (korean ? "아직 자기소개가 없습니다." : "这位用户还没有填写简介。")}</dd></div><div><dt>{korean ? "선호 언어" : "首选语言"}</dt><dd>{profile.preferred_language === "KR" ? "한국어" : "中文"}</dd></div><div><dt>{korean ? "가입 시기" : "注册时间"}</dt><dd>{month}</dd></div></dl><nav className="follow-summary" aria-label={korean ? "팔로우 정보" : "关注信息"}><a href={`/u/${encodeURIComponent(profile.username)}/followers?lang=${language}`}><strong>{followerCount}</strong><span>{follows.followers}</span></a><a href={`/u/${encodeURIComponent(profile.username)}/following?lang=${language}`}><strong>{followingCount}</strong><span>{follows.following}</span></a></nav></article><section className="profile-posts"><div className="section-heading"><div><p className="eyebrow"><span /> POSTS</p><h2>{korean ? "게시글" : "发布的帖子"}</h2></div></div><div className="feed">{posts.map((post) => <PostCard key={post.id} post={post} language={language} authenticated={authenticated} returnTo={profileReturnTo} />)}{posts.length === 0 && <div className="profile-empty"><h2>{korean ? "아직 게시글이 없습니다" : "暂时还没有发布帖子"}</h2><p>{korean ? "첫 번째 이야기를 들려주세요." : "我们正在准备让大家分享第一条故事的功能。"}</p></div>}</div></section></section></main>;
}
