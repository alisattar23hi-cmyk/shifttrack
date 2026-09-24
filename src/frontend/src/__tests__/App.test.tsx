import App from "@/App";
import type { AuthState } from "@/hooks/use-auth";
import type { ShiftsState } from "@/hooks/use-shifts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeShift } from "./helpers";

const mockUseAuth = vi.fn();
const mockUseShifts = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
  // `use-shifts` imports this from the same module; the mock must expose it or
  // the import resolves to undefined and the hook throws.
  useBackendActor: () => null,
}));

vi.mock("@/hooks/use-shifts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/use-shifts")>();
  return {
    ...actual,
    useShifts: () => mockUseShifts(),
  };
});

// The reports and owner tabs use the real query hooks from `use-shifts`, so
// every render needs a QueryClient in context.
function renderApp(ui: ReactElement = <App />) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

function makeAuth(overrides: Partial<AuthState> = {}): AuthState {
  return {
    isAuthenticated: true,
    isInitializing: false,
    isLoggingIn: false,
    profile: {
      id: "worker-1",
      email: "alex@crew.example",
      name: "Alex Rivera",
      role: "worker",
      createdAt: 0n,
    },
    role: "worker",
    isOwner: false,
    isProfileLoading: false,
    needsProfile: false,
    isRegistering: false,
    registerError: null,
    registerProfile: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  };
}

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
  mockUseAuth.mockReturnValue(makeAuth());
  mockUseShifts.mockReturnValue(makeShifts());
});

describe("App", () => {
  it("renders the sign-in gate when unauthenticated", () => {
    mockUseAuth.mockReturnValue(
      makeAuth({ isAuthenticated: false, profile: null, role: null }),
    );
    renderApp();
    expect(screen.getByTestId("signin.page")).toBeInTheDocument();
  });

  it("renders the profile setup step when the account has no profile", () => {
    mockUseAuth.mockReturnValue(
      makeAuth({ profile: null, role: null, needsProfile: true }),
    );
    renderApp();
    expect(screen.getByTestId("profile_setup.page")).toBeInTheDocument();
  });

  it("renders the clock tab for a signed-in worker", () => {
    renderApp();
    expect(screen.getByTestId("clock.section")).toBeInTheDocument();
    expect(screen.getByTestId("app.tabs")).toBeInTheDocument();
    expect(screen.getByTestId("header.role_badge")).toHaveTextContent("Worker");
  });

  it("shows a loading state while auth is still initializing", () => {
    mockUseAuth.mockReturnValue(
      makeAuth({ isInitializing: true, isAuthenticated: false, profile: null }),
    );
    renderApp();
    expect(screen.getByTestId("app.loading_state")).toBeInTheDocument();
    expect(screen.queryByTestId("signin.page")).not.toBeInTheDocument();
  });

  it("shows a loading state when the profile has not resolved yet", () => {
    mockUseAuth.mockReturnValue(
      makeAuth({ profile: null, role: null, needsProfile: false }),
    );
    renderApp();
    expect(screen.getByTestId("app.loading_state")).toBeInTheDocument();
  });

  it("passes the signed-in email and role through to the header", () => {
    mockUseAuth.mockReturnValue(
      makeAuth({
        role: "owner",
        isOwner: true,
        profile: {
          id: "owner-1",
          email: "owner@crew.example",
          name: "Owner",
          role: "owner",
          createdAt: 0n,
        },
      }),
    );
    renderApp();
    expect(screen.getByText("owner@crew.example")).toBeInTheDocument();
    expect(screen.getByTestId("header.role_badge")).toHaveTextContent("Owner");
  });

  it("navigates between clock, history, and reports tabs", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByTestId("app.history.tab"));
    expect(screen.getByTestId("history.section")).toBeInTheDocument();

    await user.click(screen.getByTestId("app.reports.tab"));
    expect(screen.getByTestId("reports.section")).toBeInTheDocument();

    await user.click(screen.getByTestId("app.clock.tab"));
    expect(screen.getByTestId("clock.section")).toBeInTheDocument();
  });

  it("hides owner tools from a worker", () => {
    renderApp();
    expect(screen.queryByTestId("workers.section")).not.toBeInTheDocument();
  });

  it("shows owner tools to the owner", () => {
    mockUseAuth.mockReturnValue(
      makeAuth({
        role: "owner",
        isOwner: true,
        profile: {
          id: "owner-1",
          email: "owner@crew.example",
          name: "Owner",
          role: "owner",
          createdAt: 0n,
        },
      }),
    );
    renderApp();
    expect(screen.getByTestId("workers.section")).toBeInTheDocument();
    expect(screen.getByTestId("header.role_badge")).toHaveTextContent("Owner");
  });

  it("shows a running shift's live timer on the clock tab", () => {
    const startTime = BigInt(Date.now()) * 1_000_000n;
    mockUseShifts.mockReturnValue(
      makeShifts({
        activeStartTime: startTime,
        activeShift: makeShift({ endTime: null, durationNs: 0n }),
      }),
    );
    renderApp();
    expect(screen.getByTestId("clock.elapsed_readout")).toHaveTextContent(
      "00:00:00",
    );
    expect(screen.getByTestId("clock.end_button")).toBeEnabled();
  });

  it("shows the offline banner when the device is offline", () => {
    mockUseShifts.mockReturnValue(makeShifts({ isOnline: false }));
    renderApp();
    expect(screen.getByTestId("header.offline_banner")).toBeInTheDocument();
  });
});
