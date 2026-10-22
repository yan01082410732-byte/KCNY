export const NOTIFICATIONS_READ_EVENT = "kcny:notifications-read";

// Only the newest refresh may update the badge, including after navigation.
export function createUnreadCountLoader(
  load: () => PromiseLike<{ count: number | null; error: unknown }>,
  update: (count: number) => void,
  failed: (unavailable: boolean) => void,
) {
  let sequence = 0;
  let disposed = false;
  return {
    async refresh() {
      const current = ++sequence;
      try {
        const result = await load();
        if (disposed || current !== sequence) return;
        if (result.error) { failed(true); return; }
        update(Math.max(0, result.count ?? 0));
        failed(false);
      } catch {
        if (!disposed && current === sequence) failed(true);
      }
    },
    dispose() { disposed = true; sequence++; },
  };
}
