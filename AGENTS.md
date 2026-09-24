# Project Guidance

## User Preferences

- Offline and online operation with local time counting until reconnected
- Maximum 10 hours continuous per single shift
- Workers sign in with their own email
- Workers can view only their own shifts and reports
- Editing allowed only by the owner
- Notes space on each shift usable by worker and/or owner
- Simple Start Shift and End Shift buttons

## Verified Commands

- **typecheck**: `pnpm typecheck`
- **fix**: `pnpm fix`
- **build**: `pnpm build`

## Learnings

- The sign-in flow initializes access control before registerProfile runs, so the first account's stored profile role can read 'worker' while it is actually admin; derive ownership from the backend's isCallerAdmin() flag, not profile.role.
- A component prop named `role` is read by biome as an ARIA role attribute at JSX call sites; rename it (e.g. `userRole`) to satisfy lint/a11y/useValidAriaRole.
- Mixin files under src/backend/mixins/ must import sibling modules with a single '../'; '../../' resolves outside src/backend and fails with M0009.
- 'query' is a reserved keyword in Motoko — a parameter named `query` produces M0001; rename it.
- OQL auto-derivation (.toEntity) only works for records whose fields are all primitives with a built-in _toRow; records with array or option fields need .toEntityManual, and a variant field needs a top-level <TypeName>Value.mo module.
- main.tsx installs a BigInt.prototype.toJSON shim, so any localStorage round-trip of a bigint field must parse back with BigInt() explicitly.
- The design contract's --success and --warning OKLCH tokens exist in index.css but are not mapped in tailwind.config.js by default; bg-success/text-warning classes silently no-op until the colors are added to theme.extend.colors.
- tailwind.config.js kebab-case keys must be quoted ('pulse-ring', 'fade-in-up') or the parse breaks and Vite misreports the error against index.css.
- Timer digits need a monospace font with font-variant-numeric tabular-nums or the live readout jitters every second.
- A locally-owned active shift must be persisted to localStorage and reconciled against the backend query, or an offline reload loses the running timer.
