import type { Language } from "@/lib/auth";
import type { PublicPost } from "@/lib/posts";

type LikeRow = {
  post_id: unknown;
  user_id: unknown;
};

export function applyPostLikeState(
  posts: PublicPost[],
  rows: unknown[],
  currentUserId?: string,
) {
  const postIds = new Set(posts.map((post) => post.id));
  const likeCounts = new Map<string, number>();
  const likedPostIds = new Set<string>();

  for (const row of rows) {
    const value = row as LikeRow;
    if (
      typeof value.post_id !== "string" ||
      typeof value.user_id !== "string" ||
      !postIds.has(value.post_id)
    ) {
      continue;
    }

    likeCounts.set(value.post_id, (likeCounts.get(value.post_id) ?? 0) + 1);
    if (value.user_id === currentUserId) likedPostIds.add(value.post_id);
  }

  return posts.map((post) => ({
    ...post,
    likeCount: likeCounts.get(post.id) ?? 0,
    likedByCurrentUser: likedPostIds.has(post.id),
  }));
}

export function postLikeLabels(language: Language) {
  return language === "KR"
    ? {
        like: "좋아요",
        unlike: "좋아요 취소",
        signIn: "로그인 후 좋아요를 누를 수 있습니다.",
        pending: "처리 중…",
      }
    : {
        like: "点赞",
        unlike: "取消点赞",
        signIn: "登录后即可点赞。",
        pending: "处理中…",
      };
}
