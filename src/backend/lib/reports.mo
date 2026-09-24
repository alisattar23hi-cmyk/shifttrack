import Int "mo:core/Int";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/reports";
import ShiftTypes "../types/shifts";
import WorkerTypes "../types/workers";

module {
  /// Build a single worker's monthly report for the given `YYYY-MM` month key.
  public func workerMonthlyReport(
    shifts : Map.Map<Nat, ShiftTypes.Shift>,
    worker : Principal,
    workerName : Text,
    month : Types.MonthKey,
  ) : Types.WorkerMonthlyReport {
    let rows = shifts.values().filter(
      func(shift) {
        shift.worker == worker and monthKeyOf(shift.startTime) == month;
      }
    ).map(
      func(shift) = toRow(shift)
    ).toArray();
    let sorted = rows.sort(func(a, b) = Int.compare(a.startTime, b.startTime));
    var total : Int = 0;
    for (row in sorted.values()) {
      total += row.durationNs;
    };
    let count = sorted.size();
    let average = if (count == 0) { 0 } else { total / count.toInt() };
    {
      worker;
      workerName;
      month;
      totalDurationNs = total;
      shiftCount = count;
      averageDurationNs = average;
      shifts = sorted;
    };
  };

  /// Build the owner's monthly report across all workers.
  public func allWorkersMonthlyReport(
    shifts : Map.Map<Nat, ShiftTypes.Shift>,
    profiles : Map.Map<Principal, WorkerTypes.WorkerProfile>,
    month : Types.MonthKey,
  ) : Types.AllWorkersMonthlyReport {
    let rows = shifts.values().filter(
      func(shift) { monthKeyOf(shift.startTime) == month }
    ).toArray();

    // Aggregate per worker, preserving first-seen order.
    let order = List.empty<Principal>();
    let totals = Map.empty<Principal, { var totalDurationNs : Int; var shiftCount : Nat }>();
    for (shift in rows.values()) {
      switch (totals.get(shift.worker)) {
        case (?entry) {
          entry.totalDurationNs += shift.durationNs;
          entry.shiftCount += 1;
        };
        case null {
          order.add(shift.worker);
          totals.add(shift.worker, { var totalDurationNs = shift.durationNs; var shiftCount = 1 });
        };
      };
    };

    var grandTotal : Int = 0;
    var grandCount : Nat = 0;
    let workers = order.toArray().map(
      func(worker) {
        let entry = totals.get(worker) ?? ({ var totalDurationNs : Int = 0; var shiftCount : Nat = 0 });
        grandTotal += entry.totalDurationNs;
        grandCount += entry.shiftCount;
        let average = if (entry.shiftCount == 0) { 0 } else {
          entry.totalDurationNs / entry.shiftCount.toInt();
        };
        let name = switch (profiles.get(worker)) {
          case (?profile) { profile.name };
          case null { "" };
        };
        {
          worker;
          workerName = name;
          totalDurationNs = entry.totalDurationNs;
          shiftCount = entry.shiftCount;
          averageDurationNs = average;
        };
      }
    );

    {
      month;
      totalDurationNs = grandTotal;
      shiftCount = grandCount;
      workerCount = workers.size();
      workers;
    };
  };

  /// Render a monthly report as a downloadable CSV document.
  public func exportMonthlyReport(
    report : Types.AllWorkersMonthlyReport,
  ) : Text {
    let header = "worker,totalDurationNs,shiftCount,averageDurationNs";
    let lines = report.workers.map(
      func(w) {
        w.worker.toText() # "," # w.totalDurationNs.toText() # "," # w.shiftCount.toText() # "," # w.averageDurationNs.toText();
      }
    );
    let all = [header].concat(lines);
    all.values().join("\n");
  };

  /// Convert an internal shift to a report row.
  func toRow(shift : ShiftTypes.Shift) : Types.ReportShiftRow {
    {
      id = shift.id;
      startTime = shift.startTime;
      endTime = shift.endTime;
      durationNs = shift.durationNs;
      cappedAtLimit = shift.cappedAtLimit;
      noteCount = shift.notes.size();
    };
  };

  /// Derive a `YYYY-MM` month key from a nanosecond timestamp.
  func monthKeyOf(ns : Types.Timestamp) : Types.MonthKey {
    let seconds = ns / 1_000_000_000;
    let days = seconds / 86_400;
    let (year, month) = civilFromDays(days);
    year.toText() # "-" # pad2(month);
  };

  /// Pad a month number to two digits.
  func pad2(n : Nat) : Text {
    if (n < 10) { "0" # n.toText() } else { n.toText() };
  };

  /// Convert days since the Unix epoch to a (year, month) pair.
  func civilFromDays(days : Int) : (Nat, Nat) {
    var year : Int = 1970;
    var remaining = days;
    loop {
      let length = if (isLeap(year)) { 366 } else { 365 };
      if (remaining < length) { break };
      remaining -= length;
      year += 1;
    };
    let lengths = monthLengths(year);
    var month : Nat = 1;
    var index : Nat = 0;
    while (index < 12) {
      let length = lengths[index];
      if (remaining < length) { break };
      remaining -= length;
      month += 1;
      index += 1;
    };
    (year.toNat(), month);
  };

  /// Whether a year is a leap year.
  func isLeap(year : Int) : Bool {
    (year % 4 == 0 and year % 100 != 0) or year % 400 == 0;
  };

  /// Month lengths for a given year.
  func monthLengths(year : Int) : [Int] {
    [31, if (isLeap(year)) { 29 } else { 28 }, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  };
};
