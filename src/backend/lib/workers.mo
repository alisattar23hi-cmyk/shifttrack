import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/workers";
import ShiftTypes "../types/shifts";

module {
  /// Register a worker profile on first sign-in, or return the existing one.
  public func ensureProfile(
    profiles : Map.Map<Principal, Types.WorkerProfile>,
    caller : Principal,
    email : Text,
    name : Text,
    isFirstAccount : Bool,
    now : Types.Timestamp,
  ) : Types.WorkerProfile {
    switch (profiles.get(caller)) {
      case (?existing) { existing };
      case null {
        let profile : Types.WorkerProfile = {
          id = caller;
          email;
          name;
          role = if (isFirstAccount) { #owner } else { #worker };
          createdAt = now;
        };
        profiles.add(caller, profile);
        profile;
      };
    };
  };

  /// Convert an internal profile to its public view.
  public func toView(profile : Types.WorkerProfile) : Types.WorkerView {
    {
      id = profile.id;
      email = profile.email;
      name = profile.name;
      role = profile.role;
      createdAt = profile.createdAt;
    };
  };

  /// Look up a profile by principal.
  public func getProfile(
    profiles : Map.Map<Principal, Types.WorkerProfile>,
    id : Principal,
  ) : ?Types.WorkerProfile {
    profiles.get(id);
  };

  /// Change a worker's role.
  public func setRole(
    profiles : Map.Map<Principal, Types.WorkerProfile>,
    id : Principal,
    role : Types.Role,
  ) : Bool {
    switch (profiles.get(id)) {
      case (?profile) {
        let updated : Types.WorkerProfile = {
          id = profile.id;
          email = profile.email;
          name = profile.name;
          role;
          createdAt = profile.createdAt;
        };
        profiles.add(id, updated);
        true;
      };
      case null { false };
    };
  };

  /// Build the owner's worker list with aggregate shift statistics.
  public func listSummaries(
    profiles : Map.Map<Principal, Types.WorkerProfile>,
    shifts : Map.Map<Nat, ShiftTypes.Shift>,
  ) : [Types.WorkerSummary] {
    profiles.values().map(
      func(profile) {
        var totalShifts : Nat = 0;
        var totalDuration : Int = 0;
        var lastEnd : ?Types.Timestamp = null;
        for (shift in shifts.values()) {
          if (shift.worker == profile.id) {
            totalShifts += 1;
            totalDuration += shift.durationNs;
            switch (shift.endTime) {
              case (?end) {
                switch (lastEnd) {
                  case (?current) { if (end > current) { lastEnd := ?end } };
                  case null { lastEnd := ?end };
                };
              };
              case null {};
            };
          };
        };
        {
          id = profile.id;
          email = profile.email;
          name = profile.name;
          role = profile.role;
          totalShifts;
          totalDurationNs = totalDuration;
          lastShiftEnd = lastEnd;
        };
      }
    ).toArray();
  };
};
