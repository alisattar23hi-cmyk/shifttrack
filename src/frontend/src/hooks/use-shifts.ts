import { useBackendActor } from "@/hooks/use-auth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  MAX_SHIFT_NS,
  NS_PER_SECOND,
  capProgress,
  dateToTimestamp,
  monthBounds,
  nowTimestamp,
} from "@/lib/format";
import {
  dequeue,
  enqueue,
  makeQueuedAction,
  readLocalActiveShift,
  readQueue,
  writeLocalActiveShift,
} from "@/lib/offline-queue";
import type {
  AllWorkersMonthlyReport,
  CorrectShiftResult,
  CrewClockBackend,
  ExportResult,
  MonthKey,
  ShiftQuery,
  ShiftSort,
  ShiftView,
  Timestamp,
  WorkerId,
  WorkerMonthlyReport,
  WorkerSummary,
} from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_QUERY: ShiftQuery = { from: null, to: null, sortBy: "dateDesc" };

/** The live elapsed time for a running shift, ticking once per second. */
export function useElapsed(startTime: Timestamp | null): bigint {
  const [elapsed, setElapsed] = useState<bigint>(() =>
    startTime ? nowTimestamp() - startTime : 0n,
  );

  useEffect(() => {
    if (startTime === null) {
      setElapsed(0n);
      return;
    }
    const tick = () => {
      const next = nowTimestamp() - startTime;
      setElapsed(next > 0n ? next : 0n);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startTime]);

  return elapsed;
}

/**
 * A locally-owned running shift.
 *
 * While the device is offline the backend cannot confirm a start, so the timer
 * is driven entirely by the device clock. This record is the source of truth
 * for the live readout until the queued action syncs.
 */
interface LocalActiveShift {
  startTime: Timestamp;
  /** True when the start has not yet been confirmed by the backend. */
  pending: boolean;
}

export interface ShiftsState {
  activeShift: ShiftView | null;
  /** The start time driving the live timer, backend or local. */
  activeStartTime: Timestamp | null;
  shifts: ShiftView[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  startShift: () => void;
  endShift: () => void;
  isStarting: boolean;
  isEnding: boolean;
  actionError: string | null;
  clearActionError: () => void;
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
}

/**
 * The worker's own shift clock: active shift, history, and offline queue.
 *
 * While offline, Start/End are recorded against the device clock and queued
 * locally; the timer keeps counting from the local start time and the queue
 * drains automatically when connectivity returns.
 */
export function useShifts(query: ShiftQuery = DEFAULT_QUERY): ShiftsState {
  const actor = useBackendActor();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(() => readQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localActive, setLocalActive] = useState<LocalActiveShift | null>(() =>
    readLocalActiveShift(),
  );
  const syncingRef = useRef(false);

  // Keep the locally-owned running shift durable across reloads.
  useEffect(() => {
    writeLocalActiveShift(localActive);
  }, [localActive]);

  const activeQuery = useQuery({
    queryKey: ["active-shift"],
    queryFn: async (): Promise<ShiftView | null> => {
      if (!actor) return null;
      return actor.getActiveShift();
    },
    enabled: !!actor,
    refetchInterval: isOnline ? 30_000 : false,
  });

  const shiftsQuery = useQuery({
    queryKey: [
      "shifts",
      query.from?.toString() ?? null,
      query.to?.toString() ?? null,
      query.sortBy,
    ],
    queryFn: async (): Promise<ShiftView[]> => {
      if (!actor) return [];
      return actor.listMyShifts(query);
    },
    enabled: !!actor,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["active-shift"] });
    void queryClient.invalidateQueries({ queryKey: ["shifts"] });
    void queryClient.invalidateQueries({ queryKey: ["reports"] });
  }, [queryClient]);

  const startMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!actor) throw new Error("Backend is not ready");
      await actor.startShift();
    },
    onSuccess: invalidate,
  });

  const endMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!actor) throw new Error("Backend is not ready");
      await actor.endShift();
    },
    onSuccess: invalidate,
  });

  const { mutate: runStart, isPending: isStarting } = startMutation;
  const { mutate: runEnd, isPending: isEnding } = endMutation;

  const startShift = useCallback(() => {
    setActionError(null);
    const at = nowTimestamp();
    // The timer starts immediately from the device clock, online or off.
    setLocalActive({ startTime: at, pending: !isOnline });
    if (!isOnline) {
      enqueue(makeQueuedAction("start", at));
      setPendingCount(readQueue().length);
      return;
    }
    runStart(undefined, {
      onError: () => {
        setLocalActive(null);
        setActionError("Could not start the shift. Try again.");
      },
    });
  }, [isOnline, runStart]);

  const endShift = useCallback(() => {
    setActionError(null);
    const at = nowTimestamp();
    setLocalActive(null);
    if (!isOnline) {
      enqueue(makeQueuedAction("end", at));
      setPendingCount(readQueue().length);
      return;
    }
    runEnd(undefined, {
      onError: () => setActionError("Could not end the shift. Try again."),
    });
  }, [isOnline, runEnd]);

  // Drain the offline queue once connectivity returns.
  useEffect(() => {
    if (!isOnline || !actor || syncingRef.current) return;
    const queue = readQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);

    const drain = async () => {
      for (const action of queue) {
        try {
          if (action.kind === "start") {
            await actor.startShift();
          } else {
            await actor.endShift();
          }
          dequeue(action.id);
          setPendingCount(readQueue().length);
        } catch {
          break;
        }
      }
      setIsSyncing(false);
      syncingRef.current = false;
      invalidate();
    };

    void drain();
  }, [actor, invalidate, isOnline]);

  const backendActive = activeQuery.data ?? null;

  // Reconcile the local record with the backend once it has answered. A
  // confirmed shift supersedes it; a resolved "no active shift" clears a
  // *pending* record that the backend never accepted (e.g. a stale offline
  // start). An online start is left to the mutation's own refetch.
  useEffect(() => {
    if (!localActive || !isOnline || activeQuery.isLoading) return;
    if (backendActive) {
      setLocalActive(null);
      return;
    }
    if (localActive.pending && activeQuery.isSuccess) {
      setLocalActive(null);
    }
  }, [
    activeQuery.isLoading,
    activeQuery.isSuccess,
    backendActive,
    isOnline,
    localActive,
  ]);

  const activeStartTime = backendActive
    ? backendActive.startTime
    : (localActive?.startTime ?? null);

  return {
    activeShift: backendActive,
    activeStartTime,
    shifts: shiftsQuery.data ?? [],
    isLoading: activeQuery.isLoading || shiftsQuery.isLoading,
    isError: activeQuery.isError || shiftsQuery.isError,
    refetch: () => {
      void activeQuery.refetch();
      void shiftsQuery.refetch();
    },
    startShift,
    endShift,
    isStarting,
    isEnding,
    actionError,
    clearActionError: () => setActionError(null),
    pendingCount,
    isOnline,
    isSyncing,
  };
}

/** Add a note to a shift. Allowed for the shift's worker and the owner. */
export function useAddShiftNote() {
  const actor = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: bigint; text: string }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addShiftNote(input.id, input.text);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shifts"] });
      void queryClient.invalidateQueries({ queryKey: ["worker-shifts"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

/** Correct a shift's start/end times. Owner only. */
export function useCorrectShift() {
  const actor = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: bigint;
      startTime: Timestamp;
      endTime: Timestamp | null;
    }): Promise<CorrectShiftResult> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.correctShift(input.id, input.startTime, input.endTime);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shifts"] });
      void queryClient.invalidateQueries({ queryKey: ["worker-shifts"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

/** The owner's worker roster with aggregate stats. */
export function useWorkers() {
  const actor = useBackendActor();
  return useQuery({
    queryKey: ["workers"],
    queryFn: async (): Promise<WorkerSummary[]> => {
      if (!actor) return [];
      return actor.listWorkers();
    },
    enabled: !!actor,
  });
}

/** Promote or demote a worker. Owner only. */
export function useSetWorkerRole() {
  const actor = useBackendActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: WorkerId; role: "worker" | "owner" }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setWorkerRole(input.id, input.role);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workers"] });
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/** Any worker's shifts. Owner only. */
export function useWorkerShifts(worker: WorkerId | null, sortBy: ShiftSort) {
  const actor = useBackendActor();
  return useQuery({
    queryKey: ["worker-shifts", worker, sortBy],
    queryFn: async (): Promise<ShiftView[]> => {
      if (!actor || !worker) return [];
      return actor.listWorkerShifts(worker, { from: null, to: null, sortBy });
    },
    enabled: !!actor && !!worker,
  });
}

/** The caller's own monthly report. */
export function useMyMonthlyReport(month: MonthKey) {
  const actor = useBackendActor();
  return useQuery({
    queryKey: ["reports", "mine", month],
    queryFn: async (): Promise<WorkerMonthlyReport | null> => {
      if (!actor) return null;
      return actor.getMyMonthlyReport(month);
    },
    enabled: !!actor,
  });
}

/** Any worker's monthly report. Owner only. */
export function useWorkerMonthlyReport(
  worker: WorkerId | null,
  month: MonthKey,
) {
  const actor = useBackendActor();
  return useQuery({
    queryKey: ["reports", "worker", worker, month],
    queryFn: async (): Promise<WorkerMonthlyReport | null> => {
      if (!actor || !worker) return null;
      return actor.getWorkerMonthlyReport(worker, month);
    },
    enabled: !!actor && !!worker,
  });
}

/** The owner's monthly report across all workers. */
export function useAllWorkersMonthlyReport(month: MonthKey) {
  const actor = useBackendActor();
  return useQuery({
    queryKey: ["reports", "all", month],
    queryFn: async (): Promise<AllWorkersMonthlyReport | null> => {
      if (!actor) return null;
      return actor.getAllWorkersMonthlyReport(month);
    },
    enabled: !!actor,
  });
}

/** Export a monthly report as CSV. Owner only. */
export function useExportMonthlyReport() {
  const actor = useBackendActor();
  return useMutation({
    mutationFn: async (month: MonthKey): Promise<ExportResult> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.exportMonthlyReport(month);
    },
  });
}

/** The month bounds for a report query, memoized. */
export function useMonthBounds(month: MonthKey) {
  return useMemo(() => monthBounds(month), [month]);
}

/** The 10-hour cap progress for a running shift, as a 0–1 fraction. */
export function useCapProgress(elapsed: bigint): number {
  return useMemo(() => capProgress(elapsed), [elapsed]);
}

/** True once a running shift is within one hour of the 10-hour cap. */
export function useApproachingCap(elapsed: bigint): boolean {
  return elapsed >= MAX_SHIFT_NS - 60n * 60n * NS_PER_SECOND;
}

/** True once a running shift has reached the 10-hour cap. */
export function useAtCap(elapsed: bigint): boolean {
  return elapsed >= MAX_SHIFT_NS;
}

/** Convert a local `datetime-local` input value to a backend timestamp. */
export function localInputToTimestamp(value: string): Timestamp | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateToTimestamp(date);
}

/** Convert a backend timestamp to a `datetime-local` input value. */
export function timestampToLocalInput(timestamp: Timestamp): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type { CrewClockBackend };
