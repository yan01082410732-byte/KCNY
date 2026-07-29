export type CommentLanguage = "CN" | "KR";

export type CommentValidationError =
  | "invalid_comment"
  | "invalid_post"
  | "invalid_language";

export type CreateCommentInput = {
  postId: string;
  content: string;
  language: CommentLanguage;
};

export type CommentAuthor = {
  username: string;
  displayName: string | null;
};

export type PublicComment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: CommentAuthor;
  canDelete: boolean;
};

export function validateCommentInput(input: {
  postId: unknown;
  content: unknown;
  language: unknown;
}): { error: CommentValidationError } | { error: null; value: CreateCommentInput } {
  if (input.language !== "CN" && input.language !== "KR") {
    return { error: "invalid_language" };
  }
  if (!isSafeCommentRelatedId(input.postId)) return { error: "invalid_post" };

  const content = typeof input.content === "string" ? input.content.trim() : "";
  if (content.length < 1 || content.length > 1000) {
    return { error: "invalid_comment" };
  }

  return {
    error: null,
    value: { postId: input.postId, content, language: input.language },
  };
}

function isSafeCommentRelatedId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function commentAvatarInitial(author: CommentAuthor) {
  const source = author.displayName?.trim() || author.username.trim();
  return Array.from(source)[0] || "K";
}

export function commentCountLabel(count: number, language: CommentLanguage) {
  return language === "KR" ? `댓글 ${count}` : `${count} 条评论`;
}

export function toPublicComments(rows: unknown[], currentUserId?: string): PublicComment[] {
  return rows.flatMap((row) => {
    const value = row as Record<string, unknown>;
    const authorValue = Array.isArray(value.author) ? value.author[0] : value.author;
    const author = authorValue as Record<string, unknown> | undefined;
    if (
      !isSafeCommentRelatedId(value.id) ||
      !isSafeCommentRelatedId(value.post_id) ||
      typeof value.content !== "string" ||
      typeof value.created_at !== "string" ||
      typeof value.author_id !== "string" ||
      !author ||
      typeof author.username !== "string"
    ) return [];

    return [{
      id: value.id,
      postId: value.post_id,
      content: value.content,
      createdAt: value.created_at,
      author: {
        username: author.username,
        displayName: typeof author.display_name === "string" ? author.display_name : null,
      },
      canDelete: value.author_id === currentUserId,
    }];
  });
}
