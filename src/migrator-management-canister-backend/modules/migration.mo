import Map "mo:core/Map";
import Principal "mo:base/Principal";
import Types "../types";
import Nat "mo:base/Nat";
import TimeLib "mo:base/Time";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";

module Migration {
  // Define the old Subscription type that didn't have free_canisters
  // type Old {
  //   user_id : Principal;
  //   tier_id : Nat;
  //   canisters : [Principal];
  //   used_slots : Nat;
  //   max_slots : Nat;
  //   date_created : TimeLib.Time;
  //   date_updated : TimeLib.Time;
  // };

  public func migration(
    old : {
      // var canister_to_records_map : Map.Map<Principal, [Nat]>;
      // var cloudflare_records_map : Map.Map<Nat, Types.CreateRecordResponse>;
      var domain_registration : Map.Map<Types.DomainRegistrationId, Types.DomainRegistration>;
      var canister_to_domain_registration : Map.Map<Principal, [Types.DomainRegistrationId]>;
    }
  ) : {
    // var canister_to_records_map : Map.Map<Principal, [Types.DnsRecordId]>;
    // var cloudflare_records_map : Map.Map<Types.DnsRecordId, Types.CreateRecordResponse>;
    var canister_to_domain_registration : Map.Map<Principal, [Types.DomainRegistration]>;
    var domain_registration : Map.Map<Types.DomainRegistrationId, Types.DomainRegistration>;

  } {
    // Create new map for the migration
    let new_canister_to_domain_registration = Map.empty<Principal, [Types.DomainRegistration]>();

    // Iterate through old canister_to_domain_registration
    for ((canister_id, registration_ids) in Map.entries(old.canister_to_domain_registration)) {
      var registrations : [Types.DomainRegistration] = [];

      // For each registration ID, get the actual registration
      for (registration_id in registration_ids.vals()) {
        let registration_opt = Map.get(old.domain_registration, Text.compare, registration_id);
        switch (registration_opt) {
          case (?registration) {
            registrations := Array.append(registrations, [registration]);
          };
          case (null) {
            // Skip if registration not found
            Debug.print("Warning: Registration with id " # registration_id # " not found");
          };
        };
      };

      // Add to new map
      Map.add(new_canister_to_domain_registration, Principal.compare, canister_id, registrations);
    };

    return {

      var canister_to_domain_registration = new_canister_to_domain_registration;
      var domain_registration = old.domain_registration;

      // var canister_to_domain_registration = Map.empty<Principal, [Types.DomainRegistration]>();
      // var canister_to_records_map = Map.empty<Principal, [Types.DnsRecordId]>();
      // var cloudflare_records_map = Map.empty<Types.DnsRecordId, Types.CreateRecordResponse>();
      // var canister_to_records_map = Map;
      // var stable_workflow_run_history = Map.fromIter<Nat, [Types.WorkflowRunDetails]>(old.stable_workflow_run_history.vals(), Nat.compare);
      // var stable_role_map = Map.fromIter<Principal, Types.Role>(old.stable_role_map.vals(), Principal.compare);
      // var stable_projects = Map.fromIter<Nat, Types.Project>(old.stable_projects.vals(), Nat.compare);
      // var stable_user_to_projects = Map.fromIter<Principal, [Nat]>(old.stable_user_to_projects.vals(), Principal.compare);
      // var stable_canister_table = Map.fromIter<Principal, Types.CanisterDeployment>(old.stable_canister_table.vals(), Principal.compare);
      // var stable_slots = Map.fromIter<Nat, Types.ShareableCanister>(old.stable_slots.vals(), Nat.compare);
      // var stable_user_to_slot = Map.fromIter<Principal, ?Nat>(old.stable_user_to_slot.vals(), Principal.compare);
      // var stable_used_slots = Map.fromIter<Nat, Bool>(old.stable_used_slots.vals(), Nat.compare);
      // var stable_usage_logs = Map.fromIter<Principal, Types.UsageLog>(old.stable_usage_logs.vals(), Principal.compare);
      // var stable_project_activity_logs = Map.fromIter<Nat, [Types.ActivityLog]>(old.stable_project_activity_logs.vals(), Nat.compare);
    };
  };
};
