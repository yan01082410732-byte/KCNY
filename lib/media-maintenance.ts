// Trusted-runtime helper, not an HTTP endpoint. Never pass this client to a browser.
// The caller supplies its existing authorized server client; ordinary RPC grants deny it.
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: unknown }>;
type Admin = { rpc: Rpc; storage: { from: (bucket: string) => { remove: (paths: string[]) => PromiseLike<{ error: unknown }> } } };
type Progress = { cursor: string | null; owners: number; deleted: number; failed: number };
type Options = {
  maxOwners?: number;
  canContinue?: () => Promise<boolean>;
  progress?: (value: Progress) => Promise<void>;
};
export async function maintainMediaBatch(admin: Admin, after: string | null = null, options: Options = {}) {
  const limit = options.maxOwners ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw Error("maintenance_invalid_limit");
  const discovery = await admin.rpc("media_maintenance_candidates", { p_after: after, p_limit: limit });
  if (discovery.error) throw Error("maintenance_discovery_failed");
  let deleted = 0, failed = 0, completedOwners = 0, cursor = after;
  const owners = discovery.data as { owner_id: string }[];
  const allowed = () => options.canContinue?.() ?? Promise.resolve(true);
  const partial = () => ({ owners: completedOwners, deleted, failed, next: cursor, incomplete: true });
  for (const owner of owners) {
    if (!await allowed()) return partial();
    const queued = await admin.rpc("media_queue_orphans", { p_actor: owner.owner_id });
    if (queued.error) throw Error("maintenance_queue_failed");
    const claimed = await admin.rpc("media_service", { p_operation: "cleanup_claim", p_actor: owner.owner_id, p_request: {} });
    if (claimed.error) throw Error("maintenance_claim_failed");
    for (const task of claimed.data) {
      if (!await allowed()) return partial(); // Unprocessed claims recover after their existing lease expires.
      if (!["kcny-post-staging", "kcny-post-images"].includes(task.bucket) || !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}(?:\.webp|\/original)$/.test(task.path)) throw Error("maintenance_path_invalid");
      const removal = await admin.storage.from(task.bucket).remove([task.path]);
      const ack = await admin.rpc("media_service", { p_operation: "cleanup_ack", p_actor: owner.owner_id, p_request: { id: task.id, lease: task.lease, success: !removal.error } });
      if (ack.error) throw Error("maintenance_ack_failed"); // Durable deleting lease remains recoverable.
      if (removal.error) failed++; else deleted++;
    }
    completedOwners++; cursor = owner.owner_id;
    await options.progress?.({ cursor, owners: completedOwners, deleted, failed });
  }
  return { owners: completedOwners, deleted, failed, next: owners.length === limit ? cursor : null, incomplete: false };
}
