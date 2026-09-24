import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/shifts";
import WorkerTypes "../types/workers";
import ShiftsLib "../lib/shifts";
import WorkersLib "../lib/workers";

mixin (
  accessControlState : AccessControl.AccessControlState,
  profiles : Map.Map<Principal, WorkerTypes.WorkerProfile>,
  shifts : Map.Map<Nat, Types.Shift>,
  state : { var nextShiftId : Nat; var nextNoteId : Nat },
) {
  /// Start a shift for the caller.
  public shared ({ caller }) func startShift() : async Types.StartShiftResult {
    if (caller.isAnonymous()) { Runtime.trap("Unauthorized: Sign in required") };
    ShiftsLib.startShift(shifts, state, caller, Time.now());
  };

  /// End the caller's active shift.
  public shared ({ caller }) func endShift() : async Types.EndShiftResult {
    if (caller.isAnonymous()) { Runtime.trap("Unauthorized: Sign in required") };
    ShiftsLib.endShift(shifts, caller, Time.now());
  };

  /// Return the caller's currently running shift, if any.
  public query ({ caller }) func getActiveShift() : async ?Types.ShiftView {
    switch (ShiftsLib.getActiveShift(shifts, caller)) {
      case (?shift) { ?ShiftsLib.toView(shift) };
      case null { null };
    };
  };

  /// List the caller's own shifts, filtered and sorted.
  public query ({ caller }) func listMyShifts(filter : Types.ShiftQuery) : async [Types.ShiftView] {
    ShiftsLib.listShifts(shifts, caller, filter);
  };

  /// List any worker's shifts. Owner only.
  public query ({ caller }) func listWorkerShifts(worker : Principal, filter : Types.ShiftQuery) : async [Types.ShiftView] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Owner only");
    };
    ShiftsLib.listShifts(shifts, worker, filter);
  };

  /// Add a note to a shift. Allowed for the shift's worker and the owner.
  public shared ({ caller }) func addShiftNote(id : Nat, text : Text) : async Types.AddNoteResult {
    if (caller.isAnonymous()) { Runtime.trap("Unauthorized: Sign in required") };
    switch (ShiftsLib.getShift(shifts, id)) {
      case null { #notFound };
      case (?shift) {
        let isOwner = AccessControl.isAdmin(accessControlState, caller);
        if (shift.worker != caller and not isOwner) {
          #notAuthorized;
        } else {
          let authorName = switch (WorkersLib.getProfile(profiles, caller)) {
            case (?profile) { profile.name };
            case null { "" };
          };
          ShiftsLib.addNote(shifts, state, id, caller, authorName, text, Time.now());
        };
      };
    };
  };

  /// Correct a shift's start/end times. Owner only.
  public shared ({ caller }) func correctShift(id : Nat, startTime : Types.Timestamp, endTime : ?Types.Timestamp) : async Types.CorrectShiftResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Owner only");
    };
    ShiftsLib.correctShift(shifts, id, startTime, endTime, Time.now());
  };
};
