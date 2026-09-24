import { MonthlyReport } from "@/components/MonthlyReport";
import { NS_PER_HOUR } from "@/lib/format";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAllWorkersReport, makeMonthlyReport } from "./helpers";

const mockUseMyMonthlyReport = vi.fn();
const mockUseAllWorkersMonthlyReport = vi.fn();
const mockUseExportMonthlyReport = vi.fn();

vi.mock("@/hooks/use-shifts", () => ({
  useMyMonthlyReport: (...args: unknown[]) => mockUseMyMonthlyReport(...args),
  useAllWorkersMonthlyReport: (...args: unknown[]) =>
    mockUseAllWorkersMonthlyReport(...args),
  useExportMonthlyReport: (...args: unknown[]) =>
    mockUseExportMonthlyReport(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockUseMyMonthlyReport.mockReturnValue({
    data: makeMonthlyReport(),
    isLoading: false,
  });
  mockUseAllWorkersMonthlyReport.mockReturnValue({
    data: makeAllWorkersReport(),
    isLoading: false,
  });
  mockUseExportMonthlyReport.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

describe("MonthlyReport", () => {
  it("shows the worker's own totals and per-shift breakdown", () => {
    render(<MonthlyReport isOwner={false} />, { wrapper });

    expect(screen.getByTestId("reports.total_hours")).toHaveTextContent("8h");
    expect(screen.getByTestId("reports.shift_count")).toHaveTextContent("1");
    expect(screen.getByTestId("reports.average_length")).toHaveTextContent(
      "8h",
    );
    expect(screen.getByTestId("reports.shift_list")).toBeInTheDocument();
  });

  it("shows an empty state when the month has no shifts", () => {
    mockUseMyMonthlyReport.mockReturnValue({
      data: makeMonthlyReport({
        shiftCount: 0n,
        totalDurationNs: 0n,
        shifts: [],
      }),
      isLoading: false,
    });
    render(<MonthlyReport isOwner={false} />, { wrapper });
    expect(screen.getByTestId("reports.empty_state")).toBeInTheDocument();
  });

  it("hides owner-only controls from a worker", () => {
    render(<MonthlyReport isOwner={false} />, { wrapper });
    expect(screen.queryByTestId("reports.all_tab")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("reports.export_button"),
    ).not.toBeInTheDocument();
  });

  it("lets the owner switch to the all-workers report", async () => {
    const user = userEvent.setup();
    render(<MonthlyReport isOwner />, { wrapper });

    await user.click(screen.getByTestId("reports.all_tab"));

    expect(screen.getByTestId("reports.all_total_hours")).toHaveTextContent(
      "8h",
    );
    expect(screen.getByTestId("reports.all_worker_count")).toHaveTextContent(
      "1",
    );
    const workerList = screen.getByTestId("reports.worker_list");
    expect(within(workerList).getByText("Alex Rivera")).toBeInTheDocument();
  });

  it("moves to the previous month", async () => {
    const user = userEvent.setup();
    render(<MonthlyReport isOwner={false} />, { wrapper });

    const before = mockUseMyMonthlyReport.mock.calls.at(-1)?.[0];
    await user.click(screen.getByTestId("reports.prev_month_button"));
    const after = mockUseMyMonthlyReport.mock.calls.at(-1)?.[0];

    expect(after).not.toBe(before);
  });

  it("exports the report as CSV for the owner", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseExportMonthlyReport.mockReturnValue({ mutate, isPending: false });
    render(<MonthlyReport isOwner />, { wrapper });

    await user.click(screen.getByTestId("reports.export_button"));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("renders a capped shift row", () => {
    mockUseMyMonthlyReport.mockReturnValue({
      data: makeMonthlyReport({
        shifts: [
          {
            id: 9n,
            startTime: 0n,
            endTime: 10n * NS_PER_HOUR,
            durationNs: 10n * NS_PER_HOUR,
            cappedAtLimit: true,
            noteCount: 0n,
          },
        ],
      }),
      isLoading: false,
    });
    render(<MonthlyReport isOwner={false} />, { wrapper });
    expect(screen.getByText("Capped")).toBeInTheDocument();
  });
});
