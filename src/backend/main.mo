import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Expose "mo:caffeineai-oql/Expose";
import Entity "mo:caffeineai-oql/Entity";
import MapEntity "mo:caffeineai-oql/MapEntity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import IntValue "mo:caffeineai-oql/IntValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import RoleValue "RoleValue";
import OptIntValue "OptIntValue";
import WorkerTypes "types/workers";
import ShiftTypes "types/shifts";
import WorkersApi "mixins/workers-api";
import ShiftsApi "mixins/shifts-api";
import ReportsApi "mixins/reports-api";
import ApiDocMixin "mixins/api-doc";

actor {
  let accessControlState : AccessControl.AccessControlState;
  let profiles : Map.Map<Principal, WorkerTypes.WorkerProfile>;
  let shifts : Map.Map<Nat, ShiftTypes.Shift>;
  let state : { var nextShiftId : Nat; var nextNoteId : Nat };

  include MixinAuthorization(accessControlState, null);
  include WorkersApi(accessControlState, profiles, shifts);
  include ShiftsApi(accessControlState, profiles, shifts, state);
  include ReportsApi(accessControlState, profiles, shifts);
  include ApiDocMixin();

  include Expose({
    entities = [
      profiles.toEntity("worker", "WorkerProfile", "id")
        .sample({ id = Principal.fromText("aaaaa-aa"); email = ""; name = ""; role = #worker; createdAt = 0 })
        .controllerOnly()
        .build(),
      shifts.toEntityManual("shift", "Shift", "id")
        .sample({ id = 0; worker = Principal.fromText("aaaaa-aa"); startTime = 0; endTime = null; durationNs = 0; cappedAtLimit = false; notes = []; createdAt = 0; updatedAt = 0 })
        .payload("worker", func s = s.worker)
        .payload("startTime", func s = s.startTime)
        .payload("endTime", func s = s.endTime)
        .payload("durationNs", func s = s.durationNs)
        .payload("cappedAtLimit", func s = s.cappedAtLimit)
        .payload("noteCount", func s = s.notes.size())
        .payload("createdAt", func s = s.createdAt)
        .payload("updatedAt", func s = s.updatedAt)
        .controllerOnly()
        .build(),
    ];
  });
};
