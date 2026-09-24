import type { QueuedShiftAction, Timestamp } from "@/types";

const STORAGE_KEY = "crewclock.offline-queue.v1";
const ACTIVE_KEY = "crewclock.local-active-shift.v1";

/** The on-disk shape: timestamps are stored as decimal strings. */
interface StoredAction {
  id: string;
  kind: "start" | "end";
  at: string;
}

/** A locally-owned running shift, persisted so an offline reload keeps counting. */
export interface StoredActiveShift {
  startTime: Timestamp;
  pending: boolean;
}

/**
 * A small durable queue for shift actions taken while the device is offline.
 *
 * This is transport state, not backend-owned data: the shift itself is always
 * reconstructed from the device clock when the action syncs, so the queue only
 * needs to remember *which* action happened and *when*.
 */
export function readQueue(): QueuedShiftAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(toQueuedAction)
      .filter((action): action is QueuedShiftAction => action !== null);
  } catch {
    return [];
  }
}

/** Append an action to the durable queue. */
export function enqueue(action: QueuedShiftAction): QueuedShiftAction[] {
  const next = [...readQueue(), action];
  writeQueue(next);
  return next;
}

/** Remove an action from the queue by id. */
export function dequeue(id: string): QueuedShiftAction[] {
  const next = readQueue().filter((item) => item.id !== id);
  writeQueue(next);
  return next;
}

/** Replace the whole queue. */
export function writeQueue(actions: QueuedShiftAction[]): void {
  if (typeof window === "undefined") return;
  try {
    const stored: StoredAction[] = actions.map((action) => ({
      id: action.id,
      kind: action.kind,
      at: action.at.toString(),
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage may be unavailable (private mode); the queue simply stays empty.
  }
}

/** Build a queued action with a collision-resistant id. */
export function makeQueuedAction(
  kind: QueuedShiftAction["kind"],
  at: Timestamp,
): QueuedShiftAction {
  const suffix = Math.random().toString(36).slice(2, 8);
  return { id: `${kind}-${at.toString()}-${suffix}`, kind, at };
}

/** Read the locally-owned running shift, if one was persisted. */
export function readLocalActiveShift(): StoredActiveShift | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const candidate = parsed as Record<string, unknown>;
    if (typeof candidate.startTime !== "string") return null;
    return {
      startTime: BigInt(candidate.startTime),
      pending: candidate.pending === true,
    };
  } catch {
    return null;
  }
}

/** Persist or clear the locally-owned running shift. */
export function writeLocalActiveShift(shift: StoredActiveShift | null): void {
  if (typeof window === "undefined") return;
  try {
    if (shift === null) {
      window.localStorage.removeItem(ACTIVE_KEY);
      return;
    }
    window.localStorage.setItem(
      ACTIVE_KEY,
      JSON.stringify({
        startTime: shift.startTime.toString(),
        pending: shift.pending,
      }),
    );
  } catch {
    // Storage may be unavailable; the timer simply falls back to backend state.
  }
}

function toQueuedAction(value: unknown): QueuedShiftAction | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string") return null;
  if (candidate.kind !== "start" && candidate.kind !== "end") return null;
  if (typeof candidate.at !== "string") return null;
  try {
    return { id: candidate.id, kind: candidate.kind, at: BigInt(candidate.at) };
  } catch {
    return null;
  }
}
