import {
  dequeue,
  enqueue,
  makeQueuedAction,
  readLocalActiveShift,
  readQueue,
  writeLocalActiveShift,
  writeQueue,
} from "@/lib/offline-queue";
import { beforeEach, describe, expect, it } from "vitest";

beforeEach(() => {
  window.localStorage.clear();
});

describe("offline action queue", () => {
  it("starts empty", () => {
    expect(readQueue()).toEqual([]);
  });

  it("enqueues and dequeues actions durably", () => {
    const start = makeQueuedAction("start", 1_000n);
    enqueue(start);
    const end = makeQueuedAction("end", 2_000n);
    enqueue(end);

    const queued = readQueue();
    expect(queued).toHaveLength(2);
    expect(queued[0]).toMatchObject({ kind: "start", at: 1_000n });
    expect(queued[1]).toMatchObject({ kind: "end", at: 2_000n });

    dequeue(start.id);
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]?.id).toBe(end.id);
  });

  it("gives each queued action a distinct id", () => {
    const a = makeQueuedAction("start", 1_000n);
    const b = makeQueuedAction("start", 1_000n);
    expect(a.id).not.toBe(b.id);
  });

  it("ignores malformed stored data", () => {
    window.localStorage.setItem("crewclock.offline-queue.v1", "not json");
    expect(readQueue()).toEqual([]);

    window.localStorage.setItem(
      "crewclock.offline-queue.v1",
      JSON.stringify([{ id: "x", kind: "bogus", at: "1" }]),
    );
    expect(readQueue()).toEqual([]);
  });

  it("replaces the whole queue", () => {
    writeQueue([makeQueuedAction("end", 5n)]);
    expect(readQueue()).toHaveLength(1);
    writeQueue([]);
    expect(readQueue()).toEqual([]);
  });
});

describe("local active shift persistence", () => {
  it("returns null when nothing is stored", () => {
    expect(readLocalActiveShift()).toBeNull();
  });

  it("round-trips a pending local shift", () => {
    writeLocalActiveShift({ startTime: 12_345n, pending: true });
    expect(readLocalActiveShift()).toEqual({
      startTime: 12_345n,
      pending: true,
    });
  });

  it("clears the record when written null", () => {
    writeLocalActiveShift({ startTime: 1n, pending: false });
    writeLocalActiveShift(null);
    expect(readLocalActiveShift()).toBeNull();
  });

  it("ignores malformed stored data", () => {
    window.localStorage.setItem("crewclock.local-active-shift.v1", "{oops");
    expect(readLocalActiveShift()).toBeNull();
  });
});
