import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type AddNoteResult = {
    __kind__: "ok";
    ok: ShiftView;
} | {
    __kind__: "notAuthorized";
    notAuthorized: null;
} | {
    __kind__: "notFound";
    notFound: null;
};
export interface AllWorkersMonthlyReport {
    month: MonthKey;
    shiftCount: bigint;
    workers: Array<WorkerTotals>;
    totalDurationNs: bigint;
    workerCount: bigint;
}
export interface Cell {
    value: Value;
    name: string;
}
export type CorrectShiftResult = {
    __kind__: "ok";
    ok: ShiftView;
} | {
    __kind__: "notAuthorized";
    notAuthorized: null;
} | {
    __kind__: "invalidRange";
    invalidRange: null;
} | {
    __kind__: "notFound";
    notFound: null;
};
export type EndShiftResult = {
    __kind__: "ok";
    ok: ShiftView;
} | {
    __kind__: "noActiveShift";
    noActiveShift: null;
};
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export type ExportResult = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "notAuthorized";
    notAuthorized: null;
};
export type MonthKey = string;
export type NoteId = bigint;
export interface ReportShiftRow {
    id: ShiftId;
    startTime: Timestamp;
    endTime?: Timestamp;
    noteCount: bigint;
    durationNs: bigint;
    cappedAtLimit: boolean;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type ShiftId = bigint;
export interface ShiftNote {
    id: NoteId;
    createdAt: Timestamp;
    text: string;
    authorName: string;
    author: WorkerId;
}
export interface ShiftQuery {
    to?: Timestamp;
    sortBy: ShiftSort;
    from?: Timestamp;
}
export interface ShiftView {
    id: ShiftId;
    startTime: Timestamp;
    endTime?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    notes: Array<ShiftNote>;
    worker: WorkerId;
    durationNs: bigint;
    cappedAtLimit: boolean;
}
export type StartShiftResult = {
    __kind__: "ok";
    ok: ShiftView;
} | {
    __kind__: "alreadyActive";
    alreadyActive: ShiftView;
};
export type Timestamp = bigint;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export type WorkerId = Principal;
export interface WorkerMonthlyReport {
    month: MonthKey;
    shifts: Array<ReportShiftRow>;
    shiftCount: bigint;
    averageDurationNs: bigint;
    totalDurationNs: bigint;
    worker: WorkerId;
    workerName: string;
}
export interface WorkerSummary {
    id: WorkerId;
    name: string;
    role: Role;
    email: string;
    totalDurationNs: bigint;
    totalShifts: bigint;
    lastShiftEnd?: Timestamp;
}
export interface WorkerTotals {
    shiftCount: bigint;
    averageDurationNs: bigint;
    totalDurationNs: bigint;
    worker: WorkerId;
    workerName: string;
}
export interface WorkerView {
    id: WorkerId;
    name: string;
    createdAt: Timestamp;
    role: Role;
    email: string;
}
export enum Role {
    owner = "owner",
    worker = "worker"
}
export enum ShiftSort {
    durationDesc = "durationDesc",
    dateAsc = "dateAsc",
    dateDesc = "dateDesc",
    durationAsc = "durationAsc"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    /**
     * / Add a note to a shift. Allowed for the shift's worker and the owner.
     */
    addShiftNote(id: bigint, text: string): Promise<AddNoteResult>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    /**
     * / Correct a shift's start/end times. Owner only.
     */
    correctShift(id: bigint, startTime: Timestamp, endTime: Timestamp | null): Promise<CorrectShiftResult>;
    /**
     * / End the caller's active shift.
     */
    endShift(): Promise<EndShiftResult>;
    execute(qJson: string): Promise<Result>;
    /**
     * / Export a monthly report as a downloadable CSV document. Owner only.
     */
    exportMonthlyReport(month: MonthKey): Promise<ExportResult>;
    /**
     * / Return the caller's currently running shift, if any.
     */
    getActiveShift(): Promise<ShiftView | null>;
    /**
     * / Return the owner's monthly report across all workers. Owner only.
     */
    getAllWorkersMonthlyReport(month: MonthKey): Promise<AllWorkersMonthlyReport>;
    /**
     * / Return static Markdown documentation for this backend's public API.
     */
    getApiDoc(): Promise<string>;
    /**
     * / Return the caller's own profile.
     */
    getCallerProfile(): Promise<WorkerView | null>;
    getCallerUserRole(): Promise<UserRole>;
    /**
     * / Return the caller's own monthly report.
     */
    getMyMonthlyReport(month: MonthKey): Promise<WorkerMonthlyReport>;
    /**
     * / Return any worker's monthly report. Owner only.
     */
    getWorkerMonthlyReport(worker: Principal, month: MonthKey): Promise<WorkerMonthlyReport>;
    /**
     * / Return any worker's profile. Owner only.
     */
    getWorkerProfile(id: Principal): Promise<WorkerView | null>;
    isCallerAdmin(): Promise<boolean>;
    /**
     * / List the caller's own shifts, filtered and sorted.
     */
    listMyShifts(filter: ShiftQuery): Promise<Array<ShiftView>>;
    /**
     * / List any worker's shifts. Owner only.
     */
    listWorkerShifts(worker: Principal, filter: ShiftQuery): Promise<Array<ShiftView>>;
    /**
     * / List all workers with aggregate stats. Owner only.
     */
    listWorkers(): Promise<Array<WorkerSummary>>;
    /**
     * / Register the caller's profile on first sign-in, or return the existing one.
     */
    registerProfile(email: string, name: string): Promise<WorkerView>;
    schema(): Promise<string>;
    /**
     * / Promote or demote a worker. Owner only.
     */
    setWorkerRole(id: Principal, role: Role): Promise<boolean>;
    /**
     * / Start a shift for the caller.
     */
    startShift(): Promise<StartShiftResult>;
}
