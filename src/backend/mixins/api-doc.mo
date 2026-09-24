mixin () {
  /// Return static Markdown documentation for this backend's public API.
  public query func getApiDoc() : async Text {
    "# Shift Tracker Backend API\n\n" #
    "This canister records worker shifts: start/end times, computed duration, a 10-hour continuous cap, per-shift notes, and monthly reports. Workers see only their own shifts; the owner sees every worker and every shift.\n\n" #
    "## Authentication and identity\n\n" #
    "Sign-in uses Internet Identity. The frontend pins an Internet Identity derivation origin, published at `/.well-known/ii-derivation-origin` when available. An agent already holding the user's Internet Identity authorization derives the correct per-app principal against that origin (for example `icp identity link web <name> --app <host>`). Such a delegation acts with the user's full authority in this app until it expires.\n\n" #
    "Registration gates access. A direct API caller must register once before any role-guarded call: call `_initialize_access_control` (or `registerProfile`) as a signed-in caller. The first signed-in account to initialize becomes the owner (admin); every later caller becomes a worker. An unregistered caller hitting a guarded endpoint receives the trap `User is not registered`; an anonymous caller receives `Unauthorized: Sign in required` on shift mutations, and `getCallerUserRole` returns `#guest` for anonymous callers. A caller can be unregistered while assuming the app already knows it: registration happens only when a caller signs in through the app's own frontend, so a principal that never did so is unregistered even when it belongs to the app's owner, and a signed-in caller derived against a different origin is a different principal than the one the frontend registered.\n\n" #
    "## Roles\n\n" #
    "- `#owner` (admin): sees all workers and all shifts, can correct any shift's times, can promote or demote workers, and can export reports.\n" #
    "- `#worker`: sees and manages only their own shifts and reports.\n\n" #
    "## Worker endpoints\n\n" #
    "- `registerProfile(email : Text, name : Text) : async WorkerView` — register the caller's profile on first sign-in, or return the existing one. The first account becomes owner.\n" #
    "- `getCallerProfile() : async ?WorkerView` — the caller's own profile, or `null` if unregistered.\n" #
    "- `getWorkerProfile(id : Principal) : async ?WorkerView` — any worker's profile. Owner only.\n" #
    "- `listWorkers() : async [WorkerSummary]` — all workers with aggregate stats. Owner only.\n" #
    "- `setWorkerRole(id : Principal, role : Role) : async Bool` — promote or demote a worker. Owner only.\n\n" #
    "## Shift clock\n\n" #
    "- `startShift() : async StartShiftResult` — begin a shift for the caller. Returns `#ok(ShiftView)` or `#alreadyActive(ShiftView)` when a shift is already running. Only one active shift per worker at a time.\n" #
    "- `endShift() : async EndShiftResult` — stop the caller's active shift, computing duration. Returns `#ok(ShiftView)` or `#noActiveShift`. If the elapsed time exceeds 10 hours, the shift is capped at exactly 10 hours and `cappedAtLimit` is set to `true`.\n" #
    "- `getActiveShift() : async ?ShiftView` — the caller's running shift, if any.\n\n" #
    "## Shift history and notes\n\n" #
    "- `listMyShifts(query : ShiftQuery) : async [ShiftView]` — the caller's own shifts, filtered by `from`/`to` (inclusive on `startTime`) and sorted by `sortBy` (`#dateDesc`, `#dateAsc`, `#durationDesc`, `#durationAsc`).\n" #
    "- `listWorkerShifts(worker : Principal, query : ShiftQuery) : async [ShiftView]` — any worker's shifts. Owner only.\n" #
    "- `addShiftNote(id : Nat, text : Text) : async AddNoteResult` — add a note to a shift. Allowed for the shift's own worker and the owner; returns `#notAuthorized` otherwise and `#notFound` for an unknown shift. Each note records its author principal, author display name, and creation timestamp.\n" #
    "- `correctShift(id : Nat, startTime : Timestamp, endTime : ?Timestamp) : async CorrectShiftResult` — owner correction of a shift's times. Returns `#invalidRange` when `endTime` precedes `startTime`; a corrected duration is also capped at 10 hours.\n\n" #
    "## Monthly reports\n\n" #
    "- `getMyMonthlyReport(month : MonthKey) : async WorkerMonthlyReport` — the caller's own report for a `YYYY-MM` month: total duration, shift count, average shift length, and a per-shift breakdown.\n" #
    "- `getWorkerMonthlyReport(worker : Principal, month : MonthKey) : async WorkerMonthlyReport` — any worker's report. Owner only.\n" #
    "- `getAllWorkersMonthlyReport(month : MonthKey) : async AllWorkersMonthlyReport` — the owner's report across all workers with per-worker totals and an all-workers summary. Owner only.\n" #
    "- `exportMonthlyReport(month : MonthKey) : async ExportResult` — a CSV document of the all-workers report. Owner only; returns `#notAuthorized` otherwise.\n\n" #
    "## Units and encodings\n\n" #
    "- `Timestamp` is nanoseconds since the Unix epoch (IC `Time.now()` convention), encoded as `Int`.\n" #
    "- `durationNs` is a duration in nanoseconds, encoded as `Int`.\n" #
    "- `MonthKey` is a `YYYY-MM` text key.\n" #
    "- `WorkerId` is a `Principal`; `ShiftId` and `NoteId` are `Nat`.\n" #
    "- `endTime` is `null` while a shift is running.\n\n" #
    "## Lifecycle and polling\n\n" #
    "A shift moves from running (`endTime = null`) to completed (`endTime` set) exactly once via `endShift`. Poll `getActiveShift` to render a live timer; the elapsed time is `now - startTime` and is not stored until the shift ends. A shift that reaches the 10-hour limit is not auto-stopped by the canister — the frontend stops it and the backend caps the stored duration at 10 hours with `cappedAtLimit = true`.\n\n" #
    "## Mutation retry safety\n\n" #
    "`startShift` is idempotent in effect: a second call while a shift is running returns `#alreadyActive` without creating a duplicate. `endShift` returns `#noActiveShift` when nothing is running, so a retry after a successful end is safe. `addShiftNote` appends a new note on every call and is not idempotent — do not retry blindly. `correctShift` and `setWorkerRole` are idempotent overwrites of the target value.\n\n" #
    "## Errors and limits\n\n" #
    "Owner-only endpoints trap with `Unauthorized: Owner only` for non-owner callers. Shift mutations trap with `Unauthorized: Sign in required` for anonymous callers. The maximum continuous shift length is 10 hours (36,000,000,000,000 ns).";
  };
};
