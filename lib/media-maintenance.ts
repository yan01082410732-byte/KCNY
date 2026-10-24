// Trusted-runtime helper, not an HTTP endpoint. Never pass this client to a browser.
// The caller supplies its existing authorized server client; ordinary RPC grants deny it.
type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: unknown }>;
type Admin = { rpc: Rpc; storage: { from: (bucket: string) => { remove: (paths: string[]) => PromiseLike<{ error: unknown }> } } };
export async function maintainMediaBatch(admin: Admin, after: string | null = null) {
  const discovery = await admin.rpc("media_maintenance_candidates", { p_after: after, p_limit: 20 });
  if (discovery.error) throw Error("maintenance_discovery_failed");
  let deleted = 0, failed = 0;
  const owners = discovery.data as { owner_id: string }[];
  for (const owner of owners) {
    const queued = await admin.rpc("media_queue_orphans", { p_actor: owner.owner_id });
    if (queued.error) throw Error("maintenance_queue_failed");
    const claimed = await admin.rpc("media_service", { p_operation: "cleanup_claim", p_actor: owner.owner_id, p_request: {} });
    if (claimed.error) throw Error("maintenance_claim_failed");
    for (const task of claimed.data) {
      if (!["kcny-post-staging", "kcny-post-images"].includes(task.bucket) || !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}(?:\.webp|\/original)$/.test(task.path)) throw Error("maintenance_path_invalid");
      const removal = await admin.storage.from(task.bucket).remove([task.path]);
      const ack = await admin.rpc("media_service", { p_operation: "cleanup_ack", p_actor: owner.owner_id, p_request: { id: task.id, lease: task.lease, success: !removal.error } });
      if (ack.error) throw Error("maintenance_ack_failed"); // Durable deleting lease remains recoverable.
      if (removal.error) failed++; else deleted++;
    }
  }
  return { owners: owners.length, deleted, failed, next: owners.length === 20 ? owners.at(-1)!.owner_id : null };
}
