import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Timer } from "lucide-react";

interface SignInGateProps {
  isInitializing: boolean;
  isLoggingIn: boolean;
  loginError?: Error;
  onSignIn: () => void;
}

/**
 * The unauthenticated entry screen. Workers sign in with their own email
 * through Internet Identity; the verified email becomes their identity.
 */
export function SignInGate({
  isInitializing,
  isLoggingIn,
  loginError,
  onSignIn,
}: SignInGateProps) {
  const busy = isInitializing || isLoggingIn;

  return (
    <main
      data-ocid="signin.page"
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
          <h1 className="font-display text-4xl font-bold tracking-tight">
            CrewClock
          </h1>
          <p className="mt-3 max-w-sm text-balance text-sm leading-relaxed text-muted-foreground">
            Clock in, clock out, and keep an honest record of every hour worked
            — online or off.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Sign in to your shift
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use the email address your crew knows you by. The first account to
            sign in becomes the owner.
          </p>

          {loginError ? (
            <div
              data-ocid="signin.error_state"
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>Sign-in did not complete. Please try again.</span>
            </div>
          ) : null}

          <Button
            type="button"
            data-ocid="signin.submit_button"
            onClick={onSignIn}
            disabled={busy}
            className="mt-5 h-12 w-full rounded-full bg-gradient-primary text-base font-semibold text-primary-foreground shadow-elevated transition-smooth hover:opacity-95 active:scale-[0.98]"
          >
            {busy ? (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                {isInitializing ? "Preparing sign-in…" : "Signing in…"}
              </>
            ) : (
              "Continue with email"
            )}
          </Button>

          <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
            Secured by Internet Identity. Your verified email is your identity —
            no separate confirmation step.
          </p>
        </div>
      </div>
    </main>
  );
}
