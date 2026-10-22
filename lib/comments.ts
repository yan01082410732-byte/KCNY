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
    case "network_failed": return korean ? "연결 오류가 발생했습니다. 중복 게시를 피하려면 먼저 등록 여부를 확인해 주세요. 초안은 보관됩니다." : "网络异常。为避免重复发布，请先确认内容是否已出现；草稿仍保留。";
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
