import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";
import { CloudOff, LogOut, ShieldCheck, UserRound } from "lucide-react";

interface AppHeaderProps {
  email: string | null;
  userRole: Role | null;
  isOnline: boolean;
  pendingCount: number;
  onSignOut: () => void;
}

/**
 * The persistent app header: brand mark, signed-in worker, role badge, and the
 * always-visible online/offline sync pill.
 */
export function AppHeader({
  email,
  userRole,
  isOnline,
  pendingCount,
  onSignOut,
}: AppHeaderProps) {
  const isOwner = userRole === "owner";
  const synced = isOnline && pendingCount === 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-elevated"
          >
            <ClockMark />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-none tracking-tight">
              CrewClock
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {email ?? "Shift timekeeping"}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            data-ocid="header.sync_status"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              synced
                ? "border-success/40 bg-success/10 text-success"
                : isOnline
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                synced
                  ? "bg-success"
                  : isOnline
                    ? "bg-warning"
                    : "animate-status-blink bg-destructive",
              )}
            />
            <span className="hidden sm:inline">
              {synced
                ? "Online · Synced"
                : isOnline
                  ? `Syncing ${pendingCount}`
                  : "Offline"}
            </span>
            <span className="sm:hidden">
              {synced ? "Synced" : isOnline ? "Syncing" : "Offline"}
            </span>
          </span>

          {userRole ? (
            <Badge
              data-ocid="header.role_badge"
              variant="outline"
              className={cn(
                "hidden rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider sm:inline-flex",
                isOwner
                  ? "border-accent/50 bg-accent/10 text-accent"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {isOwner ? (
                <ShieldCheck aria-hidden="true" className="size-3" />
              ) : (
                <UserRound aria-hidden="true" className="size-3" />
              )}
              {isOwner ? "Owner" : "Worker"}
            </Badge>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-ocid="header.sign_out_button"
            aria-label="Sign out"
            onClick={onSignOut}
            className="rounded-full text-muted-foreground transition-smooth hover:text-foreground"
          >
            <LogOut aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      {!isOnline ? (
        <div
          data-ocid="header.offline_banner"
          className="flex items-center justify-center gap-2 border-t border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-medium text-destructive"
        >
          <CloudOff aria-hidden="true" className="size-3.5" />
          Offline — your shift keeps counting on this device and syncs when you
          reconnect.
        </div>
      ) : null}
    </header>
  );
}

function ClockMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
