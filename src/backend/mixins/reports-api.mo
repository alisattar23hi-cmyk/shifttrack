import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/reports";
import ShiftTypes "../types/shifts";
import WorkerTypes "../types/workers";
import ReportsLib "../lib/reports";
import WorkersLib "../lib/workers";

mixin (
  accessControlState : AccessControl.AccessControlState,
  profiles : Map.Map<Principal, WorkerTypes.WorkerProfile>,
  shifts : Map.Map<Nat, ShiftTypes.Shift>,
) {
  /// Return the caller's own monthly report.
  public query ({ caller }) func getMyMonthlyReport(month : Types.MonthKey) : async Types.WorkerMonthlyReport {
    let name = switch (WorkersLib.getProfile(profiles, caller)) {
      case (?profile) { profile.name };
      case null { "" };
    };
    ReportsLib.workerMonthlyReport(shifts, caller, name, month);
  };

  /// Return any worker's monthly report. Owner only.
  public query ({ caller }) func getWorkerMonthlyReport(worker : Principal, month : Types.MonthKey) : async Types.WorkerMonthlyReport {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Owner only");
    };
    let name = switch (WorkersLib.getProfile(profiles, worker)) {
      case (?profile) { profile.name };
      case null { "" };
    };
    ReportsLib.workerMonthlyReport(shifts, worker, name, month);
  };

  /// Return the owner's monthly report across all workers. Owner only.
  public query ({ caller }) func getAllWorkersMonthlyReport(month : Types.MonthKey) : async Types.AllWorkersMonthlyReport {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Owner only");
    };
    ReportsLib.allWorkersMonthlyReport(shifts, profiles, month);
  };

  /// Export a monthly report as a downloadable CSV document. Owner only.
  public query ({ caller }) func exportMonthlyReport(month : Types.MonthKey) : async Types.ExportResult {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #notAuthorized;
    };
    let report = ReportsLib.allWorkersMonthlyReport(shifts, profiles, month);
    #ok(ReportsLib.exportMonthlyReport(report));
  };
};
