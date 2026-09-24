import type {
  AllWorkersMonthlyReport,
  CrewClockBackend,
  Role,
  ShiftNote,
  ShiftView,
  Timestamp,
  WorkerMonthlyReport,
  WorkerSummary,
  WorkerView,
} from "@/types";
import { vi } from "vitest";

export const NS_PER_HOUR = 3_600_000_000_000n;
export const NS_PER_MINUTE = 60_000_000_000n;

/** A fixed "now" so timers and timestamps are deterministic. */
export const FIXED_NOW = new Date("2026-09-15T09:00:00.000Z");

export function ts(date: Date): Timestamp {
  return BigInt(date.getTime()) * 1_000_000n;
}

export function makeWorker(overrides: Partial<WorkerView> = {}): WorkerView {
  return {
    id: "worker-1",
    email: "alex@crew.example",
    name: "Alex Rivera",
    role: "worker",
    createdAt: ts(FIXED_NOW),
    ...overrides,
  };
}

export function makeNote(overrides: Partial<ShiftNote> = {}): ShiftNote {
  return {
    id: 1n,
    author: "worker-1",
    authorName: "Alex Rivera",
    text: "Handover complete",
    createdAt: ts(FIXED_NOW),
    ...overrides,
  };
}

export function makeShift(overrides: Partial<ShiftView> = {}): ShiftView {
  const start = ts(new Date("2026-09-14T08:00:00.000Z"));
  return {
    id: 1n,
    worker: "worker-1",
    startTime: start,
    endTime: start + 8n * NS_PER_HOUR,
    durationNs: 8n * NS_PER_HOUR,
    cappedAtLimit: false,
    notes: [],
    createdAt: start,
    updatedAt: start,
    ...overrides,
  };
}

export function makeWorkerSummary(
  overrides: Partial<WorkerSummary> = {},
): WorkerSummary {
  return {
    id: "worker-1",
    email: "alex@crew.example",
    name: "Alex Rivera",
    role: "worker",
    totalShifts: 1n,
    totalDurationNs: 8n * NS_PER_HOUR,
    lastShiftEnd: ts(new Date("2026-09-14T16:00:00.000Z")),
    ...overrides,
  };
}

export function makeMonthlyReport(
  overrides: Partial<WorkerMonthlyReport> = {},
): WorkerMonthlyReport {
  return {
    worker: "worker-1",
    workerName: "Alex Rivera",
    month: "2026-09",
    totalDurationNs: 8n * NS_PER_HOUR,
    shiftCount: 1n,
    averageDurationNs: 8n * NS_PER_HOUR,
    shifts: [
      {
        id: 1n,
        startTime: ts(new Date("2026-09-14T08:00:00.000Z")),
        endTime: ts(new Date("2026-09-14T16:00:00.000Z")),
        durationNs: 8n * NS_PER_HOUR,
        cappedAtLimit: false,
        noteCount: 0n,
      },
    ],
    ...overrides,
  };
}

export function makeAllWorkersReport(
  overrides: Partial<AllWorkersMonthlyReport> = {},
): AllWorkersMonthlyReport {
  return {
    month: "2026-09",
    totalDurationNs: 8n * NS_PER_HOUR,
    shiftCount: 1n,
    workerCount: 1n,
    workers: [
      {
        worker: "worker-1",
        workerName: "Alex Rivera",
        totalDurationNs: 8n * NS_PER_HOUR,
        shiftCount: 1n,
        averageDurationNs: 8n * NS_PER_HOUR,
      },
    ],
    ...overrides,
  };
}

/**
 * A typed in-memory stand-in for the generated backend actor.
 *
 * Every method the UI depends on is present and returns a resolved value, so a
 * component test exercises the real hooks and components against a stable
 * contract. This is a mock: it proves nothing about the deployed canister.
 */
export interface MockBackendOptions {
  profile?: WorkerView | null;
  /** The access-control admin flag returned by `isCallerAdmin`. */
  isCallerAdmin?: boolean;
  activeShift?: ShiftView | null;
  shifts?: ShiftView[];
  workers?: WorkerSummary[];
  monthlyReport?: WorkerMonthlyReport;
  allWorkersReport?: AllWorkersMonthlyReport;
  startResult?: Awaited<ReturnType<CrewClockBackend["startShift"]>>;
  endResult?: Awaited<ReturnType<CrewClockBackend["endShift"]>>;
  addNoteResult?: Awaited<ReturnType<CrewClockBackend["addShiftNote"]>>;
  correctResult?: Awaited<ReturnType<CrewClockBackend["correctShift"]>>;
  exportResult?: Awaited<ReturnType<CrewClockBackend["exportMonthlyReport"]>>;
}

export interface MockBackend extends CrewClockBackend {
  isCallerAdmin: ReturnType<typeof vi.fn>;
  startShift: ReturnType<typeof vi.fn>;
  endShift: ReturnType<typeof vi.fn>;
  addShiftNote: ReturnType<typeof vi.fn>;
  correctShift: ReturnType<typeof vi.fn>;
  listWorkers: ReturnType<typeof vi.fn>;
  setWorkerRole: ReturnType<typeof vi.fn>;
  exportMonthlyReport: ReturnType<typeof vi.fn>;
}

export function createMockBackend(
  options: MockBackendOptions = {},
): MockBackend {
  const profile =
    options.profile === undefined ? makeWorker() : options.profile;
  const activeShift = options.activeShift ?? null;
  const shifts = options.shifts ?? [];
  const workers = options.workers ?? [];
  const monthlyReport = options.monthlyReport ?? makeMonthlyReport();
  const allWorkersReport = options.allWorkersReport ?? makeAllWorkersReport();

  const backend = {
    registerProfile: vi.fn(async (email: string, name: string) =>
      makeWorker({ email, name }),
    ),
    getCallerProfile: vi.fn(async () => profile),
    isCallerAdmin: vi.fn(async () => options.isCallerAdmin ?? false),
    getWorkerProfile: vi.fn(async () => profile),
    listWorkers: vi.fn(async () => workers),
    setWorkerRole: vi.fn(async (_id: string, _role: Role) => true),

    startShift: vi.fn(
      async () =>
        options.startResult ?? {
          kind: "ok" as const,
          shift: makeShift({ endTime: null, durationNs: 0n }),
        },
    ),
    endShift: vi.fn(
      async () =>
        options.endResult ?? { kind: "ok" as const, shift: makeShift() },
    ),
    getActiveShift: vi.fn(async () => activeShift),
    listMyShifts: vi.fn(async () => shifts),
    listWorkerShifts: vi.fn(async () => shifts),
    addShiftNote: vi.fn(
      async () =>
        options.addNoteResult ?? {
          kind: "ok" as const,
          shift: makeShift({ notes: [makeNote()] }),
        },
    ),
    correctShift: vi.fn(
      async () =>
        options.correctResult ?? { kind: "ok" as const, shift: makeShift() },
    ),

    getMyMonthlyReport: vi.fn(async () => monthlyReport),
    getWorkerMonthlyReport: vi.fn(async () => monthlyReport),
    getAllWorkersMonthlyReport: vi.fn(async () => allWorkersReport),
    exportMonthlyReport: vi.fn(
      async () =>
        options.exportResult ?? {
          kind: "ok" as const,
          csv: "worker,totalDurationNs,shiftCount,averageDurationNs",
        },
    ),
  };

  return backend as unknown as MockBackend;
}
