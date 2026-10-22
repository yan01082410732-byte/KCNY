export type NotificationReadState = { status: "idle" | "success" | "error" };

export function notificationReadSucceeded(error: unknown, count: number | null, single: boolean) {
  return !error && typeof count === "number" && (single ? count === 1 : count >= 0);
}
