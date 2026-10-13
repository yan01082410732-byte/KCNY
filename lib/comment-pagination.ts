import type { PublicComment } from "./comments";

export const COMMENT_PAGE_SIZE = 50;
export type CommentCursor = { createdAt: string; id: string };

export function encodeCommentCursor(comment: Pick<PublicComment, "createdAt" | "id">) {
  return `${comment.createdAt}|${comment.id}`;
}

export function parseCommentCursor(value: unknown): CommentCursor | undefined {
  if (typeof value !== "string" || value.length > 100) return undefined;
  const parts = value.split("|");
  if (parts.length !== 2) return undefined;
  const [createdAt, id] = parts;
  // Restrict values before constructing the PostgREST filter; preserve microseconds.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) return undefined;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return undefined;
  return { createdAt, id };
}

export function commentCursorFilter(cursor: CommentCursor) {
  return `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.id})`;
}

export function sliceCommentPage(comments: PublicComment[]) {
  const items = comments.slice(0, COMMENT_PAGE_SIZE);
  return { items, nextCursor: comments.length > COMMENT_PAGE_SIZE && items.length ? encodeCommentCursor(items[items.length - 1]) : undefined };
}

export function commentPageHref(postId: string, language: "CN" | "KR", cursor?: string) {
  const query = new URLSearchParams({ lang: language });
  if (cursor) query.set("commentsAfter", cursor);
  return `/posts/${encodeURIComponent(postId)}?${query.toString()}#comments`;
}

export function pageWithParentContext(items: PublicComment[], parents: PublicComment[]) {
  const ids = new Set(items.map((item) => item.id));
  const needed = new Set(items.flatMap((item) => item.parentCommentId ? [item.parentCommentId] : []));
  return [...items, ...parents.filter((parent) => {
    if (ids.has(parent.id) || !needed.has(parent.id) || parent.parentCommentId !== null) return false;
    ids.add(parent.id);
    return true;
  })];
}
