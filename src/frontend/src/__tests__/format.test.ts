import {
  MAX_SHIFT_NS,
  NS_PER_HOUR,
  NS_PER_MINUTE,
  capProgress,
  dateToTimestamp,
  formatDuration,
  formatElapsed,
  formatHours,
  monthBounds,
  monthKeyOf,
  notePreview,
  shiftMonthKey,
  timestampToDate,
} from "@/lib/format";
import { describe, expect, it } from "vitest";

describe("duration formatting", () => {
  it("formats elapsed time as H:MM:SS", () => {
    expect(formatElapsed(0n)).toBe("00:00:00");
    expect(
      formatElapsed(NS_PER_HOUR + 5n * NS_PER_MINUTE + 3n * 1_000_000_000n),
    ).toBe("01:05:03");
    expect(formatElapsed(-5n)).toBe("00:00:00");
  });

  it("formats compact durations", () => {
    expect(formatDuration(0n)).toBe("0m");
    expect(formatDuration(45n * NS_PER_MINUTE)).toBe("45m");
    expect(formatDuration(2n * NS_PER_HOUR)).toBe("2h");
    expect(formatDuration(2n * NS_PER_HOUR + 30n * NS_PER_MINUTE)).toBe(
      "2h 30m",
    );
  });

  it("formats decimal hours", () => {
    expect(formatHours(0n)).toBe("0");
    expect(formatHours(NS_PER_HOUR)).toBe("1");
    expect(formatHours(NS_PER_HOUR + NS_PER_HOUR / 2n)).toBe("1.5");
  });
});

describe("the 10-hour cap", () => {
  it("is ten hours in nanoseconds", () => {
    expect(MAX_SHIFT_NS).toBe(10n * NS_PER_HOUR);
  });

  it("reports cap progress as a 0-1 fraction", () => {
    expect(capProgress(0n)).toBe(0);
    expect(capProgress(5n * NS_PER_HOUR)).toBeCloseTo(0.5, 3);
    expect(capProgress(MAX_SHIFT_NS)).toBe(1);
    expect(capProgress(MAX_SHIFT_NS * 2n)).toBe(1);
  });
});

describe("timestamp conversion", () => {
  it("round-trips a date through a nanosecond timestamp", () => {
    const date = new Date("2026-09-14T08:30:00.000Z");
    const timestamp = dateToTimestamp(date);
    expect(timestampToDate(timestamp)?.getTime()).toBe(date.getTime());
  });

  it("returns null for an out-of-range timestamp", () => {
    expect(timestampToDate(10n ** 30n)).toBeNull();
  });
});

describe("month helpers", () => {
  it("derives a YYYY-MM key", () => {
    expect(monthKeyOf(new Date(2026, 8, 15))).toBe("2026-09");
    expect(monthKeyOf(new Date(2026, 11, 1))).toBe("2026-12");
  });

  it("shifts a month key across year boundaries", () => {
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });

  it("bounds a month from its first instant to the next month's first", () => {
    const { from, to } = monthBounds("2026-09");
    const start = timestampToDate(from);
    const end = timestampToDate(to);
    expect(start?.getFullYear()).toBe(2026);
    expect(start?.getMonth()).toBe(8);
    expect(start?.getDate()).toBe(1);
    expect(end?.getMonth()).toBe(9);
    expect(end?.getDate()).toBe(1);
  });
});

describe("notePreview", () => {
  it("collapses whitespace and truncates long notes", () => {
    expect(notePreview("  hello   world  ")).toBe("hello world");
    const long = "a".repeat(100);
    const preview = notePreview(long, 10);
    expect(preview.length).toBeLessThanOrEqual(10);
    expect(preview.endsWith("…")).toBe(true);
  });
});
