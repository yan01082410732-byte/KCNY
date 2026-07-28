export type UserMenuLanguage = "CN" | "KR";

export function userMenuAvatarInitial(displayName?: string, username?: string) {
  const source = displayName?.trim() || username?.trim() || "K";
  return Array.from(source)[0] || "K";
}

export function userMenuProfileHref(username?: string) {
  return username && /^[A-Za-z0-9_\u4e00-\u9fff\uac00-\ud7af]{2,30}$/u.test(username)
    ? `/u/${encodeURIComponent(username)}`
    : undefined;
}

export function userMenuLabels(language: UserMenuLanguage) {
  return language === "KR"
    ? { profile: "내 프로필", profileUnavailable: "프로필을 사용할 수 없습니다", settings: "프로필 편집", createPost: "글 쓰기", signOut: "로그아웃", menu: "사용자 메뉴" }
    : { profile: "我的主页", profileUnavailable: "个人主页暂不可用", settings: "编辑资料", createPost: "发布帖子", signOut: "退出登录", menu: "用户菜单" };
}

export function userMenuButtonState(open: boolean) {
  return { "aria-expanded": open, "aria-haspopup": "menu" as const };
}

export function shouldCloseUserMenuForKey(key: string) {
  return key === "Escape";
}
