import { ProfileSetup } from "@/components/ProfileSetup";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("ProfileSetup", () => {
  it("disables submit until a valid email is entered", async () => {
    const user = userEvent.setup();
    render(
      <ProfileSetup
        isRegistering={false}
        registerError={null}
        onSubmit={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );

    const submit = screen.getByTestId("profile_setup.submit_button");
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByTestId("profile_setup.email_input"),
      "not-an-email",
    );
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByTestId("profile_setup.email_input"),
      "@crew.example",
    );
    expect(submit).toBeEnabled();
  });

  it("submits the trimmed email and name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ProfileSetup
        isRegistering={false}
        registerError={null}
        onSubmit={onSubmit}
        onSignOut={vi.fn()}
      />,
    );

    await user.type(
      screen.getByTestId("profile_setup.email_input"),
      "alex@crew.example",
    );
    await user.type(
      screen.getByTestId("profile_setup.name_input"),
      "Alex Rivera",
    );
    await user.click(screen.getByTestId("profile_setup.submit_button"));

    expect(onSubmit).toHaveBeenCalledWith("alex@crew.example", "Alex Rivera");
  });

  it("shows a registration error", () => {
    render(
      <ProfileSetup
        isRegistering={false}
        registerError="Could not save your profile. Please try again."
        onSubmit={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    expect(screen.getByTestId("profile_setup.error_state")).toHaveTextContent(
      "Could not save your profile. Please try again.",
    );
  });

  it("offers a sign-out escape hatch", async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(
      <ProfileSetup
        isRegistering={false}
        registerError={null}
        onSubmit={vi.fn()}
        onSignOut={onSignOut}
      />,
    );

    await user.click(screen.getByTestId("profile_setup.sign_out_button"));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
