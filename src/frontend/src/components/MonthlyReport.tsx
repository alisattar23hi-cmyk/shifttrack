import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAllWorkersMonthlyReport,
  useExportMonthlyReport,
  useMyMonthlyReport,
} from "@/hooks/use-shifts";
import {
  currentMonthKey,
  formatDate,
  formatDuration,
  formatHours,
  formatMonthKey,
  formatTime,
  shiftMonthKey,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileBarChart,
} from "lucide-react";
import { useMemo, useState } from "react";

interface MonthlyReportProps {
  isOwner: boolean;
}

/** Monthly totals: the worker's own report, plus the all-workers view for owners. */
export function MonthlyReport({ isOwner }: MonthlyReportProps) {
  const [month, setMonth] = useState(currentMonthKey);
  const [scope, setScope] = useState<"mine" | "all">("mine");

  const mine = useMyMonthlyReport(month);
  const all = useAllWorkersMonthlyReport(month);
  const exportReport = useExportMonthlyReport();

  const showAll = isOwner && scope === "all";
  const report = showAll ? null : (mine.data ?? null);
  const allReport = showAll ? (all.data ?? null) : null;
  const isLoading = showAll ? all.isLoading : mine.isLoading;

  const monthOptions = useMemo(() => {
    const base = currentMonthKey();
    return Array.from({ length: 12 }, (_, i) => shiftMonthKey(base, -i));
  }, []);

  const handleExport = () => {
    exportReport.mutate(month, {
      onSuccess: (result) => {
        if (result.kind !== "ok") return;
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `crewclock-report-${month}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
    });
  };

  return (
    <section data-ocid="reports.section" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps">Monthly report</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">
            {formatMonthKey(month)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-ocid="reports.prev_month_button"
            aria-label="Previous month"
            onClick={() => setMonth((value) => shiftMonthKey(value, -1))}
            className="rounded-full"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Button>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger data-ocid="reports.month_select" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {formatMonthKey(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            data-ocid="reports.next_month_button"
            aria-label="Next month"
            onClick={() => setMonth((value) => shiftMonthKey(value, 1))}
            className="rounded-full"
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      {isOwner ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={scope === "mine" ? "default" : "outline"}
            size="sm"
            data-ocid="reports.mine_tab"
            onClick={() => setScope("mine")}
            className="rounded-full"
          >
            My report
          </Button>
          <Button
            type="button"
            variant={scope === "all" ? "default" : "outline"}
            size="sm"
            data-ocid="reports.all_tab"
            onClick={() => setScope("all")}
            className="rounded-full"
          >
            All workers
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="reports.export_button"
            onClick={handleExport}
            disabled={exportReport.isPending}
            className="ml-auto rounded-full border-accent/50 text-accent transition-smooth hover:bg-accent/10 hover:text-accent"
          >
            <Download aria-hidden="true" className="size-4" />
            {exportReport.isPending ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div
          data-ocid="reports.loading_state"
          className="grid gap-3 sm:grid-cols-3"
        >
          {Array.from({ length: 3 }, (_, i) => `report-skeleton-${i}`).map(
            (id) => (
              <Card
                key={id}
                className="h-28 animate-pulse rounded-2xl border border-border bg-card"
              />
            ),
          )}
        </div>
      ) : showAll ? (
        <AllWorkersView report={allReport} />
      ) : (
        <MyReportView report={report} />
      )}
    </section>
  );
}

function MyReportView({
  report,
}: {
  report: import("@/types").WorkerMonthlyReport | null;
}) {
  if (!report || report.shiftCount === 0n) {
    return (
      <Card
        data-ocid="reports.empty_state"
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
      >
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"
        >
          <FileBarChart className="size-6" />
        </span>
        <h3 className="font-display text-lg font-semibold">
          No hours this month
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Shifts you complete in this month will roll up here automatically.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          ocid="reports.total_hours"
          label="Total hours"
          value={`${formatHours(report.totalDurationNs)}h`}
        />
        <StatCard
          ocid="reports.shift_count"
          label="Shifts"
          value={report.shiftCount.toString()}
        />
        <StatCard
          ocid="reports.average_length"
          label="Average shift"
          value={formatDuration(report.averageDurationNs)}
        />
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-display text-base font-semibold tracking-tight">
            Per-shift breakdown
          </h3>
        </div>
        <ul data-ocid="reports.shift_list" className="divide-y divide-border">
          {report.shifts.map((row, index) => (
            <li
              key={row.id.toString()}
              data-ocid={`reports.shift_row.${index + 1}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {formatDate(row.startTime)}
                </p>
                <p className="font-mono text-xs tabular-time text-muted-foreground">
                  {formatTime(row.startTime)} –{" "}
                  {row.endTime ? formatTime(row.endTime) : "running"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {row.cappedAtLimit ? (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    Capped
                  </span>
                ) : null}
                <span className="font-mono text-sm tabular-time">
                  {formatDuration(row.durationNs)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function AllWorkersView({
  report,
}: {
  report: import("@/types").AllWorkersMonthlyReport | null;
}) {
  if (!report || report.workerCount === 0n) {
    return (
      <Card
        data-ocid="reports.empty_state"
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center"
      >
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground"
        >
          <FileBarChart className="size-6" />
        </span>
        <h3 className="font-display text-lg font-semibold">
          No crew hours yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Once your crew logs shifts this month, their totals appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          ocid="reports.all_total_hours"
          label="Crew hours"
          value={`${formatHours(report.totalDurationNs)}h`}
        />
        <StatCard
          ocid="reports.all_shift_count"
          label="Shifts"
          value={report.shiftCount.toString()}
        />
        <StatCard
          ocid="reports.all_worker_count"
          label="Workers"
          value={report.workerCount.toString()}
        />
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-display text-base font-semibold tracking-tight">
            Per-worker totals
          </h3>
        </div>
        <ul data-ocid="reports.worker_list" className="divide-y divide-border">
          {report.workers.map((worker, index) => (
            <li
              key={worker.worker}
              data-ocid={`reports.worker_row.${index + 1}`}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {worker.workerName || "Worker"}
                </p>
                <p className="font-mono text-xs tabular-time text-muted-foreground">
                  {worker.shiftCount.toString()} shifts · avg{" "}
                  {formatDuration(worker.averageDurationNs)}
                </p>
              </div>
              <span className="font-mono text-sm tabular-time">
                {formatHours(worker.totalDurationNs)}h
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  ocid,
}: {
  label: string;
  value: string;
  ocid: string;
}) {
  return (
    <Card
      data-ocid={ocid}
      className="rounded-2xl border border-border bg-card p-4 shadow-elevated"
    >
      <p className="label-caps">{label}</p>
      <p className={cn("mt-2 font-mono text-3xl font-bold tabular-time")}>
        {value}
      </p>
    </Card>
  );
}
