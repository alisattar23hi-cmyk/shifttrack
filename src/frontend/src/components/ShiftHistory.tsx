import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  type ShiftsState,
  localInputToTimestamp,
  timestampToLocalInput,
  useAddShiftNote,
  useCorrectShift,
} from "@/hooks/use-shifts";
import {
  dateToTimestamp,
  formatDate,
  formatDateTime,
  formatDuration,
  formatTime,
  notePreview,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShiftSort, ShiftView } from "@/types";
import {
  CalendarClock,
  MessageSquarePlus,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

interface ShiftHistoryProps {
  shifts: ShiftsState;
  isOwner: boolean;
}

/** The worker's own shift log with date filtering, sorting, and notes. */
export function ShiftHistory({ shifts, isOwner }: ShiftHistoryProps) {
  const [sortBy, setSortBy] = useState<ShiftSort>("dateDesc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    const fromTs = from ? dateToTimestamp(new Date(`${from}T00:00:00`)) : null;
    const toTs = to ? dateToTimestamp(new Date(`${to}T23:59:59`)) : null;
    const rows = shifts.shifts.filter((shift) => {
      if (fromTs !== null && shift.startTime < fromTs) return false;
      if (toTs !== null && shift.startTime > toTs) return false;
      return true;
    });
    return [...rows].sort((a, b) => compareShifts(a, b, sortBy));
  }, [from, shifts.shifts, sortBy, to]);

  return (
    <section data-ocid="history.section" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps">Shift log</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
            Your shifts
          </h2>
        </div>
        <p className="font-mono text-sm tabular-time text-muted-foreground">
          {filtered.length} record{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <Card className="rounded-2xl border border-border bg-card p-4 shadow-elevated">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="history-from" className="label-caps">
              From
            </Label>
            <Input
              id="history-from"
              type="date"
              data-ocid="history.from_input"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="history-to" className="label-caps">
              To
            </Label>
            <Input
              id="history-to"
              type="date"
              data-ocid="history.to_input"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="history-sort" className="label-caps">
              Sort by
            </Label>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as ShiftSort)}
            >
              <SelectTrigger
                id="history-sort"
                data-ocid="history.sort_select"
                className="w-full"
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
        </div>
        {from || to ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-ocid="history.clear_filter_button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="mt-3 rounded-full text-muted-foreground"
          >
            Clear date filter
          </Button>
        ) : null}
      </Card>

      {shifts.isLoading ? (
        <div data-ocid="history.loading_state" className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => `history-skeleton-${i}`).map(
            (id) => (
              <Card
                key={id}
                className="h-24 animate-pulse rounded-2xl border border-border bg-card"
              />
            ),
          )}
        </div>
      ) : filtered.length === 0 ? (
        <Card
          data-ocid="history.empty_state"
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
        >
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"
          >
            <CalendarClock className="size-6" />
          </span>
          <h3 className="font-display text-lg font-semibold">No shifts yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Start a shift from the Clock tab and it will appear here with its
            times, duration, and notes.
          </p>
        </Card>
      ) : (
        <ul data-ocid="history.list" className="space-y-3">
          {filtered.map((shift, index) => (
            <ShiftRow
              key={shift.id.toString()}
              shift={shift}
              index={index + 1}
              isOwner={isOwner}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function compareShifts(a: ShiftView, b: ShiftView, sortBy: ShiftSort): number {
  switch (sortBy) {
    case "dateAsc":
      return Number(a.startTime - b.startTime);
    case "durationDesc":
      return Number(b.durationNs - a.durationNs);
    case "durationAsc":
      return Number(a.durationNs - b.durationNs);
    default:
      return Number(b.startTime - a.startTime);
  }
}

interface ShiftRowProps {
  shift: ShiftView;
  index: number;
  isOwner: boolean;
}

function ShiftRow({ shift, index, isOwner }: ShiftRowProps) {
  const [noteText, setNoteText] = useState("");
  const [editing, setEditing] = useState(false);
  const [startInput, setStartInput] = useState(() =>
    timestampToLocalInput(shift.startTime),
  );
  const [endInput, setEndInput] = useState(() =>
    shift.endTime ? timestampToLocalInput(shift.endTime) : "",
  );
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const addNote = useAddShiftNote();
  const correct = useCorrectShift();

  const running = shift.endTime === null;
  const latestNote = shift.notes[shift.notes.length - 1];

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

  const submitCorrection = () => {
    setCorrectionError(null);
    const startTime = localInputToTimestamp(startInput);
    const endTime = endInput ? localInputToTimestamp(endInput) : null;
    if (startTime === null) {
      setCorrectionError("Enter a valid start time.");
      return;
    }
    if (endInput && endTime === null) {
      setCorrectionError("Enter a valid end time.");
      return;
    }
    if (endTime !== null && endTime <= startTime) {
      setCorrectionError("End time must be after the start time.");
      return;
    }
    correct.mutate(
      { id: shift.id, startTime, endTime },
      {
        onSuccess: (result) => {
          if (result.kind === "ok") {
            setEditing(false);
          } else if (result.kind === "invalidRange") {
            setCorrectionError("End time must be after the start time.");
          } else if (result.kind === "notAuthorized") {
            setCorrectionError("Only the owner can correct shift times.");
          } else {
            setCorrectionError("That shift could not be found.");
          }
        },
        onError: () => setCorrectionError("Could not save the correction."),
      },
    );
  };

  return (
    <li
      data-ocid={`history.item.${index}`}
      className="animate-fade-in-up"
      style={{ animationDelay: `${Math.min(index - 1, 8) * 60}ms` }}
    >
      <Card className="rounded-2xl border border-border bg-card p-4 shadow-elevated transition-smooth hover:shadow-elevated md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-base font-semibold tracking-tight">
              {formatDate(shift.startTime)}
            </p>
            <p className="mt-1 font-mono text-sm tabular-time text-muted-foreground">
              {formatTime(shift.startTime)} –{" "}
              {running ? "running" : formatTime(shift.endTime as bigint)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {shift.cappedAtLimit ? (
              <Badge
                variant="outline"
                className="rounded-full border-warning/50 bg-warning/10 text-warning"
              >
                Capped at 10h
              </Badge>
            ) : null}
            <span className="rounded-full bg-muted px-3 py-1 font-mono text-sm tabular-time">
              {formatDuration(shift.durationNs)}
            </span>
            {isOwner ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-ocid={`history.edit_button.${index}`}
                onClick={() => setEditing((value) => !value)}
                className="rounded-full text-accent transition-smooth hover:bg-accent/10 hover:text-accent"
              >
                <Pencil aria-hidden="true" className="size-3.5" />
                Correct
              </Button>
            ) : null}
          </div>
        </div>

        {editing && isOwner ? (
          <div className="mt-4 space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Owner correction
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`start-${shift.id}`} className="label-caps">
                  Start
                </Label>
                <Input
                  id={`start-${shift.id}`}
                  type="datetime-local"
                  data-ocid={`history.start_input.${index}`}
                  value={startInput}
                  onChange={(event) => setStartInput(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`end-${shift.id}`} className="label-caps">
                  End
                </Label>
                <Input
                  id={`end-${shift.id}`}
                  type="datetime-local"
                  data-ocid={`history.end_input.${index}`}
                  value={endInput}
                  onChange={(event) => setEndInput(event.target.value)}
                />
              </div>
            </div>
            {correctionError ? (
              <p
                data-ocid={`history.correction_error.${index}`}
                role="alert"
                className="text-sm text-destructive"
              >
                {correctionError}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                data-ocid={`history.save_button.${index}`}
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
                data-ocid={`history.cancel_button.${index}`}
                onClick={() => {
                  setEditing(false);
                  setCorrectionError(null);
                }}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {shift.notes.length > 0 ? (
            <ul className="space-y-2">
              {shift.notes.map((note) => (
                <li
                  key={note.id.toString()}
                  className="rounded-lg bg-muted/60 px-3 py-2"
                >
                  <p className="text-sm leading-relaxed">{note.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {note.authorName || "Worker"} ·{" "}
                    {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {latestNote
                ? notePreview(latestNote.text)
                : "No notes on this shift yet."}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Textarea
              data-ocid={`history.note_input.${index}`}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Add a note about this shift…"
              rows={2}
              className={cn("min-h-0 flex-1 resize-none")}
            />
            <Button
              type="button"
              data-ocid={`history.add_note_button.${index}`}
              onClick={submitNote}
              disabled={addNote.isPending || noteText.trim() === ""}
              className="h-auto shrink-0 rounded-full sm:self-end"
            >
              <MessageSquarePlus aria-hidden="true" className="size-4" />
              {addNote.isPending ? "Saving…" : "Add note"}
            </Button>
          </div>
        </div>
      </Card>
    </li>
  );
}
