/**
 * Domain types for CrewClock.
 *
 * These mirror the backend Motoko contract in `src/backend/types/*.mo`.
 * Timestamps are nanosecond `bigint`s (IC `Time.now()` convention) and must be
 * converted through `timestampToDate` before any JavaScript `Date` operation.
 */

export type WorkerId = string;
export type ShiftId = bigint;
export type NoteId = bigint;
export type Timestamp = bigint;
export type MonthKey = string;

/** The role a signed-in account holds. Mirrors Motoko `Role`. */
export type Role = "worker" | "owner";

/** A note attached to a shift. */
export interface ShiftNote {
  id: NoteId;
  author: WorkerId;
  authorName: string;
  text: string;
  createdAt: Timestamp;
}

/** A completed or in-progress shift record. `endTime` is null while running. */
export interface ShiftView {
  id: ShiftId;
  worker: WorkerId;
  startTime: Timestamp;
  endTime: Timestamp | null;
  durationNs: bigint;
  cappedAtLimit: boolean;
  notes: ShiftNote[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Public view of a worker profile. */
export interface WorkerView {
  id: WorkerId;
  email: string;
  name: string;
  role: Role;
  createdAt: Timestamp;
}

/** A worker row for the owner's worker list, with aggregate shift stats. */
export interface WorkerSummary {
  id: WorkerId;
  email: string;
  name: string;
  role: Role;
  totalShifts: bigint;
  totalDurationNs: bigint;
  lastShiftEnd: Timestamp | null;
}

/** Sort options for a shift list query. */
export type ShiftSort = "dateDesc" | "dateAsc" | "durationDesc" | "durationAsc";

/** Filter and sort options for a shift list query. */
export interface ShiftQuery {
  from: Timestamp | null;
  to: Timestamp | null;
  sortBy: ShiftSort;
}

/** One row of a monthly report: a single shift's contribution. */
export interface ReportShiftRow {
  id: ShiftId;
  startTime: Timestamp;
  endTime: Timestamp | null;
  durationNs: bigint;
  cappedAtLimit: boolean;
  noteCount: bigint;
}

/** A single worker's monthly report. */
export interface WorkerMonthlyReport {
  worker: WorkerId;
  workerName: string;
  month: MonthKey;
  totalDurationNs: bigint;
  shiftCount: bigint;
  averageDurationNs: bigint;
  shifts: ReportShiftRow[];
}

/** Per-worker totals inside the owner's all-workers report. */
export interface WorkerTotals {
  worker: WorkerId;
  workerName: string;
  totalDurationNs: bigint;
  shiftCount: bigint;
  averageDurationNs: bigint;
}

/** The owner's monthly report across all workers. */
export interface AllWorkersMonthlyReport {
  month: MonthKey;
  totalDurationNs: bigint;
  shiftCount: bigint;
  workerCount: bigint;
  workers: WorkerTotals[];
}

/** Result variants returned by the backend shift mutations. */
export type StartShiftResult =
  | { kind: "ok"; shift: ShiftView }
  | { kind: "alreadyActive"; shift: ShiftView };

export type EndShiftResult =
  | { kind: "ok"; shift: ShiftView }
  | { kind: "noActiveShift" };

export type AddNoteResult =
  | { kind: "ok"; shift: ShiftView }
  | { kind: "notFound" }
  | { kind: "notAuthorized" };

export type CorrectShiftResult =
  | { kind: "ok"; shift: ShiftView }
  | { kind: "notFound" }
  | { kind: "notAuthorized" }
  | { kind: "invalidRange" };

export type ExportResult =
  | { kind: "ok"; csv: string }
  | { kind: "notAuthorized" };

/**
 * The full backend surface CrewClock depends on.
 *
 * The generated `backend.ts` bindings are regenerated from the Motoko source by
 * the build pipeline; this interface is the typed contract the hooks code
 * against so the UI stays correct as the bindings catch up.
 */
export interface CrewClockBackend {
  registerProfile(email: string, name: string): Promise<WorkerView>;
  getCallerProfile(): Promise<WorkerView | null>;
  /**
   * Authoritative owner check from the access-control layer.
   *
   * The profile's own `role` can lag behind access control: the sign-in flow
   * initializes access control before `registerProfile` runs, so the first
   * account is `#admin` here while its stored profile may still say `#worker`.
   */
  isCallerAdmin(): Promise<boolean>;
  getWorkerProfile(id: WorkerId): Promise<WorkerView | null>;
  listWorkers(): Promise<WorkerSummary[]>;
  setWorkerRole(id: WorkerId, role: Role): Promise<boolean>;

  startShift(): Promise<StartShiftResult>;
  endShift(): Promise<EndShiftResult>;
  getActiveShift(): Promise<ShiftView | null>;
  listMyShifts(query: ShiftQuery): Promise<ShiftView[]>;
  listWorkerShifts(worker: WorkerId, query: ShiftQuery): Promise<ShiftView[]>;
  addShiftNote(id: ShiftId, text: string): Promise<AddNoteResult>;
  correctShift(
    id: ShiftId,
    startTime: Timestamp,
    endTime: Timestamp | null,
  ): Promise<CorrectShiftResult>;

  getMyMonthlyReport(month: MonthKey): Promise<WorkerMonthlyReport>;
  getWorkerMonthlyReport(
    worker: WorkerId,
    month: MonthKey,
  ): Promise<WorkerMonthlyReport>;
  getAllWorkersMonthlyReport(month: MonthKey): Promise<AllWorkersMonthlyReport>;
  exportMonthlyReport(month: MonthKey): Promise<ExportResult>;
}

/** A shift queued locally while offline, awaiting sync. */
export interface QueuedShiftAction {
  id: string;
  kind: "start" | "end";
  at: Timestamp;
}
