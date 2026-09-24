import Int "mo:core/Int";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/shifts";

module {
  /// The maximum continuous shift length in nanoseconds (10 hours).
  public let maxShiftNs : Int = 36_000_000_000_000;

  /// Start a shift for a worker. Fails if the worker already has an active shift.
  public func startShift(
    shifts : Map.Map<Nat, Types.Shift>,
    state : { var nextShiftId : Nat },
    worker : Principal,
    now : Types.Timestamp,
  ) : Types.StartShiftResult {
    switch (getActiveShift(shifts, worker)) {
      case (?active) { #alreadyActive(toView(active)) };
      case null {
        let id = state.nextShiftId;
        state.nextShiftId := id + 1;
        let shift : Types.Shift = {
          id;
          worker;
          startTime = now;
          endTime = null;
          durationNs = 0;
          cappedAtLimit = false;
          notes = [];
          createdAt = now;
          updatedAt = now;
        };
        shifts.add(id, shift);
        #ok(toView(shift));
      };
    };
  };

  /// End a worker's active shift, computing duration and applying the 10-hour cap.
  public func endShift(
    shifts : Map.Map<Nat, Types.Shift>,
    worker : Principal,
    now : Types.Timestamp,
  ) : Types.EndShiftResult {
    switch (getActiveShift(shifts, worker)) {
      case null { #noActiveShift };
      case (?active) {
        let rawElapsed = now - active.startTime;
        let elapsed = if (rawElapsed < 0) { 0 } else { rawElapsed };
        let capped = elapsed > maxShiftNs;
        let duration = if (capped) { maxShiftNs } else { elapsed };
        let endTime = active.startTime + duration;
        let updated : Types.Shift = {
          id = active.id;
          worker = active.worker;
          startTime = active.startTime;
          endTime = ?endTime;
          durationNs = duration;
          cappedAtLimit = capped;
          notes = active.notes;
          createdAt = active.createdAt;
          updatedAt = now;
        };
        shifts.add(active.id, updated);
        #ok(toView(updated));
      };
    };
  };

  /// Return a worker's currently running shift, if any.
  public func getActiveShift(
    shifts : Map.Map<Nat, Types.Shift>,
    worker : Principal,
  ) : ?Types.Shift {
    shifts.values().find(func(shift) = shift.worker == worker and shift.endTime == null);
  };

  /// List a worker's shifts, filtered by date range and sorted.
  public func listShifts(
    shifts : Map.Map<Nat, Types.Shift>,
    worker : Principal,
    filter : Types.ShiftQuery,
  ) : [Types.ShiftView] {
    let filtered = shifts.values().filter(
      func(shift) {
        if (shift.worker != worker) { false } else {
          let afterFrom = switch (filter.from) {
            case (?from) { shift.startTime >= from };
            case null { true };
          };
          let beforeTo = switch (filter.to) {
            case (?to) { shift.startTime <= to };
            case null { true };
          };
          afterFrom and beforeTo;
        };
      }
    );
    let views = filtered.map(func(shift) = toView(shift)).toArray();
    views.sort(
      func(a, b) {
        switch (filter.sortBy) {
          case (#dateDesc) { Int.compare(b.startTime, a.startTime) };
          case (#dateAsc) { Int.compare(a.startTime, b.startTime) };
          case (#durationDesc) { Int.compare(b.durationNs, a.durationNs) };
          case (#durationAsc) { Int.compare(a.durationNs, b.durationNs) };
        };
      }
    );
  };

  /// Fetch a single shift by id.
  public func getShift(
    shifts : Map.Map<Nat, Types.Shift>,
    id : Nat,
  ) : ?Types.Shift {
    shifts.get(id);
  };

  /// Add a note to a shift. `authorName` is the display name of the author.
  public func addNote(
    shifts : Map.Map<Nat, Types.Shift>,
    state : { var nextNoteId : Nat },
    id : Nat,
    author : Principal,
    authorName : Text,
    text : Text,
    now : Types.Timestamp,
  ) : Types.AddNoteResult {
    switch (shifts.get(id)) {
      case null { #notFound };
      case (?shift) {
        let noteId = state.nextNoteId;
        state.nextNoteId := noteId + 1;
        let note : Types.ShiftNote = {
          id = noteId;
          author;
          authorName;
          text;
          createdAt = now;
        };
        let updated : Types.Shift = {
          id = shift.id;
          worker = shift.worker;
          startTime = shift.startTime;
          endTime = shift.endTime;
          durationNs = shift.durationNs;
          cappedAtLimit = shift.cappedAtLimit;
          notes = shift.notes.concat([note]);
          createdAt = shift.createdAt;
          updatedAt = now;
        };
        shifts.add(id, updated);
        #ok(toView(updated));
      };
    };
  };

  /// Owner correction of a shift's start/end times.
  public func correctShift(
    shifts : Map.Map<Nat, Types.Shift>,
    id : Nat,
    startTime : Types.Timestamp,
    endTime : ?Types.Timestamp,
    now : Types.Timestamp,
  ) : Types.CorrectShiftResult {
    switch (shifts.get(id)) {
      case null { #notFound };
      case (?shift) {
        let invalid = switch (endTime) {
          case (?end) { end < startTime };
          case null { false };
        };
        if (invalid) {
          #invalidRange;
        } else {
          let duration = switch (endTime) {
            case (?end) {
              let elapsed = end - startTime;
              if (elapsed > maxShiftNs) { maxShiftNs } else { elapsed };
            };
            case null { 0 };
          };
          let capped = switch (endTime) {
            case (?end) { (end - startTime) > maxShiftNs };
            case null { false };
          };
          let updated : Types.Shift = {
            id = shift.id;
            worker = shift.worker;
            startTime;
            endTime;
            durationNs = duration;
            cappedAtLimit = capped;
            notes = shift.notes;
            createdAt = shift.createdAt;
            updatedAt = now;
          };
          shifts.add(id, updated);
          #ok(toView(updated));
        };
      };
    };
  };

  /// Convert an internal shift to its public view.
  public func toView(shift : Types.Shift) : Types.ShiftView {
    {
      id = shift.id;
      worker = shift.worker;
      startTime = shift.startTime;
      endTime = shift.endTime;
      durationNs = shift.durationNs;
      cappedAtLimit = shift.cappedAtLimit;
      notes = shift.notes;
      createdAt = shift.createdAt;
      updatedAt = shift.updatedAt;
    };
  };
};
