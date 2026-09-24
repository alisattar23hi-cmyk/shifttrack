import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/workers";
import ShiftTypes "../types/shifts";
import WorkersLib "../lib/workers";

mixin (
  accessControlState : AccessControl.AccessControlState,
  profiles : Map.Map<Principal, Types.WorkerProfile>,
  shifts : Map.Map<Nat, ShiftTypes.Shift>,
) {
  /// Register the caller's profile on first sign-in, or return the existing one.
  public shared ({ caller }) func registerProfile(email : Text, name : Text) : async Types.WorkerView {
    if (caller.isAnonymous()) { Runtime.trap("Unauthorized: Sign in required") };
    let isFirstAccount = not accessControlState.adminAssigned;
    AccessControl.initialize(accessControlState, caller);
    let profile = WorkersLib.ensureProfile(profiles, caller, email, name, isFirstAccount, Time.now());
    WorkersLib.toView(profile);
  };

  /// Return the caller's own profile.
  public query ({ caller }) func getCallerProfile() : async ?Types.WorkerView {
    switch (WorkersLib.getProfile(profiles, caller)) {
      case (?profile) { ?WorkersLib.toView(profile) };
      case null { null };
    };
  };

  /// Return any worker's profile. Owner only.
  public query ({ caller }) func getWorkerProfile(id : Principal) : async ?Types.WorkerView {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Owner only");
    };
    switch (WorkersLib.getProfile(profiles, id)) {
      case (?profile) { ?WorkersLib.toView(profile) };
      case null { null };
    };
  };

  /// List all workers with aggregate stats. Owner only.
  public query ({ caller }) func listWorkers() : async [Types.WorkerSummary] {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Owner only");
    };
    WorkersLib.listSummaries(profiles, shifts);
  };

  /// Promote or demote a worker. Owner only.
  public shared ({ caller }) func setWorkerRole(id : Principal, role : Types.Role) : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Owner only");
    };
    WorkersLib.setRole(profiles, id, role);
  };
};
