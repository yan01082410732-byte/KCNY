export const NOTIFICATIONS_READ_EVENT = "kcny:notifications-read";
export const NOTIFICATIONS_READ_CHANNEL = "kcny:notifications-read:v1";

export function notificationCountLabel(language: "CN" | "KR", count: number | null, unavailable: boolean) {
  if (unavailable) {
    return language === "KR"
      ? `알림 — 읽지 않은 수를 업데이트할 수 없습니다${count === null ? "" : ` (마지막 확인: ${count}개)`}`
      : `通知，暂时无法更新未读数${count === null ? "" : `（上次确认为 ${count} 条）`}`;
  }
  if (count === null) return language === "KR" ? "알림 — 읽지 않은 수 업데이트 중" : "通知，正在更新未读数";
  return language === "KR" ? `알림, 읽지 않음 ${count}개` : `通知，${count} 条未读`;
}

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
        if (result.error || result.count === null || !Number.isSafeInteger(result.count) || result.count < 0) { failed(true); return; }
        update(result.count);
        failed(false);
      } catch {
        if (!disposed && current === sequence) failed(true);
      }
    },
    dispose() { disposed = true; sequence++; },
  };
}
