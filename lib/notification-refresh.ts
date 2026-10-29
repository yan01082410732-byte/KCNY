export const NOTIFICATION_POLL_MS = 25_000;
export const NOTIFICATION_MAX_BACKOFF_MS = 120_000;
export const NOTIFICATION_REQUEST_TIMEOUT_MS = 10_000;
export const NOTIFICATION_EVENT_COOLDOWN_MS = 1_000;

export type NotificationCountState = { count: number | null; unavailable: boolean };
type CountResult = { count: number | null; error: unknown };
type Timer = ReturnType<typeof setTimeout>;
type Clock = {
  now: () => number;
  setTimeout: (callback: () => void, delay: number) => Timer;
  clearTimeout: (timer: Timer) => void;
};

/** One abortable request per visible, authenticated tab. No Realtime subscription.
 * RLS remains authoritative; the identity is only an additional recipient filter.
 * Callers must pass the supplied signal to their transport.
 */
export function createNotificationRefreshController(options: {
  load: (recipientId: string, signal: AbortSignal) => PromiseLike<CountResult>;
  update: (state: NotificationCountState) => void;
  isVisible: () => boolean;
  clock?: Clock;
}) {
  // Window timers require their native receiver; do not call them as methods of
  // this clock object (Chromium throws "Illegal invocation").
  const clock = options.clock ?? {
    now: () => Date.now(),
    setTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay),
    clearTimeout: (timer: Timer) => clearTimeout(timer),
  };
  let identity: string | null = null;
  let state: NotificationCountState = { count: null, unavailable: false };
  let disposed = false;
  let generation = 0;
  let failures = 0;
  let lastStarted = -Infinity;
  let pending = false;
  let timer: Timer | undefined;
  let scheduledAt = Infinity;
  let active: { controller: AbortController; timeout: Timer | undefined } | null = null;

  const eligible = () => !disposed && identity !== null && options.isVisible();
  const publish = (next: NotificationCountState) => { state = next; options.update({ ...state }); };
  const clearScheduled = () => {
    if (timer !== undefined) clock.clearTimeout(timer);
    timer = undefined;
    scheduledAt = Infinity;
  };
  const cancel = () => {
    generation++;
    clearScheduled();
    pending = false;
    if (active) {
      if (active.timeout !== undefined) clock.clearTimeout(active.timeout);
      active.controller.abort();
      active = null;
    }
  };
  const schedule = (delay: number) => {
    if (!eligible()) return;
    const due = clock.now() + delay;
    if (timer !== undefined && scheduledAt <= due) return;
    clearScheduled();
    scheduledAt = due;
    timer = clock.setTimeout(() => { timer = undefined; scheduledAt = Infinity; void run(); }, delay);
  };
  const eventDelay = () => Math.max(0, NOTIFICATION_EVENT_COOLDOWN_MS - (clock.now() - lastStarted));

  async function run() {
    if (!eligible() || active || identity === null) return;
    const recipientId = identity;
    const current = generation;
    const request = { controller: new AbortController(), timeout: undefined as Timer | undefined };
    active = request;
    lastStarted = clock.now();
    let removeAbortListener = () => {};
    const aborted = new Promise<never>((_, reject) => {
      const onAbort = () => reject(new Error("notification_count_cancelled"));
      request.controller.signal.addEventListener("abort", onAbort, { once: true });
      removeAbortListener = () => request.controller.signal.removeEventListener("abort", onAbort);
    });
    request.timeout = clock.setTimeout(() => request.controller.abort(), NOTIFICATION_REQUEST_TIMEOUT_MS);
    try {
      // Deferred outside onAuthStateChange's synchronous callback/auth lock.
      const result = await Promise.race([
        Promise.resolve().then(() => {
          if (request.controller.signal.aborted) throw new Error("notification_count_cancelled");
          return options.load(recipientId, request.controller.signal);
        }),
        aborted,
      ]);
      if (disposed || current !== generation) return;
      if (result.error || !Number.isSafeInteger(result.count) || result.count === null || result.count < 0) {
        throw new Error("notification_count_unavailable");
      }
      failures = 0;
      publish({ count: result.count, unavailable: false });
    } catch {
      if (disposed || current !== generation) return;
      failures = Math.min(failures + 1, 3);
      // Keep only this identity's last confirmed value; unknown never becomes zero.
      publish({ ...state, unavailable: true });
    } finally {
      removeAbortListener();
      if (request.timeout !== undefined) clock.clearTimeout(request.timeout);
      if (active === request) active = null;
      if (!disposed && current === generation && eligible()) {
        if (pending) { pending = false; schedule(eventDelay()); }
        else schedule(Math.min(NOTIFICATION_POLL_MS * 2 ** failures, NOTIFICATION_MAX_BACKOFF_MS));
      }
    }
  }

  return {
    setIdentity(next: string | null) {
      if (disposed || next === identity) return;
      cancel();
      identity = next;
      failures = 0;
      lastStarted = -Infinity;
      publish({ count: null, unavailable: false });
      schedule(0);
    },
    refresh() {
      if (!eligible()) return;
      if (active) { pending = true; return; }
      schedule(eventDelay());
    },
    visibilityChanged() {
      if (disposed) return;
      if (!options.isVisible()) cancel();
      else this.refresh();
    },
    unavailable() {
      if (!disposed) publish({ ...state, unavailable: true });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
    },
  };
}
