import type { Language } from "@/lib/auth";

export type PublicFollowProfile = { username: string; display_name: string | null };

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
