import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Timer } from "lucide-react";
import { useState } from "react";

interface ProfileSetupProps {
  isRegistering: boolean;
  registerError: string | null;
  onSubmit: (email: string, name: string) => void;
  onSignOut: () => void;
}

/**
 * The one-time profile step after the first sign-in.
 *
 * The worker's email is the identity their crew knows them by; the backend
 * stores it on the profile and designates the very first account as owner.
 */
export function ProfileSetup({
  isRegistering,
  registerError,
  onSubmit,
  onSignOut,
}: ProfileSetupProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && !isRegistering;

  return (
    <main
      data-ocid="profile_setup.page"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-subtle"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="mb-5 grid size-16 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated"
          >
            <Timer className="size-8" />
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Set up your profile
          </h1>
          <p className="mt-3 max-w-sm text-balance text-sm leading-relaxed text-muted-foreground">
            Tell us who you are so your shifts and reports are filed under your
            name.
          </p>
        </div>

        <form
          className="rounded-2xl border border-border bg-card p-6 shadow-elevated"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit(email, name);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="setup-email" className="label-caps">
              Work email
            </Label>
            <Input
              id="setup-email"
              type="email"
              autoComplete="email"
              data-ocid="profile_setup.email_input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@crew.example"
              required
            />
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="setup-name" className="label-caps">
              Display name
            </Label>
            <Input
              id="setup-name"
              type="text"
              autoComplete="name"
              data-ocid="profile_setup.name_input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Alex Rivera"
            />
          </div>

          {registerError ? (
            <div
              data-ocid="profile_setup.error_state"
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>{registerError}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            data-ocid="profile_setup.submit_button"
            disabled={!canSubmit}
            className="mt-5 h-12 w-full rounded-full bg-gradient-primary text-base font-semibold text-primary-foreground shadow-elevated transition-smooth hover:opacity-95 active:scale-[0.98] disabled:opacity-40"
          >
            {isRegistering ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save and continue"
            )}
          </Button>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            The first account to sign in becomes the owner.
          </p>
        </form>

        <div className="mt-5 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-ocid="profile_setup.sign_out_button"
            onClick={onSignOut}
            className="rounded-full text-muted-foreground"
          >
            Use a different account
          </Button>
        </div>
      </div>
    </main>
  );
}
