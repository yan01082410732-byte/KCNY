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

export function applyViewerLikeState(posts: PublicPost[], rows: unknown[]) {
  const likedIds = new Set(rows.flatMap((row) => {
    const id = (row as { post_id?: unknown })?.post_id;
    return typeof id === "string" ? [id] : [];
  }));
  return posts.map((post) => ({ ...post, likedByCurrentUser: likedIds.has(post.id) }));
}

export function postLikeErrorMessage(error: unknown, language: Language) {
  if (error !== "like_failed" && error !== "unlike_failed") return undefined;
  return language === "KR"
    ? error === "like_failed" ? "좋아요 결과를 확인할 수 없습니다. 상태를 새로고침한 뒤 다시 시도해 주세요." : "좋아요 취소 결과를 확인할 수 없습니다. 상태를 새로고침한 뒤 다시 시도해 주세요."
    : error === "like_failed" ? "无法确认点赞结果，请刷新状态后重试。" : "无法确认取消点赞的结果，请刷新状态后重试。";
}

export function postLikeLabels(language: Language) {
  return language === "KR"
    ? {
        like: "좋아요",
        unlike: "좋아요 취소",
        signIn: "로그인 후 좋아요를 누를 수 있습니다.",
        pending: "처리 중…",
        unavailable: "좋아요 상태를 불러오지 못했습니다. 새로고침해 주세요.",
      }
    : {
        like: "点赞",
        unlike: "取消点赞",
        signIn: "登录后即可点赞。",
        pending: "处理中…",
        unavailable: "无法获取点赞状态，请刷新重试。",
      };
}
