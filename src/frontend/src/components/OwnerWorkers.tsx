import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  localInputToTimestamp,
  timestampToLocalInput,
  useAddShiftNote,
  useCorrectShift,
  useSetWorkerRole,
  useWorkerMonthlyReport,
  useWorkerShifts,
  useWorkers,
} from "@/hooks/use-shifts";
import {
  currentMonthKey,
  formatDate,
  formatDateTime,
  formatDuration,
  formatHours,
  formatMonthKey,
  formatTime,
  shortPrincipal,
} from "@/lib/format";
import type { ShiftSort, ShiftView, WorkerSummary } from "@/types";
import {
  MessageSquarePlus,
  Pencil,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";

/** The owner's crew roster with totals, role controls, and drill-in. */
export function OwnerWorkers() {
  const workers = useWorkers();
  const setRole = useSetWorkerRole();
  const [selected, setSelected] = useState<WorkerSummary | null>(null);

  return (
    <section data-ocid="workers.section" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps">Owner tools</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
            Your crew
          </h2>
        </div>
        <p className="font-mono text-sm tabular-time text-muted-foreground">
          {workers.data?.length ?? 0} worker
          {(workers.data?.length ?? 0) === 1 ? "" : "s"}
        </p>
      </div>

      {workers.isLoading ? (
        <div data-ocid="workers.loading_state" className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => `worker-skeleton-${i}`).map(
            (id) => (
              <Card
                key={id}
                className="h-20 animate-pulse rounded-2xl border border-border bg-card"
              />
            ),
          )}
        </div>
      ) : (workers.data?.length ?? 0) === 0 ? (
        <Card
          data-ocid="workers.empty_state"
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
        >
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"
          >
            <Users className="size-6" />
          </span>
          <h3 className="font-display text-lg font-semibold">No crew yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Workers appear here as soon as they sign in with their email.
          </p>
        </Card>
      ) : (
        <ul data-ocid="workers.list" className="space-y-3">
          {(workers.data ?? []).map((worker, index) => (
            <li
              key={worker.id}
              data-ocid={`workers.item.${index + 1}`}
              className="animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <Card className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-elevated">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-display text-base font-semibold tracking-tight">
                      {worker.name || shortPrincipal(worker.id)}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        worker.role === "owner"
                          ? "rounded-full border-accent/50 bg-accent/10 text-accent"
                          : "rounded-full border-border bg-muted text-muted-foreground"
                      }
                    >
                      {worker.role === "owner" ? (
                        <ShieldCheck aria-hidden="true" className="size-3" />
                      ) : (
                        <UserRound aria-hidden="true" className="size-3" />
                      )}
                      {worker.role === "owner" ? "Owner" : "Worker"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {worker.email || shortPrincipal(worker.id)}
                  </p>
                  <p className="mt-1 font-mono text-xs tabular-time text-muted-foreground">
                    {formatHours(worker.totalDurationNs)}h ·{" "}
                    {worker.totalShifts.toString()} shifts · last{" "}
                    {worker.lastShiftEnd
                      ? formatDate(worker.lastShiftEnd)
                      : "never"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={worker.role}
                    onValueChange={(value) =>
                      setRole.mutate({
                        id: worker.id,
                        role: value as "worker" | "owner",
                      })
                    }
                  >
                    <SelectTrigger
                      data-ocid={`workers.role_select.${index + 1}`}
                      aria-label={`Role for ${worker.name || worker.email}`}
                      className="w-32"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-ocid={`workers.open_button.${index + 1}`}
                    onClick={() => setSelected(worker)}
                    className="rounded-full"
                  >
                    View
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <WorkerDetail worker={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function WorkerDetail({
  worker,
  onClose,
}: {
  worker: WorkerSummary | null;
  onClose: () => void;
}) {
  const [sortBy, setSortBy] = useState<ShiftSort>("dateDesc");
  const month = currentMonthKey();
  const shifts = useWorkerShifts(worker?.id ?? null, sortBy);
  const report = useWorkerMonthlyReport(worker?.id ?? null, month);

  return (
    <Dialog open={!!worker} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-ocid="workers.detail_dialog"
        className="max-h-[85dvh] overflow-y-auto rounded-2xl border border-border bg-card sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold tracking-tight">
            {worker?.name || (worker ? shortPrincipal(worker.id) : "Worker")}
          </DialogTitle>
          <DialogDescription>
            {worker?.email || "Worker profile"} · full shift history and this
            month's report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="label-caps">Total hours</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-time">
                {formatHours(worker?.totalDurationNs ?? 0n)}h
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="label-caps">Shifts</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-time">
                {(worker?.totalShifts ?? 0n).toString()}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="label-caps">{formatMonthKey(month)}</p>
              <p className="mt-1 font-mono text-2xl font-bold tabular-time">
                {formatHours(report.data?.totalDurationNs ?? 0n)}h
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold tracking-tight">
              Shift history
            </h3>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as ShiftSort)}
            >
              <SelectTrigger
                data-ocid="workers.detail_sort_select"
                className="w-40"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateDesc">Newest first</SelectItem>
                <SelectItem value="dateAsc">Oldest first</SelectItem>
                <SelectItem value="durationDesc">Longest first</SelectItem>
                <SelectItem value="durationAsc">Shortest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shifts.isLoading ? (
            <p
              data-ocid="workers.detail_loading_state"
              className="text-sm text-muted-foreground"
            >
              Loading shifts…
            </p>
          ) : (shifts.data?.length ?? 0) === 0 ? (
            <p
              data-ocid="workers.detail_empty_state"
              className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground"
            >
              This worker has not logged any shifts yet.
            </p>
          ) : (
            <ul data-ocid="workers.detail_shift_list" className="space-y-2">
              {(shifts.data ?? []).map((shift, index) => (
                <OwnerShiftRow
                  key={shift.id.toString()}
                  shift={shift}
                  index={index + 1}
                />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A single shift row inside the owner's worker drill-in, with the owner's
 * correction and note controls for that worker's record.
 */
function OwnerShiftRow({ shift, index }: { shift: ShiftView; index: number }) {
  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [startInput, setStartInput] = useState(() =>
    timestampToLocalInput(shift.startTime),
  );
  const [endInput, setEndInput] = useState(() =>
    shift.endTime ? timestampToLocalInput(shift.endTime) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const correct = useCorrectShift();
  const addNote = useAddShiftNote();

  const submitCorrection = () => {
    setError(null);
    const startTime = localInputToTimestamp(startInput);
    const endTime = endInput ? localInputToTimestamp(endInput) : null;
    if (startTime === null) {
      setError("Enter a valid start time.");
      return;
    }
    if (endInput && endTime === null) {
      setError("Enter a valid end time.");
      return;
    }
    if (endTime !== null && endTime <= startTime) {
      setError("End time must be after the start time.");
      return;
    }
    correct.mutate(
      { id: shift.id, startTime, endTime },
      {
        onSuccess: (result) => {
          if (result.kind === "ok") {
            setEditing(false);
          } else if (result.kind === "invalidRange") {
            setError("End time must be after the start time.");
          } else if (result.kind === "notAuthorized") {
            setError("Only the owner can correct shift times.");
          } else {
            setError("That shift could not be found.");
          }
        },
        onError: () => setError("Could not save the correction."),
      },
    );
  };

  const submitNote = () => {
    const text = noteText.trim();
    if (!text) return;
    setNoteText("");
    addNote.mutate(
      { id: shift.id, text },
      {
        onError: () =>
          setNoteText((current) => (current === "" ? text : current)),
      },
    );
  };

  return (
    <li
      data-ocid={`workers.detail_shift_row.${index}`}
      className="rounded-xl border border-border bg-muted/30 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{formatDate(shift.startTime)}</p>
          <p className="font-mono text-xs tabular-time text-muted-foreground">
            {formatTime(shift.startTime)} –{" "}
            {shift.endTime ? formatTime(shift.endTime) : "running"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {shift.cappedAtLimit ? (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              Capped
            </span>
          ) : null}
          <span className="font-mono text-sm tabular-time">
            {formatDuration(shift.durationNs)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-ocid={`workers.detail_edit_button.${index}`}
            onClick={() => setEditing((value) => !value)}
            className="rounded-full text-accent transition-smooth hover:bg-accent/10 hover:text-accent"
          >
            <Pencil aria-hidden="true" className="size-3.5" />
            Correct
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`owner-start-${shift.id}`} className="label-caps">
                Start
              </Label>
              <Input
                id={`owner-start-${shift.id}`}
                type="datetime-local"
                data-ocid={`workers.detail_start_input.${index}`}
                value={startInput}
                onChange={(event) => setStartInput(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`owner-end-${shift.id}`} className="label-caps">
                End
              </Label>
              <Input
                id={`owner-end-${shift.id}`}
                type="datetime-local"
                data-ocid={`workers.detail_end_input.${index}`}
                value={endInput}
                onChange={(event) => setEndInput(event.target.value)}
              />
            </div>
          </div>
          {error ? (
            <p
              data-ocid={`workers.detail_correction_error.${index}`}
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              data-ocid={`workers.detail_save_button.${index}`}
              onClick={submitCorrection}
              disabled={correct.isPending}
              className="rounded-full"
            >
              {correct.isPending ? "Saving…" : "Save correction"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-ocid={`workers.detail_cancel_button.${index}`}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="rounded-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {shift.notes.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {shift.notes.map((note) => (
            <li
              key={note.id.toString()}
              className="rounded-lg bg-background/60 px-3 py-2"
            >
              <p className="text-sm leading-relaxed">{note.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {note.authorName || "Worker"} · {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Textarea
          data-ocid={`workers.detail_note_input.${index}`}
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Add a note to this shift…"
          rows={2}
          className="min-h-0 flex-1 resize-none"
        />
        <Button
          type="button"
          size="sm"
          data-ocid={`workers.detail_add_note_button.${index}`}
          onClick={submitNote}
          disabled={addNote.isPending || noteText.trim() === ""}
          className="h-auto shrink-0 rounded-full sm:self-end"
        >
          <MessageSquarePlus aria-hidden="true" className="size-4" />
          {addNote.isPending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </li>
  );
}
