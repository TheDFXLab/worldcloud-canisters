import Map "mo:core/Map";
import Principal "mo:base/Principal";
import Types "../types";
import Nat "mo:base/Nat";

module Migration {
  public func migration(
    old : {
      var stable_book : [(Principal, [(Types.Token, Nat)])];
      var stable_workflow_run_history : [(Nat, [Types.WorkflowRunDetails])];
      var stable_role_map : [(Principal, Types.Role)];
      var stable_projects : [(Nat, Types.Project)];
      var stable_user_to_projects : [(Principal, [Nat])];
      var stable_canister_table : [(Principal, Types.CanisterDeployment)];
      var stable_slots : [(Nat, Types.ShareableCanister)];
      var stable_user_to_slot : [(Principal, ?Nat)];
      var stable_used_slots : [(Nat, Bool)];
      var stable_usage_logs : [(Principal, Types.UsageLog)];
      var stable_project_activity_logs : [(Types.ProjectId, [Types.ActivityLog])];
      var stable_deployed_canisters : [(Principal, Bool)];
      var stable_user_canisters : [(Principal, [Principal])];
    }
  ) : {
    var stable_book : Map.Map<Principal, Map.Map<Types.Token, Nat>>;
    var stable_workflow_run_history : Map.Map<Nat, [Types.WorkflowRunDetails]>;
    var stable_role_map : Types.RoleMap;
    var stable_projects : Types.ProjectsMap;
    var stable_user_to_projects : Types.UserToProjectsMap;
    var stable_canister_table : Types.CanisterDeploymentMap;
    var stable_slots : Types.SlotsMap;
    var stable_user_to_slot : Types.UserToSlotMap;
    var stable_used_slots : Types.UsedSlotsMap;
    var stable_usage_logs : Types.UsageLogsMap;
    var stable_project_activity_logs : Types.ProjectActivityLogsMap;
    var stable_deployed_canisters : Types.DeployedCanistersMap;
    var stable_user_canisters : Types.UserCanistersMap;

  } {
    // Create the outer map
    let outer_map = Map.empty<Principal, Map.Map<Types.Token, Nat>>();

    // For each (principal, tokenList) in the old stable_book
    for ((principal, tokenList) in old.stable_book.vals()) {
      // Convert tokenList ([(Types.Token, Nat)]) to a Map
      let inner_map = Map.fromIter<Types.Token, Nat>(tokenList.vals(), Principal.compare);
      // Insert into the outer map
      Map.add(outer_map, Principal.compare, principal, inner_map);
    };
    return {
      var stable_book = outer_map;
      var stable_workflow_run_history = Map.fromIter(old.stable_workflow_run_history.vals(), Nat.compare);
      var stable_role_map = Map.fromIter(old.stable_role_map.vals(), Principal.compare);
      var stable_projects = Map.fromIter(old.stable_projects.vals(), Nat.compare);
      var stable_user_to_projects = Map.fromIter(old.stable_user_to_projects.vals(), Principal.compare);
      var stable_canister_table = Map.fromIter(old.stable_canister_table.vals(), Principal.compare);
      var stable_slots = Map.fromIter(old.stable_slots.vals(), Nat.compare);
      var stable_user_to_slot = Map.fromIter(old.stable_user_to_slot.vals(), Principal.compare);
      var stable_used_slots = Map.fromIter(old.stable_used_slots.vals(), Nat.compare);
      var stable_usage_logs = Map.fromIter(old.stable_usage_logs.vals(), Principal.compare);
      var stable_project_activity_logs = Map.fromIter(old.stable_project_activity_logs.vals(), Nat.compare);
      var stable_deployed_canisters = Map.fromIter(old.stable_deployed_canisters.vals(), Principal.compare);
      var stable_user_canisters = Map.fromIter(old.stable_user_canisters.vals(), Principal.compare);
    };
  };
};
