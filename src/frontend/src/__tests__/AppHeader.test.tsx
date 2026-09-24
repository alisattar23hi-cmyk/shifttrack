import { AppHeader } from "@/components/AppHeader";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("AppHeader", () => {
  it("shows the signed-in email and owner role", () => {
    render(
      <AppHeader
        email="alex@crew.example"
        userRole="owner"
        isOnline
        pendingCount={0}
        onSignOut={vi.fn()}
      />,
    );

    expect(screen.getByText("alex@crew.example")).toBeInTheDocument();
    expect(screen.getByTestId("header.role_badge")).toHaveTextContent("Owner");
    expect(screen.getByTestId("header.sync_status")).toHaveTextContent(
      "Online · Synced",
    );
  });

  it("shows the worker role for a worker", () => {
    render(
      <AppHeader
        email="bob@crew.example"
        userRole="worker"
        isOnline
        pendingCount={0}
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.getByTestId("header.role_badge")).toHaveTextContent("Worker");
  });

  it("falls back to the product tagline when no email is known", () => {
    render(
      <AppHeader
        email={null}
        userRole="worker"
        isOnline
        pendingCount={0}
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.getByText("Shift timekeeping")).toBeInTheDocument();
  });

  it("hides the role badge while the role is unresolved", () => {
    render(
      <AppHeader
        email="bob@crew.example"
        userRole={null}
        isOnline
        pendingCount={0}
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("header.role_badge")).not.toBeInTheDocument();
  });

  it("shows an offline banner and status when disconnected", () => {
    render(
      <AppHeader
        email="bob@crew.example"
        userRole="worker"
        isOnline={false}
        pendingCount={0}
        onSignOut={vi.fn()}
      />,
    );

    expect(screen.getByTestId("header.offline_banner")).toBeInTheDocument();
    expect(screen.getByTestId("header.sync_status")).toHaveTextContent(
      "Offline",
    );
  });

  it("shows a syncing status while actions are queued", () => {
    render(
      <AppHeader
        email="bob@crew.example"
        userRole="worker"
        isOnline
        pendingCount={3}
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.getByTestId("header.sync_status")).toHaveTextContent(
      "Syncing 3",
    );
  });

  it("calls onSignOut when the sign-out button is pressed", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(
      <AppHeader
        email="bob@crew.example"
        userRole="worker"
        isOnline
        pendingCount={0}
        onSignOut={onSignOut}
      />,
    );

    await user.click(screen.getByTestId("header.sign_out_button"));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
