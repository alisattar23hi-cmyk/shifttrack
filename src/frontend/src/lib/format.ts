import type { MonthKey, Timestamp } from "@/types";

/** Nanoseconds in one hour, used for the 10-hour continuous cap. */
export const NS_PER_HOUR = 3_600_000_000_000n;
export const NS_PER_MINUTE = 60_000_000_000n;
export const NS_PER_SECOND = 1_000_000_000n;

/** The maximum continuous shift length, in nanoseconds (10 hours). */
export const MAX_SHIFT_NS = 10n * NS_PER_HOUR;

/** Convert a backend nanosecond timestamp to a `Date`, or null when invalid. */
export function timestampToDate(timestamp: Timestamp): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Convert a `Date` to a backend nanosecond timestamp. */
export function dateToTimestamp(date: Date): Timestamp {
  return BigInt(date.getTime()) * 1_000_000n;
}

/** Current time as a backend nanosecond timestamp. */
export function nowTimestamp(): Timestamp {
  return dateToTimestamp(new Date());
}

/** Format a duration in nanoseconds as `H:MM:SS` for the live readout. */
export function formatElapsed(ns: bigint): string {
  const safe = ns > 0n ? ns : 0n;
  const totalSeconds = safe / NS_PER_SECOND;
  const hours = totalSeconds / 3600n;
  const minutes = (totalSeconds % 3600n) / 60n;
  const seconds = totalSeconds % 60n;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/** Format a duration in nanoseconds as a compact `Xh Ym` label. */
export function formatDuration(ns: bigint): string {
  const safe = ns > 0n ? ns : 0n;
  const totalMinutes = safe / NS_PER_MINUTE;
  const hours = totalMinutes / 60n;
  const minutes = totalMinutes % 60n;
  if (hours === 0n) return `${minutes}m`;
  if (minutes === 0n) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Format a duration in nanoseconds as decimal hours, e.g. `7.5`. */
export function formatHours(ns: bigint): string {
  const safe = ns > 0n ? ns : 0n;
  const tenths = (safe * 10n) / NS_PER_HOUR;
  const whole = tenths / 10n;
  const frac = tenths % 10n;
  return frac === 0n ? whole.toString() : `${whole}.${frac}`;
}

/** Format a timestamp as a short date, e.g. `Tue, 26 Oct 2023`. */
export function formatDate(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a timestamp as a clock time, e.g. `07:00`. */
export function formatTime(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a timestamp as a full date and time, e.g. `26 Oct 2023, 07:00`. */
export function formatDateTime(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format a timestamp as a long weekday heading, e.g. `Tuesday, 26 October 2023`. */
export function formatLongDate(timestamp: Timestamp): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** The `YYYY-MM` month key for a date. */
export function monthKeyOf(date: Date): MonthKey {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${year}-${month}`;
}

/** The `YYYY-MM` month key for the current month. */
export function currentMonthKey(): MonthKey {
  return monthKeyOf(new Date());
}

/** A human label for a `YYYY-MM` month key, e.g. `October 2023`. */
export function formatMonthKey(month: MonthKey): string {
  const [year, monthPart] = month.split("-");
  const monthIndex = Number(monthPart) - 1;
  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return month;
  }
  const date = new Date(Number(year), monthIndex, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Shift a `YYYY-MM` month key by a number of months. */
export function shiftMonthKey(month: MonthKey, delta: number): MonthKey {
  const [year, monthPart] = month.split("-");
  const date = new Date(Number(year), Number(monthPart) - 1 + delta, 1);
  return monthKeyOf(date);
}

/** The start and end timestamps bounding a `YYYY-MM` month. */
export function monthBounds(month: MonthKey): {
  from: Timestamp;
  to: Timestamp;
} {
  const [year, monthPart] = month.split("-");
  const start = new Date(Number(year), Number(monthPart) - 1, 1, 0, 0, 0, 0);
  const end = new Date(Number(year), Number(monthPart), 1, 0, 0, 0, 0);
  return { from: dateToTimestamp(start), to: dateToTimestamp(end) };
}

/** The fraction (0–1) of the 10-hour cap a duration has consumed. */
export function capProgress(ns: bigint): number {
  if (ns <= 0n) return 0;
  const ratio = Number((ns * 1000n) / MAX_SHIFT_NS) / 1000;
  return Math.min(1, Math.max(0, ratio));
}

/** A short preview of note text for list rows. */
export function notePreview(text: string, max = 72): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** A stable, human-readable label for a worker principal. */
export function shortPrincipal(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 5)}…${id.slice(-3)}`;
}
