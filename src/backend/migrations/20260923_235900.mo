import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";

module {
  type WorkerProfile = {
    id : Principal;
    email : Text;
    name : Text;
    role : { #worker; #owner };
    createdAt : Int;
  };

  type ShiftNote = {
    id : Nat;
    author : Principal;
    authorName : Text;
    text : Text;
    createdAt : Int;
  };

  type Shift = {
    id : Nat;
    worker : Principal;
    startTime : Int;
    endTime : ?Int;
    durationNs : Int;
    cappedAtLimit : Bool;
    notes : [ShiftNote];
    createdAt : Int;
    updatedAt : Int;
  };

  type OldActor = {};

  type NewActor = {
    accessControlState : AccessControl.AccessControlState;
    profiles : Map.Map<Principal, WorkerProfile>;
    shifts : Map.Map<Nat, Shift>;
    state : { var nextShiftId : Nat; var nextNoteId : Nat };
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = AccessControl.initState();
      profiles = Map.empty();
      shifts = Map.empty();
      state = { var nextShiftId = 0; var nextNoteId = 0 };
    };
  };
};
