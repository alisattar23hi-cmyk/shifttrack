module {
  /// A worker's principal identity (derived from Internet Identity sign-in).
  public type WorkerId = Principal;

  /// A shift identifier.
  public type ShiftId = Nat;

  /// A note identifier.
  public type NoteId = Nat;

  /// Nanoseconds since the Unix epoch (IC `Time.now()` convention).
  public type Timestamp = Int;

  /// A calendar month key in `YYYY-MM` form.
  public type MonthKey = Text;

  /// The role a signed-in account holds in the app.
  public type Role = {
    #worker;
    #owner;
  };
};
