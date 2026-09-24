import { OwnerWorkers } from "@/components/OwnerWorkers";
import { NS_PER_HOUR } from "@/lib/format";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeMonthlyReport, makeShift, makeWorkerSummary } from "./helpers";

const mockUseWorkers = vi.fn();
const mockSetRole = vi.fn();
const mockUseWorkerShifts = vi.fn();
const mockUseWorkerMonthlyReport = vi.fn();

vi.mock("@/hooks/use-shifts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/use-shifts")>();
  return {
    ...actual,
    useWorkers: () => mockUseWorkers(),
    useSetWorkerRole: () => ({ mutate: mockSetRole, isPending: false }),
    useWorkerShifts: (...args: unknown[]) => mockUseWorkerShifts(...args),
    useWorkerMonthlyReport: (...args: unknown[]) =>
      mockUseWorkerMonthlyReport(...args),
    useAddShiftNote: () => ({ mutate: vi.fn(), isPending: false }),
    useCorrectShift: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

beforeEach(() => {
  mockUseWorkers.mockReturnValue({
    data: [
      makeWorkerSummary({
        id: "worker-1",
        name: "Alex Rivera",
        email: "alex@crew.example",
        role: "worker",
        totalShifts: 2n,
        totalDurationNs: 12n * NS_PER_HOUR,
      }),
      makeWorkerSummary({
        id: "owner-1",
        name: "Owner",
        email: "owner@crew.example",
        role: "owner",
        totalShifts: 1n,
        totalDurationNs: 8n * NS_PER_HOUR,
      }),
    ],
    isLoading: false,
  });
  mockUseWorkerShifts.mockReturnValue({
    data: [makeShift({ id: 7n })],
    isLoading: false,
  });
  mockUseWorkerMonthlyReport.mockReturnValue({
    data: makeMonthlyReport(),
    isLoading: false,
  });
  mockSetRole.mockReset();
});

describe("OwnerWorkers", () => {
  it("lists every worker with their totals and last shift date", () => {
    render(<OwnerWorkers />);

    const list = screen.getByTestId("workers.list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(list).getByText("Alex Rivera")).toBeInTheDocument();
    expect(within(list).getByText("alex@crew.example")).toBeInTheDocument();
    expect(rows[0]).toHaveTextContent("12h");
    expect(rows[0]).toHaveTextContent("2 shifts");
  });

  it("shows an empty state when the crew has no workers", () => {
    mockUseWorkers.mockReturnValue({ data: [], isLoading: false });
    render(<OwnerWorkers />);
    expect(screen.getByTestId("workers.empty_state")).toBeInTheDocument();
  });

  it("promotes a worker to owner through the role control", async () => {
    const user = userEvent.setup();
    render(<OwnerWorkers />);

    await user.click(screen.getByTestId("workers.role_select.1"));
    await user.click(await screen.findByRole("option", { name: "Owner" }));

    expect(mockSetRole).toHaveBeenCalledWith({
      id: "worker-1",
      role: "owner",
    });
  });

  it("opens a worker's profile with their shift history and report", async () => {
    const user = userEvent.setup();
    render(<OwnerWorkers />);

    await user.click(screen.getByTestId("workers.open_button.1"));

    expect(screen.getByTestId("workers.detail_dialog")).toBeInTheDocument();
    expect(screen.getByTestId("workers.detail_shift_list")).toBeInTheDocument();
    expect(mockUseWorkerShifts).toHaveBeenCalledWith("worker-1", "dateDesc");
  });
});
