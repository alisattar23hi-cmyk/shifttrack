import Common "common";

module {
  public type WorkerId = Common.WorkerId;
  public type Timestamp = Common.Timestamp;
  public type Role = Common.Role;

  /// A worker profile. `email` is the verified email captured at sign-in.
  public type WorkerProfile = {
    id : WorkerId;
    email : Text;
    name : Text;
    role : Role;
    createdAt : Timestamp;
  };

  /// Public view of a worker profile.
  public type WorkerView = {
    id : WorkerId;
    email : Text;
    name : Text;
    role : Role;
    createdAt : Timestamp;
  };

  /// A worker row for the owner's worker list, with aggregate shift stats.
  public type WorkerSummary = {
    id : WorkerId;
    email : Text;
    name : Text;
    role : Role;
    totalShifts : Nat;
    totalDurationNs : Int;
    lastShiftEnd : ?Timestamp;
  };
};
