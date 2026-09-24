import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type ShiftsState,
  useApproachingCap,
  useAtCap,
  useCapProgress,
  useElapsed,
} from "@/hooks/use-shifts";
import {
  MAX_SHIFT_NS,
  formatDuration,
  formatElapsed,
  formatLongDate,
  formatTime,
  nowTimestamp,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, Play, Square } from "lucide-react";
import { useEffect, useRef } from "react";

interface ShiftClockProps {
  shifts: ShiftsState;
}

/**
 * The hero: a live elapsed-time readout on a recessed plate, ringed by the
 * 10-hour cap arc, with the two unmissable shift actions beneath it.
 */
export function ShiftClock({ shifts }: ShiftClockProps) {
  const startTime = shifts.activeStartTime;
  const elapsed = useElapsed(startTime);
  const progress = useCapProgress(elapsed);
  const approaching = useApproachingCap(elapsed);
  const atCap = useAtCap(elapsed);
  const autoEndedRef = useRef(false);
  const { endShift } = shifts;

  const running = startTime !== null;
  const remaining = MAX_SHIFT_NS - elapsed;

  // Auto-stop the shift once it reaches the 10-hour continuous limit. The
  // backend applies the same cap, so the record is flagged either way.
  useEffect(() => {
    if (!running) {
      autoEndedRef.current = false;
      return;
    }
    if (!atCap || autoEndedRef.current) return;
    autoEndedRef.current = true;
    endShift();
  }, [atCap, endShift, running]);

  return (
    <section data-ocid="clock.section" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps">Today</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight md:text-3xl">
            {formatLongDate(nowTimestamp())}
          </h1>
        </div>
        <p className="font-mono text-sm tabular-time text-muted-foreground">
          {running && startTime
            ? `Started ${formatTime(startTime)}`
            : "No shift running"}
        </p>
      </div>

      <Card
        data-ocid="clock.timer_plate"
        className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-inset-soft md:p-10"
      >
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "relative grid size-2.5 place-items-center rounded-full",
                running ? "bg-primary" : "bg-muted-foreground/40",
              )}
            >
              {running ? (
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/60" />
              ) : null}
            </span>
            <span className="label-caps">
              {running ? "Live elapsed time" : "Ready to start"}
            </span>
          </div>

          <div className="relative grid place-items-center">
            <CapArc progress={progress} atCap={atCap} />
            <div className="relative z-10 flex flex-col items-center px-6">
              <p
                data-ocid="clock.elapsed_readout"
                className={cn(
                  "font-mono text-5xl font-bold leading-none tracking-tight tabular-time md:text-8xl",
                  atCap
                    ? "text-destructive"
                    : approaching
                      ? "text-warning"
                      : "text-foreground",
                )}
              >
                {formatElapsed(elapsed)}
              </p>
              <p className="mt-3 font-mono text-xs tabular-time text-muted-foreground">
                {running
                  ? `${formatDuration(elapsed)} of 10h cap`
                  : "10h continuous cap"}
              </p>
            </div>
          </div>

          {running && approaching && !atCap ? (
            <output
              data-ocid="clock.cap_warning"
              className="flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3.5 py-1.5 text-sm font-medium text-warning"
            >
              <AlertTriangle aria-hidden="true" className="size-4" />
              {formatDuration(remaining)} left before the 10-hour cap
            </output>
          ) : null}

          {atCap ? (
            <output
              data-ocid="clock.cap_reached"
              className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3.5 py-1.5 text-sm font-medium text-destructive"
            >
              <AlertTriangle aria-hidden="true" className="size-4" />
              Shift reached the 10-hour cap — stopping and saving your record
            </output>
          ) : null}

          <div className="grid w-full max-w-md gap-3">
            <Button
              type="button"
              data-ocid="clock.start_button"
              onClick={shifts.startShift}
              disabled={running || shifts.isStarting}
              className="h-16 w-full rounded-full bg-gradient-primary text-lg font-semibold text-primary-foreground shadow-elevated transition-smooth hover:opacity-95 active:scale-[0.98] disabled:opacity-40"
            >
              <Play aria-hidden="true" className="size-5" />
              {shifts.isStarting ? "Starting…" : "Start Shift"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-ocid="clock.end_button"
              onClick={shifts.endShift}
              disabled={!running || shifts.isEnding}
              className="h-16 w-full rounded-full text-lg font-semibold shadow-elevated transition-smooth active:scale-[0.98] disabled:opacity-40"
            >
              <Square aria-hidden="true" className="size-5" />
              {shifts.isEnding ? "Ending…" : "End Shift"}
            </Button>
          </div>

          {shifts.actionError ? (
            <p
              data-ocid="clock.error_state"
              role="alert"
              className="text-sm text-destructive"
            >
              {shifts.actionError}
            </p>
          ) : null}

          {shifts.pendingCount > 0 ? (
            <p data-ocid="clock.pending_sync" className="text-xs text-warning">
              {shifts.pendingCount} action
              {shifts.pendingCount === 1 ? "" : "s"} waiting to sync
            </p>
          ) : null}
        </div>
      </Card>
    </section>
  );
}

/** The signature 10-hour cap arc wrapping the timer plate. */
function CapArc({ progress, atCap }: { progress: number; atCap: boolean }) {
  const radius = 132;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;
  const stroke = atCap
    ? "var(--destructive)"
    : progress >= 0.8
      ? "var(--warning)"
      : "var(--primary)";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 300"
      className="absolute size-[17rem] -rotate-90 md:size-[21rem]"
    >
      <circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth="6"
      />
      <circle
        cx="150"
        cy="150"
        r={radius}
        fill="none"
        stroke={stroke}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        className="transition-[stroke-dasharray,stroke] duration-500 ease-out"
      />
    </svg>
  );
}
