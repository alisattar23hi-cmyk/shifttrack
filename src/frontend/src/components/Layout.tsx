import type { ReactNode } from "react";

interface LayoutProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * The shared app shell: a distinct `bg-card` header, a `bg-background` content
 * canvas, and a `bg-muted/40` footer strip.
 */
export function Layout({ header, children, footer }: LayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  );
}

/** The attribution footer required for Caffeine apps. */
export function AppFooter() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window === "undefined" ? "" : window.location.hostname;
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row">
        <p className="font-mono tabular-time">
          CrewClock · 10-hour continuous shift cap enforced
        </p>
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="transition-smooth hover:text-foreground"
        >
          © {year}. Built with love using caffeine.ai
        </a>
      </div>
    </footer>
  );
}
