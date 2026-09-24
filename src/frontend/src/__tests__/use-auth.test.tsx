import { useAuth } from "@/hooks/use-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type MockBackend, createMockBackend, makeWorker } from "./helpers";

let mockActor: MockBackend | null = null;
let mockIsAuthenticated = true;

vi.mock("@/backend", () => ({
  createActor: vi.fn(),
}));

vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: mockActor }),
  useInternetIdentity: () => ({
    identity: { getPrincipal: () => ({ toText: () => "principal-1" }) },
    login: vi.fn(),
    clear: vi.fn(),
    isAuthenticated: mockIsAuthenticated,
    isInitializing: false,
    isLoggingIn: false,
    loginError: undefined,
  }),
}));

/** A harness exposing the resolved owner signal and role from `useAuth`. */
function Harness() {
  const auth = useAuth();
  return (
    <div>
      <span data-ocid="owner">{auth.isOwner ? "owner" : "not-owner"}</span>
      <span data-ocid="role">{auth.role ?? "none"}</span>
      <span data-ocid="needs-profile">
        {auth.needsProfile ? "needs-profile" : "has-profile"}
      </span>
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
  mockIsAuthenticated = true;
  mockActor = createMockBackend();
});

describe("useAuth owner signal", () => {
  it("treats the access-control admin flag as owner even when the profile role lags", async () => {
    // The first account is admin before its stored profile role updates, so the
    // admin flag must win over a stale `worker` profile role.
    mockActor = createMockBackend({
      profile: makeWorker({ role: "worker" }),
      isCallerAdmin: true,
    });
    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("role")).toHaveTextContent("owner"),
    );
    expect(screen.getByTestId("owner")).toHaveTextContent("owner");
  });

  it("falls back to the profile role when the admin flag is false", async () => {
    mockActor = createMockBackend({
      profile: makeWorker({ role: "owner" }),
      isCallerAdmin: false,
    });
    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("role")).toHaveTextContent("owner"),
    );
    expect(screen.getByTestId("owner")).toHaveTextContent("owner");
  });

  it("reports a plain worker when neither the admin flag nor the profile role is owner", async () => {
    mockActor = createMockBackend({
      profile: makeWorker({ role: "worker" }),
      isCallerAdmin: false,
    });
    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("role")).toHaveTextContent("worker"),
    );
    expect(screen.getByTestId("owner")).toHaveTextContent("not-owner");
  });

  it("asks the backend for the caller's admin flag", async () => {
    mockActor = createMockBackend({ isCallerAdmin: true });
    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("owner")).toHaveTextContent("owner"),
    );
    expect(mockActor?.isCallerAdmin).toHaveBeenCalled();
  });

  it("needs a profile when the account has none yet", async () => {
    mockActor = createMockBackend({ profile: null });
    renderHarness();

    await waitFor(() =>
      expect(screen.getByTestId("needs-profile")).toHaveTextContent(
        "needs-profile",
      ),
    );
    expect(screen.getByTestId("role")).toHaveTextContent("none");
  });
});
