export type CommentLanguage = "CN" | "KR";

export type CommentValidationError =
  | "invalid_comment"
  | "invalid_post"
  | "invalid_parent_comment"
  | "invalid_language";

export type CreateCommentInput = {
  postId: string;
  content: string;
  language: CommentLanguage;
};

export type CreateCommentReplyInput = CreateCommentInput & {
  parentCommentId: string;
};

export type CommentAuthor = {
  username: string;
  displayName: string | null;
};

export type PublicComment = {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  author: CommentAuthor;
  canDelete: boolean;
};

export type CommentThread = {
  comment: PublicComment;
  replies: PublicComment[];
};

export function commentDraftKey(userId: string, postId: string, parentCommentId?: string) {
  return `kcny-comment-draft-v1:${userId}:${postId}:${parentCommentId ?? "root"}`;
}

export function canSubmitCommentDraft(content: string, pending: boolean, locked: boolean) {
  return content.trim().length > 0 && content.trim().length <= 1000 && !pending && !locked;
}

export function validateCommentInput(input: {
  postId: unknown;
  content: unknown;
  language: unknown;
}): { error: CommentValidationError } | { error: null; value: CreateCommentInput } {
  if (input.language !== "CN" && input.language !== "KR") return { error: "invalid_language" };
  if (!isSafeCommentRelatedId(input.postId)) return { error: "invalid_post" };

  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (content.length < 1 || content.length > 1000) return { error: "invalid_comment" };

  return { error: null, value: { postId: input.postId, content, language: input.language } };
}

export function validateCommentReplyInput(input: {
  postId: unknown;
  parentCommentId: unknown;
  content: unknown;
  language: unknown;
}): { error: CommentValidationError } | { error: null; value: CreateCommentReplyInput } {
  const comment = validateCommentInput(input);
  if (comment.error) return comment;
  if (!isSafeCommentRelatedId(input.parentCommentId)) return { error: "invalid_parent_comment" };
  return { error: null, value: { ...comment.value, parentCommentId: input.parentCommentId } };
}

export function isSafeCommentRelatedId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function commentAvatarInitial(author: CommentAuthor) {
  const source = author.displayName?.trim() || author.username.trim();
  return Array.from(source)[0] || "K";
}

export function replyTargetUsername(parent: Pick<PublicComment, "author"> | undefined) {
  const username = parent?.author.username.trim();
  return username || undefined;
}

export function commentCountLabel(count: number, language: CommentLanguage) {
  return language === "KR" ? `댓글 ${count}` : `${count} 条评论`;
}

export function commentErrorMessage(error: unknown, language: CommentLanguage) {
  const korean = language === "KR";
  switch (error) {
    case "invalid_comment": return korean ? "댓글은 1~1000자로 입력해 주세요." : "评论内容须为 1–1000 字。";
    case "auth_required": return korean ? "로그인이 필요합니다. 작성한 내용은 이 탭에 보관됩니다." : "请先登录；草稿会保留在当前标签页。";
    case "invalid_post": return korean ? "게시글을 찾을 수 없습니다. 작성한 내용은 보관됩니다." : "帖子已不可用；草稿已保留。";
    case "permission": return korean ? "작성 권한이 없습니다. 작성한 내용은 보관됩니다." : "没有提交权限；草稿已保留。";
    case "network_failed": return korean ? "연결 오류로 등록 결과를 확인하지 못했습니다. 결과를 확인하거나 같은 요청으로 재시도해 주세요. 원문은 보관됩니다." : "网络异常，提交结果尚不确定。请核对结果或使用原请求重试；原文已保留。";
    case "request_not_found": return korean ? "아직 완료된 요청이 없습니다. 원래 요청 번호로 안전하게 재시도할 수 있습니다." : "尚未查到已完成的请求，可以使用原请求编号安全重试。";
    case "request_conflict": return korean ? "이 요청 번호는 다른 내용에 이미 사용되었습니다. 원문을 보관했으며 새 댓글을 만들지 않았습니다." : "此请求编号已绑定其他内容，未创建新评论；原文已保留。";
    case "request_deleted": return korean ? "이 요청으로 등록된 댓글은 이미 삭제되었습니다. 다시 생성하지 않으며 원문은 보관됩니다." : "此请求曾提交的评论已被删除，不会重新创建；原文已保留。";
    case "request_storage_failed": return korean ? "이 탭에 복구 정보를 안전하게 보관할 수 없습니다. 원문을 복사해 보관하고 브라우저 저장 설정을 확인해 주세요." : "无法安全保存本标签页的恢复记录。请复制保留原文，并检查浏览器存储设置。";
    case "account_changed": return korean ? "로그인 계정이 변경되었습니다. 원래 계정으로 돌아가 등록 결과를 확인해 주세요." : "登录账号已改变。请切回原账号核对本次提交结果。";
    case "invalid_request": return korean ? "요청 번호가 올바르지 않습니다. 원문을 보관했습니다." : "请求编号无效，原文已保留。";
    case "invalid_parent_comment":
    case "reply_failed": return korean ? "답글을 등록하지 못했습니다. 원 댓글을 확인하고 다시 시도해 주세요." : "回复失败，请确认父评论仍可用后重试。";
    case "delete_comment_failed": return korean ? "댓글을 삭제하지 못했습니다. 다시 시도해 주세요." : "删除评论失败，请重试。";
    case "comment_failed":
    case "configuration":
    case "invalid_language": return korean ? "댓글을 저장하지 못했습니다. 다시 시도해 주세요." : "暂时无法保存评论，请重试。";
    default: return undefined;
  }
}

export function toPublicComments(rows: unknown[], currentUserId?: string): PublicComment[] {
  return rows.flatMap((row) => {
    const value = row as Record<string, unknown>;
    const authorValue = Array.isArray(value.author) ? value.author[0] : value.author;
    const author = authorValue as Record<string, unknown> | undefined;
    const parentCommentId = value.parent_comment_id ?? null;
    if (
      !isSafeCommentRelatedId(value.id) ||
      !isSafeCommentRelatedId(value.post_id) ||
      !(parentCommentId === null || isSafeCommentRelatedId(parentCommentId)) ||
      typeof value.content !== "string" ||
      typeof value.created_at !== "string" ||
      typeof value.author_id !== "string" ||
      !author ||
      typeof author.username !== "string"
    ) return [];

    return [{
      id: value.id,
      postId: value.post_id,
      parentCommentId,
      content: value.content,
      createdAt: value.created_at,
      author: { username: author.username, displayName: typeof author.display_name === "string" ? author.display_name : null },
      canDelete: value.author_id === currentUserId,
    }];
  });
}

export function groupCommentThreads(comments: PublicComment[]): CommentThread[] {
  const topLevel: CommentThread[] = [];
  const byId = new Map<string, CommentThread>();
  for (const comment of comments) {
    if (comment.parentCommentId === null) {
      const thread = { comment, replies: [] };
      topLevel.push(thread);
      byId.set(comment.id, thread);
    }
  }
  for (const comment of comments) {
    if (comment.parentCommentId !== null) byId.get(comment.parentCommentId)?.replies.push(comment);
  }
  const byCreatedAt = (a: PublicComment, b: PublicComment) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
  topLevel.sort((a, b) => byCreatedAt(a.comment, b.comment));
  for (const thread of topLevel) thread.replies.sort(byCreatedAt);
  return topLevel;
}
