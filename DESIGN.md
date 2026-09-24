# Design Brief

## Direction

CrewClock — an industrial-calm shift clock: one enormous timer, one unmissable action, and quiet, legible records underneath.

## Tone

Precision instrument, not a dashboard toy — dark ink-teal surfaces, high-contrast numerals, and restraint everywhere except the single action that matters.

## Differentiation

The live elapsed-time readout is the hero: huge tabular Geist Mono digits on a recessed plate, ringed by a thin 10-hour progress arc that shifts green → amber → red as the shift nears its cap.

## Color Palette

| Token      | OKLCH         | Role                                              |
| ---------- | ------------- | ------------------------------------------------- |
| background | 0.16 0.018 175 | Dark app canvas, deep ink-teal                    |
| foreground | 0.95 0.01 168  | Primary text, near-white                          |
| card       | 0.2 0.022 175  | Timer plate, shift rows, report panels            |
| primary    | 0.72 0.17 158  | Start Shift, active shift, synced state           |
| accent     | 0.7 0.13 175   | Owner role, links, secondary highlights           |
| muted      | 0.24 0.026 175 | Inactive surfaces, note blocks, table stripes     |
| destructive| 0.62 0.19 25   | End Shift, correction, offline/error              |
| warning    | 0.75 0.15 75   | Approaching 10-hour limit, pending sync           |

## Typography

- Display: Space Grotesk — headers, worker names, section titles, big numbers' labels
- Body: DM Sans — labels, tables, notes, buttons, all prose
- Mono: Geist Mono — every time value: elapsed readout, start/end times, durations
- Scale: hero `text-6xl md:text-8xl font-bold tracking-tight tabular-time`, h2 `text-2xl md:text-3xl font-bold tracking-tight`, label `text-xs font-semibold uppercase tracking-widest text-muted-foreground`, body `text-base`

## Elevation & Depth

Two-level hierarchy: flat `bg-background` canvas, `bg-card` surfaces lifted with `shadow-elevated` and a 1px `border-border`; the timer plate is the only element allowed a deeper recessed treatment (`shadow-inset-soft` + inner ring).

## Structural Zones

| Zone    | Background        | Border    | Notes                                                        |
| ------- | ----------------- | --------- | ------------------------------------------------------------ |
| Header  | `bg-card`         | `border-b`| App mark + worker email + role badge + online/offline pill    |
| Content | `bg-background`   | —         | Timer stage, then alternating `bg-muted/30` history sections  |
| Footer  | `bg-muted/40`     | `border-t`| Monthly total strip + sync state                              |

## Spacing & Rhythm

Mobile-first single column with `px-4 py-6` and `gap-4`; `space-y-8` between major sections; timer stage gets generous `py-10` breathing room so the digits dominate; desktop widens to a 2-column grid at `lg:` with reports in a right rail.

## Component Patterns

- Buttons: Start = full-width `rounded-full` primary gradient, `h-16 text-lg`; End = full-width `rounded-full` destructive, same scale; both thumb-reachable with `active:scale-[0.98]`
- Cards: `rounded-2xl bg-card border border-border shadow-elevated p-5`, timer plate `rounded-3xl`
- Badges: pill `rounded-full` — role badge in accent, sync status dot green/amber/red, duration chip in `bg-muted` with mono type
- Tables: `bg-card` rows with `divide-y divide-border`, mono time columns, sticky header on desktop

## Motion

- Entrance: `animate-fade-in-up` staggered 60ms on shift rows and report cards
- Hover: `transition-smooth` on buttons/cards, `hover:shadow-elevated` lift; active state scales to 0.98
- Decorative: `animate-pulse-ring` halo behind the active-shift dot; `animate-status-blink` on the offline indicator only

## Constraints

- Max 10 hours continuous per shift — the progress arc and amber/red warning states must make the cap visible at a glance
- Workers see only their own shifts and reports; owner-only edit affordances must be visually distinct (accent-tinted), never ambient
- Offline-first: online/offline status must always be visible in the header, never hidden behind a menu
- Times are sacred — mono tabular digits, never reflowing or jittering as the timer ticks
- No break tracking, no overtime or pay-rate surfaces

## Signature Detail

The shift-cap progress arc wrapping the timer plate — a single continuous stroke that drains from green to amber to red, turning the 10-hour rule into the app's most recognizable visual gesture.
