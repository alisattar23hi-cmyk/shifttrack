import { ShiftClock } from "@/components/ShiftClock";
import type { ShiftsState } from "@/hooks/use-shifts";
import { MAX_SHIFT_NS, NS_PER_HOUR } from "@/lib/format";
import { render, screen } from "@testing-library/react";
import { act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-09-15T09:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ShiftClock", () => {
  it("shows a ready state and enables Start when no shift is running", () => {
    render(<ShiftClock shifts={makeShifts()} />);

    expect(screen.getByTestId("clock.elapsed_readout")).toHaveTextContent(
      "00:00:00",
    );
    expect(screen.getByTestId("clock.start_button")).toBeEnabled();
    expect(screen.getByTestId("clock.end_button")).toBeDisabled();
    expect(screen.getByText("No shift running")).toBeInTheDocument();
  });

  it("starts a shift when Start is pressed", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const startShift = vi.fn();
    render(<ShiftClock shifts={makeShifts({ startShift })} />);

    await user.click(screen.getByTestId("clock.start_button"));
    expect(startShift).toHaveBeenCalledTimes(1);
  });

  it("counts elapsed time up in real time while a shift runs", () => {
    const startTime = BigInt(Date.now()) * 1_000_000n;
    render(<ShiftClock shifts={makeShifts({ activeStartTime: startTime })} />);

    expect(screen.getByTestId("clock.elapsed_readout")).toHaveTextContent(
      "00:00:00",
    );

    // `useElapsed` reads the wall clock via `nowTimestamp()` and updates state
    // from a `setInterval` callback, so the timer advance must be wrapped in
    // `act` for the new readout to be flushed to the DOM.
    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(screen.getByTestId("clock.elapsed_readout")).toHaveTextContent(
      "00:01:05",
    );
  });

  it("disables Start and enables End while a shift is running", () => {
    const startTime = BigInt(Date.now()) * 1_000_000n;
    render(<ShiftClock shifts={makeShifts({ activeStartTime: startTime })} />);

    expect(screen.getByTestId("clock.start_button")).toBeDisabled();
    expect(screen.getByTestId("clock.end_button")).toBeEnabled();
  });

  it("ends the shift when End is pressed", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const endShift = vi.fn();
    const startTime = BigInt(Date.now()) * 1_000_000n;
    render(
      <ShiftClock
        shifts={makeShifts({ activeStartTime: startTime, endShift })}
      />,
    );

    await user.click(screen.getByTestId("clock.end_button"));
    expect(endShift).toHaveBeenCalledTimes(1);
  });

  it("warns as the shift approaches the 10-hour cap", () => {
    const startTime =
      BigInt(Date.now()) * 1_000_000n -
      (MAX_SHIFT_NS - 30n * 60n * 1_000_000_000n);
    render(<ShiftClock shifts={makeShifts({ activeStartTime: startTime })} />);

    expect(screen.getByTestId("clock.cap_warning")).toBeInTheDocument();
    expect(screen.queryByTestId("clock.cap_reached")).not.toBeInTheDocument();
  });

  it("auto-stops and flags the shift once it reaches the 10-hour cap", () => {
    const endShift = vi.fn();
    const startTime = BigInt(Date.now()) * 1_000_000n - MAX_SHIFT_NS;
    render(
      <ShiftClock
        shifts={makeShifts({ activeStartTime: startTime, endShift })}
      />,
    );

    expect(screen.getByTestId("clock.cap_reached")).toBeInTheDocument();
    expect(endShift).toHaveBeenCalledTimes(1);
  });

  it("shows the pending sync count while offline actions are queued", () => {
    render(<ShiftClock shifts={makeShifts({ pendingCount: 2 })} />);
    expect(screen.getByTestId("clock.pending_sync")).toHaveTextContent(
      "2 actions waiting to sync",
    );
  });

  it("surfaces an action error", () => {
    render(
      <ShiftClock
        shifts={makeShifts({
          actionError: "Could not start the shift. Try again.",
        })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not start the shift. Try again.",
    );
  });

  it("shows the 10-hour cap label when idle", () => {
    render(<ShiftClock shifts={makeShifts()} />);
    expect(screen.getByText("10h continuous cap")).toBeInTheDocument();
    expect(NS_PER_HOUR).toBeGreaterThan(0n);
  });
});
