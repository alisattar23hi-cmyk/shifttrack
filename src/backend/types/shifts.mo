import Common "common";

module {
  public type WorkerId = Common.WorkerId;
  public type ShiftId = Common.ShiftId;
  public type NoteId = Common.NoteId;
  public type Timestamp = Common.Timestamp;

  /// A note attached to a shift. `author` is the principal that wrote it.
  public type ShiftNote = {
    id : NoteId;
    author : WorkerId;
    authorName : Text;
    text : Text;
    createdAt : Timestamp;
  };

  /// A completed or in-progress shift record.
  /// `endTime` is null while the shift is running.
  /// `cappedAtLimit` is true when the shift was auto-stopped at the 10-hour limit.
  public type Shift = {
    id : ShiftId;
    worker : WorkerId;
    startTime : Timestamp;
    endTime : ?Timestamp;
    durationNs : Int;
    cappedAtLimit : Bool;
    notes : [ShiftNote];
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// Public view of a shift.
  public type ShiftView = {
    id : ShiftId;
    worker : WorkerId;
    startTime : Timestamp;
    endTime : ?Timestamp;
    durationNs : Int;
    cappedAtLimit : Bool;
    notes : [ShiftNote];
    createdAt : Timestamp;
    updatedAt : Timestamp;
  };

  /// Filter and sort options for a shift list query.
  public type ShiftQuery = {
    from : ?Timestamp;
    to : ?Timestamp;
    sortBy : ShiftSort;
  };

  public type ShiftSort = {
    #dateDesc;
    #dateAsc;
    #durationDesc;
    #durationAsc;
  };

  /// Result of starting a shift.
  public type StartShiftResult = {
    #ok : ShiftView;
    #alreadyActive : ShiftView;
  };

  /// Result of ending a shift.
  public type EndShiftResult = {
    #ok : ShiftView;
    #noActiveShift;
  };

  /// Result of adding a note to a shift.
  public type AddNoteResult = {
    #ok : ShiftView;
    #notFound;
    #notAuthorized;
  };

  /// Result of an owner correcting a shift's times.
  public type CorrectShiftResult = {
    #ok : ShiftView;
    #notFound;
    #notAuthorized;
    #invalidRange;
  };
};
