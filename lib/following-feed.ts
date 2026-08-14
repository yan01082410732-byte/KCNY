import type { Language } from "@/lib/auth";
import { isPostCategory, type PostCategory } from "@/lib/posts";

export const FEED_MODES = ["all", "following"] as const;
export type FeedMode = (typeof FEED_MODES)[number];

export function normalizeFeedMode(value: unknown): FeedMode {
  return value === "following" ? "following" : "all";
}

export function normalizeFeedCategory(value: unknown): PostCategory | undefined {
  return isPostCategory(value) ? value : undefined;
}

export function followingFeedLabels(language: Language) {
  return language === "KR"
    ? {
        all: "전체",
        following: "팔로잉",
        feed: "팔로잉 피드",
        emptyTitle: "팔로잉 피드가 비어 있습니다",
        emptyText: "사용자를 팔로우하면 그들의 새 게시물이 여기에 표시됩니다.",
        signInTitle: "로그인 후 팔로잉 피드를 확인하세요",
        signInText: "팔로우한 사용자의 새 게시물을 보려면 로그인하세요.",
        signIn: "로그인",
      }
    : {
        all: "全部",
        following: "关注",
        feed: "关注动态",
        emptyTitle: "关注动态暂时为空",
        emptyText: "关注用户后，他们发布的新帖子会显示在这里。",
        signInTitle: "登录后查看关注动态",
        signInText: "登录后即可查看你关注用户发布的新帖子。",
        signIn: "登录",
      };
}

export function followingFeedHref(language: Language, feed: FeedMode, category?: PostCategory) {
  const params = new URLSearchParams({ lang: language, feed });
  if (category) params.set("category", category);
  return `/?${params.toString()}`;
}
