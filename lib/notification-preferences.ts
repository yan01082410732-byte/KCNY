export const preferenceTypes = ["post_comment", "comment_reply", "post_like", "new_follower"] as const;
export type NotificationPreferenceType = (typeof preferenceTypes)[number];
export type NotificationPreferences = Record<NotificationPreferenceType, boolean>;
export const defaultNotificationPreferences = (): NotificationPreferences => ({ post_comment: true, comment_reply: true, post_like: true, new_follower: true });

export function parseNotificationPreferences(value: unknown): NotificationPreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 4 || !preferenceTypes.every(type => typeof record[type] === "boolean")) return null;
  return Object.fromEntries(preferenceTypes.map(type => [type, record[type]])) as NotificationPreferences;
}
// DB rows may include server-owned metadata, but never return it to the UI.
export function preferencesFromRow(value: unknown): NotificationPreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  return parseNotificationPreferences(Object.fromEntries(preferenceTypes.map(type => [type, row[type]])));
}
type StoreResult = { data: unknown; error: unknown };
export async function loadNotificationPreferences(read: () => PromiseLike<StoreResult>) {
  try {
    const result = await read();
    if (result.error) return null;
    return result.data === null ? defaultNotificationPreferences() : preferencesFromRow(result.data);
  } catch { return null; }
}
export async function persistNotificationPreferences(value: NotificationPreferences, save: () => PromiseLike<StoreResult>) {
  try {
    const result = await save();
    if (result.error) return null;
    const saved = preferencesFromRow(result.data);
    return saved && preferenceTypes.every(type => saved[type] === value[type]) ? saved : null;
  } catch { return null; }
}
export function notificationPreferenceLabels(language: "CN" | "KR") {
  return language === "KR" ? {
    title: "알림 설정", description: "새로 생성되는 앱 내 알림에만 적용됩니다. 기존 알림과 읽음 상태는 유지됩니다.",
    post_comment: "내 게시물의 댓글", comment_reply: "내 댓글의 답글", post_like: "내 게시물의 좋아요", new_follower: "새 팔로워",
    loading: "알림 설정을 불러오는 중…", save: "알림 설정 저장", saving: "저장 중…", saved: "알림 설정이 저장되었습니다.",
    loadError: "알림 설정을 불러오지 못했습니다. 다시 시도해 주세요.", saveError: "저장 여부를 확인하지 못했습니다. 변경 내용을 유지했습니다. 다시 시도해 주세요.",
    authentication: "로그인이 만료되었습니다. 다시 로그인한 후 설정을 확인해 주세요.", retry: "다시 시도", login: "다시 로그인", centre: "알림 센터 열기",
  } : {
    title: "通知设置", description: "仅影响未来生成的站内通知，已有通知和已读状态不变。",
    post_comment: "帖子评论", comment_reply: "评论回复", post_like: "帖子点赞", new_follower: "新增关注者",
    loading: "正在加载通知设置…", save: "保存通知设置", saving: "正在保存…", saved: "通知设置已保存。",
    loadError: "无法加载通知设置，请重试。", saveError: "未能确认保存结果，已保留修改，请重试。",
    authentication: "登录已过期，请重新登录后检查设置。", retry: "重试", login: "重新登录", centre: "打开通知中心",
  };
}
