export const FEED_PAGE_SIZE = 20;
export const NOTIFICATION_PAGE_SIZE = 50;

export type CommunityCursor = { createdAt: string; id: string };

export function parseCommunityCursor(value: unknown): CommunityCursor | undefined {
  if (typeof value !== "string" || value.length > 100) return undefined;
  const [createdAt, id, extra] = value.split("|");
  if (extra !== undefined || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(createdAt ?? "") || !Number.isFinite(Date.parse(createdAt))) return undefined;
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id ?? "")) return undefined;
  return { createdAt, id };
}

export function olderThanFilter(cursor: CommunityCursor) {
  return `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`;
}

export function communityPage<T extends { id: string; created_at: string }>(rows: T[], size: number) {
  const items = rows.slice(0, size);
  const last = items[items.length - 1];
  return { items, nextCursor: rows.length > size && last ? `${last.created_at}|${last.id}` : undefined };
}
