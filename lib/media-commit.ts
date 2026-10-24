export type MediaOutcome<T> = { state: "committed"; result: T } | { state: "unknown" | "not_committed" };
export type CleanupResult = { deleted: number; failed: number };
export class MediaOutcomeUnknown extends Error {
  constructor() { super("outcome_unknown"); }
}

// A cleanup failure must never undo or disguise an acknowledged business commit.
export async function commitMedia<T extends object>(options: {
  commit: () => Promise<T>;
  uncertain: (error: unknown) => boolean;
  reconcile: () => Promise<MediaOutcome<T>>;
  cleanup: () => Promise<CleanupResult>;
}) {
  let result: T;
  try { result = await options.commit(); }
  catch (error) {
    if (!options.uncertain(error)) throw error;
    const outcome = await options.reconcile().catch(() => ({ state: "unknown" as const }));
    if (outcome.state !== "committed") throw new MediaOutcomeUnknown();
    result = outcome.result;
  }
  try {
    const cleanup = await options.cleanup();
    return { ...result, committed: true as const, cleanup: { ...cleanup, state: cleanup.failed ? "pending" as const : "checked" as const } };
  } catch {
    // Upload, removal and leased cleanup rows are durable recovery records.
    return { ...result, committed: true as const, cleanup: { state: "pending" as const, reason: "cleanup_retry_required" } };
  }
}
