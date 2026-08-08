import type { Language } from "@/lib/auth";
import type { PublicPost } from "@/lib/posts";

type BookmarkRow = { post_id: unknown };

export function applyPostBookmarkState(posts: PublicPost[], rows: unknown[]) {
  const postIds = new Set(posts.map((post) => post.id));
  const bookmarkedPostIds = new Set<string>();

  for (const row of rows) {
    const postId = (row as BookmarkRow).post_id;
    if (typeof postId === "string" && postIds.has(postId)) bookmarkedPostIds.add(postId);
  }

  return posts.map((post) => ({ ...post, bookmarkedByCurrentUser: bookmarkedPostIds.has(post.id) }));
}

export function postBookmarkLabels(language: Language) {
  return language === "KR"
    ? {
        bookmark: "저장",
        unbookmark: "저장 취소",
        saved: "저장됨",
        signIn: "로그인 후 저장할 수 있습니다.",
        pending: "처리 중…",
      }
    : {
        bookmark: "收藏",
        unbookmark: "取消收藏",
        saved: "已收藏",
        signIn: "登录后即可收藏。",
        pending: "处理中…",
      };
}
