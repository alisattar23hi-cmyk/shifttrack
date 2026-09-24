import { PocketIc } from "@dfinity/pic";
import type { Actor, CanisterFixture } from "@dfinity/pic";
import { createIdentity } from "@dfinity/pic";
import { afterAll, beforeAll, expect, it } from "vitest";

import { idlFactory } from "../../src/frontend/src/declarations/backend.did.js";
import type { _SERVICE } from "../../src/frontend/src/declarations/backend.did";

const PIC_URL = process.env.POCKET_IC_URL ?? "";
const BACKEND_WASM = process.env.BACKEND_WASM ?? "";

let pic: PocketIc | undefined;
let actor: Actor<_SERVICE>;
let canisterId: CanisterFixture<_SERVICE>["canisterId"];

const alice = createIdentity("alice");
const bob = createIdentity("bob");
const carol = createIdentity("carol");

const EMPTY_QUERY = { from: [], to: [], sortBy: { dateDesc: null } } as const;

beforeAll(async () => {
  pic = await PocketIc.create(PIC_URL);
  ({ actor, canisterId } = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM,
  }));
});

afterAll(async () => {
  await pic?.tearDown();
});

it("answers empty-state reads instead of trapping", async () => {
  actor.setIdentity(alice);
  await expect(actor.getCallerProfile()).resolves.toEqual([]);
  await expect(actor.getActiveShift()).resolves.toEqual([]);
  await expect(actor.listMyShifts(EMPTY_QUERY)).resolves.toEqual([]);
});

it("registers the first account as owner and a later one as worker", async () => {
  actor.setIdentity(alice);
  const aliceProfile = await actor.registerProfile("alice@crew.example", "Alice");
  expect(aliceProfile).toMatchObject({
    email: "alice@crew.example",
    name: "Alice",
    role: { owner: null },
  });

  actor.setIdentity(bob);
  const bobProfile = await actor.registerProfile("bob@crew.example", "Bob");
  expect(bobProfile).toMatchObject({
    email: "bob@crew.example",
    name: "Bob",
    role: { worker: null },
  });

  // Re-registering returns the existing profile rather than creating a second.
  const again = await actor.registerProfile("bob@crew.example", "Bob");
  expect(again.id).toEqual(bobProfile.id);

  // A third account is a plain worker, used to prove non-owner note denial.
  actor.setIdentity(carol);
  const carolProfile = await actor.registerProfile("carol@crew.example", "Carol");
  expect(carolProfile.role).toEqual({ worker: null });
});

it("round-trips a shift through start, active read, and end", async () => {
  actor.setIdentity(bob);
  const started = await actor.startShift();
  expect(started).toHaveProperty("ok");
  const shift = "ok" in started ? started.ok : undefined;
  expect(shift).toBeDefined();
  expect(shift?.endTime).toEqual([]);
  expect(shift?.durationNs).toEqual(0n);

  const active = await actor.getActiveShift();
  expect(active).toHaveLength(1);
  expect(active[0]?.id).toEqual(shift?.id);

  const ended = await actor.endShift();
  expect(ended).toHaveProperty("ok");
  const finished = "ok" in ended ? ended.ok : undefined;
  expect(finished?.endTime).toHaveLength(1);
  expect(finished?.durationNs).toBeGreaterThanOrEqual(0n);

  await expect(actor.getActiveShift()).resolves.toEqual([]);
});

it("prevents a second shift while one is active", async () => {
  actor.setIdentity(bob);
  const first = await actor.startShift();
  expect(first).toHaveProperty("ok");

  const second = await actor.startShift();
  expect(second).toHaveProperty("alreadyActive");

  await actor.endShift();
});

it("keeps one worker's shifts invisible to another", async () => {
  actor.setIdentity(alice);
  const aliceShifts = await actor.listMyShifts(EMPTY_QUERY);
  expect(aliceShifts).toEqual([]);

  actor.setIdentity(bob);
  const bobShifts = await actor.listMyShifts(EMPTY_QUERY);
  expect(bobShifts.length).toBeGreaterThan(0);
  for (const shift of bobShifts) {
    expect(shift.worker).toEqual(bob.getPrincipal());
  }
});

it("rejects owner-only reads for a non-owner caller", async () => {
  actor.setIdentity(bob);
  await expect(actor.listWorkers()).rejects.toThrow();
  await expect(actor.getAllWorkersMonthlyReport("2026-09")).rejects.toThrow();
});

it("lets the owner list workers and promote a worker", async () => {
  actor.setIdentity(alice);
  const workers = await actor.listWorkers();
  expect(workers.length).toBeGreaterThanOrEqual(2);

  const promoted = await actor.setWorkerRole(bob.getPrincipal(), {
    owner: null,
  });
  expect(promoted).toBe(true);

  const after = await actor.listWorkers();
  const bobRow = after.find((row) => row.id.toText() === bob.getPrincipal().toText());
  expect(bobRow?.role).toEqual({ owner: null });

  // Demote back so later tests see the original roles.
  await actor.setWorkerRole(bob.getPrincipal(), { worker: null });
});

it("adds a note to a shift and reports it back", async () => {
  actor.setIdentity(bob);
  const started = await actor.startShift();
  const shift = "ok" in started ? started.ok : undefined;
  expect(shift).toBeDefined();
  if (!shift) return;

  const noted = await actor.addShiftNote(shift.id, "Handover complete");
  expect(noted).toHaveProperty("ok");
  const withNote = "ok" in noted ? noted.ok : undefined;
  expect(withNote?.notes).toHaveLength(1);
  expect(withNote?.notes[0]).toMatchObject({
    text: "Handover complete",
    authorName: "Bob",
  });

  await actor.endShift();
});

it("refuses a note from a worker who does not own the shift", async () => {
  actor.setIdentity(bob);
  const started = await actor.startShift();
  const shift = "ok" in started ? started.ok : undefined;
  expect(shift).toBeDefined();
  if (!shift) return;

  // Carol is a worker, not the owner and not the shift's worker, so she is
  // refused. (The owner is allowed to note any shift.)
  actor.setIdentity(carol);
  const denied = await actor.addShiftNote(shift.id, "not mine");
  expect(denied).toEqual({ notAuthorized: null });

  actor.setIdentity(bob);
  await actor.endShift();
});

it("lets the owner correct shift times and rejects an invalid range", async () => {
  actor.setIdentity(bob);
  const started = await actor.startShift();
  const shift = "ok" in started ? started.ok : undefined;
  expect(shift).toBeDefined();
  if (!shift) return;
  const ended = await actor.endShift();
  const finished = "ok" in ended ? ended.ok : undefined;
  expect(finished).toBeDefined();
  if (!finished) return;

  actor.setIdentity(alice);
  const invalid = await actor.correctShift(
    finished.id,
    finished.startTime + 3_600_000_000_000n,
    [finished.startTime],
  );
  expect(invalid).toEqual({ invalidRange: null });

  const corrected = await actor.correctShift(
    finished.id,
    finished.startTime,
    [finished.startTime + 3_600_000_000_000n],
  );
  expect(corrected).toHaveProperty("ok");
  const fixed = "ok" in corrected ? corrected.ok : undefined;
  expect(fixed?.durationNs).toEqual(3_600_000_000_000n);
});

it("reports monthly totals for the caller and across all workers", async () => {
  actor.setIdentity(bob);
  const mine = await actor.getMyMonthlyReport("2026-09");
  expect(mine.worker).toEqual(bob.getPrincipal());
  expect(mine.shiftCount).toBeGreaterThanOrEqual(0n);
  expect(mine.totalDurationNs).toBeGreaterThanOrEqual(0n);

  actor.setIdentity(alice);
  const all = await actor.getAllWorkersMonthlyReport("2026-09");
  expect(all.workerCount).toBeGreaterThanOrEqual(0n);
  expect(all.shiftCount).toBeGreaterThanOrEqual(0n);
});

it("exports a monthly report as CSV for the owner only", async () => {
  actor.setIdentity(alice);
  const exported = await actor.exportMonthlyReport("2026-09");
  expect(exported).toHaveProperty("ok");
  const csv = "ok" in exported ? exported.ok : "";
  expect(csv.split("\n")[0]).toBe(
    "worker,totalDurationNs,shiftCount,averageDurationNs",
  );

  actor.setIdentity(bob);
  await expect(actor.exportMonthlyReport("2026-09")).resolves.toEqual({
    notAuthorized: null,
  });
});

it("rejects an anonymous caller", async () => {
  const guest = pic!.createActor<_SERVICE>(idlFactory, canisterId);
  await expect(guest.startShift()).rejects.toThrow();
  await expect(guest.registerProfile("x@y.z", "X")).rejects.toThrow();
});
