import Common "common";

module {
  public type WorkerId = Common.WorkerId;
  public type ShiftId = Common.ShiftId;
  public type Timestamp = Common.Timestamp;
  public type MonthKey = Common.MonthKey;

  /// One row of a monthly report: a single shift's contribution.
  public type ReportShiftRow = {
    id : ShiftId;
    startTime : Timestamp;
    endTime : ?Timestamp;
    durationNs : Int;
    cappedAtLimit : Bool;
    noteCount : Nat;
  };

  /// A single worker's monthly report.
  public type WorkerMonthlyReport = {
    worker : WorkerId;
    workerName : Text;
    month : MonthKey;
    totalDurationNs : Int;
    shiftCount : Nat;
    averageDurationNs : Int;
    shifts : [ReportShiftRow];
  };

  /// Per-worker totals inside the owner's all-workers report.
  public type WorkerTotals = {
    worker : WorkerId;
    workerName : Text;
    totalDurationNs : Int;
    shiftCount : Nat;
    averageDurationNs : Int;
  };

  /// The owner's monthly report across all workers.
  public type AllWorkersMonthlyReport = {
    month : MonthKey;
    totalDurationNs : Int;
    shiftCount : Nat;
    workerCount : Nat;
    workers : [WorkerTotals];
  };

  /// Result of exporting a monthly report.
  public type ExportResult = {
    #ok : Text;
    #notAuthorized;
  };
};
