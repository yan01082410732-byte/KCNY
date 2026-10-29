import type { CommunityCursor } from "@/lib/community-pagination";
import type { PostCategory } from "@/lib/posts";

export const FOLLOWING_FEED_MAX_ROWS = 51;

// Inputs come from the shared URL guards. Keep the original timestamp string:
// converting it through Date would discard PostgreSQL microsecond precision.
// Identity is deliberately absent; the database derives it from auth.uid().
export function followingFeedArgs(category?: PostCategory, cursor?: CommunityCursor, limit = 21) {
  if (!Number.isInteger(limit) || limit < 1 || limit > FOLLOWING_FEED_MAX_ROWS) {
    throw new RangeError("Invalid following feed limit");
  }
  return {
    p_category: category ?? null,
    p_before_created_at: cursor?.createdAt ?? null,
    p_before_id: cursor?.id ?? null,
    p_limit: limit,
  };
}
