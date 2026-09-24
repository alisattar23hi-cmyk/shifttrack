import { ShiftHistory } from "@/components/ShiftHistory";
import type { ShiftsState } from "@/hooks/use-shifts";
import { NS_PER_HOUR } from "@/lib/format";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeShift } from "./helpers";

const mockAddNote = vi.fn();
const mockCorrectShift = vi.fn();

vi.mock("@/hooks/use-shifts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/use-shifts")>();
  return {
    ...actual,
    useAddShiftNote: () => ({ mutate: mockAddNote, isPending: false }),
    useCorrectShift: () => ({ mutate: mockCorrectShift, isPending: false }),
  };
});

beforeEach(() => {
  mockAddNote.mockReset();
  mockCorrectShift.mockReset();
});

function makeShifts(overrides: Partial<ShiftsState> = {}): ShiftsState {
  return {
    activeShift: null,
    activeStartTime: null,
    shifts: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    startShift: vi.fn(),
    endShift: vi.fn(),
    isStarting: false,
    isEnding: false,
    actionError: null,
    clearActionError: vi.fn(),
    pendingCount: 0,
    isOnline: true,
    isSyncing: false,
    ...overrides,
  };
}

const older = makeShift({
  id: 1n,
  startTime:
    BigInt(new Date("2026-09-10T08:00:00.000Z").getTime()) * 1_000_000n,
  endTime: BigInt(new Date("2026-09-10T12:00:00.000Z").getTime()) * 1_000_000n,
  durationNs: 4n * NS_PER_HOUR,
});

const newer = makeShift({
  id: 2n,
  startTime:
    BigInt(new Date("2026-09-14T08:00:00.000Z").getTime()) * 1_000_000n,
  endTime: BigInt(new Date("2026-09-14T16:00:00.000Z").getTime()) * 1_000_000n,
  durationNs: 8n * NS_PER_HOUR,
});

describe("ShiftHistory", () => {
  it("shows an empty state when there are no shifts", () => {
    render(<ShiftHistory shifts={makeShifts()} isOwner={false} />);
    expect(screen.getByTestId("history.empty_state")).toBeInTheDocument();
  });

  it("lists shifts with date, times, and duration", () => {
    render(
      <ShiftHistory
        shifts={makeShifts({ shifts: [newer, older] })}
        isOwner={false}
      />,
    );

    const list = screen.getByTestId("history.list");
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("8h");
    expect(rows[1]).toHaveTextContent("4h");
  });

  it("sorts by duration when the sort option changes", async () => {
    const user = userEvent.setup();
    render(
      <ShiftHistory
        shifts={makeShifts({ shifts: [newer, older] })}
        isOwner={false}
      />,
    );

    await user.click(screen.getByTestId("history.sort_select"));
    await user.click(
      await screen.findByRole("option", { name: "Shortest first" }),
    );

    const rows = within(screen.getByTestId("history.list")).getAllByRole(
      "listitem",
    );
    expect(rows[0]).toHaveTextContent("4h");
  });

  it("filters shifts by date range and clears the filter", async () => {
    const user = userEvent.setup();
    render(
      <ShiftHistory
        shifts={makeShifts({ shifts: [newer, older] })}
        isOwner={false}
      />,
    );

    const from = screen.getByTestId("history.from_input");
    await user.type(from, "2026-09-12");

    const rows = within(screen.getByTestId("history.list")).getAllByRole(
      "listitem",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("8h");

    await user.click(screen.getByTestId("history.clear_filter_button"));
    expect(
      within(screen.getByTestId("history.list")).getAllByRole("listitem"),
    ).toHaveLength(2);
  });

  it("hides the owner correction control from a worker", () => {
    render(
      <ShiftHistory shifts={makeShifts({ shifts: [newer] })} isOwner={false} />,
    );
    expect(
      screen.queryByTestId("history.edit_button.1"),
    ).not.toBeInTheDocument();
  });

  it("shows the owner correction control to the owner", () => {
    render(<ShiftHistory shifts={makeShifts({ shifts: [newer] })} isOwner />);
    expect(screen.getByTestId("history.edit_button.1")).toBeInTheDocument();
  });

  it("renders existing notes with author and timestamp", () => {
    const noted = makeShift({
      id: 3n,
      notes: [
        {
          id: 1n,
          author: "worker-1",
          authorName: "Alex Rivera",
          text: "Handover complete",
          createdAt:
            BigInt(new Date("2026-09-14T16:05:00.000Z").getTime()) * 1_000_000n,
        },
      ],
    });
    render(
      <ShiftHistory shifts={makeShifts({ shifts: [noted] })} isOwner={false} />,
    );

    expect(screen.getByText("Handover complete")).toBeInTheDocument();
    expect(screen.getByText(/Alex Rivera/)).toBeInTheDocument();
  });

  it("lets a worker add a note to their own shift", async () => {
    const user = userEvent.setup();
    render(
      <ShiftHistory shifts={makeShifts({ shifts: [newer] })} isOwner={false} />,
    );

    await user.type(
      screen.getByTestId("history.note_input.1"),
      "Handover complete",
    );
    await user.click(screen.getByTestId("history.add_note_button.1"));

    expect(mockAddNote).toHaveBeenCalledWith(
      { id: 2n, text: "Handover complete" },
      expect.anything(),
    );
  });

  it("does not submit an empty note", async () => {
    const user = userEvent.setup();
    render(
      <ShiftHistory shifts={makeShifts({ shifts: [newer] })} isOwner={false} />,
    );

    await user.click(screen.getByTestId("history.add_note_button.1"));
    expect(mockAddNote).not.toHaveBeenCalled();
  });

  it("lets the owner correct a shift's times", async () => {
    const user = userEvent.setup();
    render(<ShiftHistory shifts={makeShifts({ shifts: [newer] })} isOwner />);

    await user.click(screen.getByTestId("history.edit_button.1"));
    await user.click(screen.getByTestId("history.save_button.1"));

    expect(mockCorrectShift).toHaveBeenCalledTimes(1);
    const [input] = mockCorrectShift.mock.calls[0] ?? [];
    expect(input).toMatchObject({ id: 2n });
    expect(input.startTime).toBe(newer.startTime);
    expect(input.endTime).toBe(newer.endTime);
  });

  it("rejects an end time before the start time without calling the backend", async () => {
    const user = userEvent.setup();
    render(<ShiftHistory shifts={makeShifts({ shifts: [newer] })} isOwner />);

    await user.click(screen.getByTestId("history.edit_button.1"));
    const end = screen.getByTestId("history.end_input.1");
    await user.clear(end);
    await user.type(end, "2026-09-14T07:00");
    await user.click(screen.getByTestId("history.save_button.1"));

    expect(mockCorrectShift).not.toHaveBeenCalled();
    expect(screen.getByTestId("history.correction_error.1")).toHaveTextContent(
      "End time must be after the start time.",
    );
  });

  it("flags a shift that was capped at 10 hours", () => {
    const capped = makeShift({
      id: 4n,
      cappedAtLimit: true,
      durationNs: 10n * NS_PER_HOUR,
    });
    render(
      <ShiftHistory
        shifts={makeShifts({ shifts: [capped] })}
        isOwner={false}
      />,
    );
    expect(screen.getByText("Capped at 10h")).toBeInTheDocument();
  });
});
