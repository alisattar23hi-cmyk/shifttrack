import { useShifts } from "@/hooks/use-shifts";
import { readQueue } from "@/lib/offline-queue";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type MockBackend, createMockBackend } from "./helpers";

let mockActor: MockBackend | null = null;
let mockIsOnline = true;

vi.mock("@/hooks/use-auth", () => ({
  useBackendActor: () => mockActor,
}));

vi.mock("@/hooks/use-online-status", () => ({
  useOnlineStatus: () => mockIsOnline,
}));

/** A tiny harness that exposes the hook's actions and observable state. */
function Harness() {
  const shifts = useShifts();
  return (
    <div>
      <span data-ocid="online">{shifts.isOnline ? "online" : "offline"}</span>
      <span data-ocid="pending">{shifts.pendingCount}</span>
      <span data-ocid="active">
        {shifts.activeStartTime === null ? "none" : "running"}
      </span>
      <button type="button" data-ocid="start" onClick={shifts.startShift}>
        start
      </button>
      <button type="button" data-ocid="end" onClick={shifts.endShift}>
        end
      </button>
    </div>
  );
}

function renderHarness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mockActor = createMockBackend();
  mockIsOnline = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useShifts offline queue", () => {
  it("queues a start locally while offline and keeps the timer running", async () => {
    const user = userEvent.setup();
    mockIsOnline = false;
    renderHarness();

    expect(screen.getByTestId("online")).toHaveTextContent("offline");

    await user.click(screen.getByTestId("start"));

    expect(screen.getByTestId("active")).toHaveTextContent("running");
    expect(screen.getByTestId("pending")).toHaveTextContent("1");
    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]?.kind).toBe("start");
    // The backend was never called while offline.
    expect(mockActor?.startShift).not.toHaveBeenCalled();
  });

  it("drains the queued start to the backend once connectivity returns", async () => {
    const user = userEvent.setup();
    mockIsOnline = false;
    const { rerender } = renderHarness();

    await user.click(screen.getByTestId("start"));
    expect(readQueue()).toHaveLength(1);

    // Reconnect: the hook's drain effect should replay the queued action.
    mockIsOnline = true;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await act(async () => {
      rerender(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
    });

    await vi.waitFor(() => {
      expect(mockActor?.startShift).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(readQueue()).toHaveLength(0);
    });
    expect(screen.getByTestId("pending")).toHaveTextContent("0");
  });

  it("queues an end locally while offline", async () => {
    const user = userEvent.setup();
    mockIsOnline = false;
    renderHarness();

    await user.click(screen.getByTestId("end"));

    expect(readQueue()).toHaveLength(1);
    expect(readQueue()[0]?.kind).toBe("end");
    expect(mockActor?.endShift).not.toHaveBeenCalled();
  });
});
