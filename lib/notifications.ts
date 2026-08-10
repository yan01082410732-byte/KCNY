import type { Language } from "@/lib/auth";
export const notificationTypes = ["post_comment", "comment_reply", "post_like", "new_follower"] as const;
export type NotificationType = (typeof notificationTypes)[number];
export function notificationLabels(language: Language) { const korean = language === "KR"; return { title:korean?"알림":"通知", emptyTitle:korean?"알림이 없습니다":"暂无通知", emptyText:korean?"새로운 활동이 여기에 표시됩니다.":"新的互动会显示在这里。", markAll:korean?"모두 읽음":"全部已读", message:(type:NotificationType,username:string)=>({post_comment:korean?`@${username} 님이 내 게시물에 댓글을 남겼습니다`:`@${username} 评论了你的帖子`,comment_reply:korean?`@${username} 님이 내 댓글에 답글을 남겼습니다`:`@${username} 回复了你的评论`,post_like:korean?`@${username} 님이 내 게시물을 좋아합니다`:`@${username} 赞了你的帖子`,new_follower:korean?`@${username} 님이 나를 팔로우했습니다`:`@${username} 关注了你`})[type] }; }
export function unreadBadge(count:number) { return count>99?"99+":count>0?String(count):""; }
