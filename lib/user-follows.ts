import type { Language } from "@/lib/auth";

export type PublicFollowProfile = { username: string; display_name: string | null };
export const FOLLOW_LIST_PAGE_SIZE = 20;
export type FollowListKind = "followers" | "following";
export type FollowCursor = { createdAt: string; relatedId: string };

export function parseFollowCursor(value: unknown): FollowCursor | undefined {
  if (typeof value !== "string" || value.length > 100) return undefined;
  const [createdAt, relatedId, extra] = value.split("|");
  if (extra !== undefined || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(createdAt ?? "") || !Number.isFinite(Date.parse(createdAt))) return undefined;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(relatedId ?? "")) return undefined;
  return { createdAt, relatedId };
}

export function olderFollowFilter(cursor: FollowCursor, kind: FollowListKind) {
  const column = kind === "followers" ? "follower_id" : "following_id";
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},${column}.lt.${cursor.relatedId})`;
}

export function followListPage<T extends { created_at: string; follower_id: string; following_id: string }>(rows: T[], kind: FollowListKind) {
  const items = rows.slice(0, FOLLOW_LIST_PAGE_SIZE);
  const last = items.at(-1);
  const relatedId = last && (kind === "followers" ? last.follower_id : last.following_id);
  return { items, nextCursor: rows.length > FOLLOW_LIST_PAGE_SIZE && last && relatedId ? `${last.created_at}|${relatedId}` : undefined };
}

export function followListHref(username: string, kind: FollowListKind, language: Language, before?: string) {
  const query = new URLSearchParams({ lang: language });
  if (before) query.set("before", before);
  return `/u/${encodeURIComponent(username)}/${kind}?${query.toString()}`;
}

export function followLabels(language: Language) {
  return language === "KR"
    ? { follow: "팔로우", following: "팔로잉", unfollow: "팔로우 취소", signIn: "로그인 후 팔로우할 수 있습니다.", pending: "처리 중…", followers: "팔로워", noFollowers: "아직 팔로워가 없습니다.", noFollowing: "아직 팔로우한 사용자가 없습니다." }
    : { follow: "关注", following: "已关注", unfollow: "取消关注", signIn: "登录后即可关注。", pending: "处理中…", followers: "粉丝", noFollowers: "暂无粉丝", noFollowing: "暂未关注任何用户" };
}

export function toPublicFollowProfiles(rows: unknown[]): PublicFollowProfile[] {
  return rows.flatMap((row) => {
    const value = row as PublicFollowProfile;
    return typeof value.username === "string" && value.username.length > 0
      ? [{ username: value.username, display_name: typeof value.display_name === "string" ? value.display_name : null }]
      : [];
  });
}
