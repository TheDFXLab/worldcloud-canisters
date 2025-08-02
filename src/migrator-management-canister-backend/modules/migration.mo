import Map "mo:core/Map";
import Principal "mo:base/Principal";
import Types "../types";
import Nat "mo:base/Nat";
import TimeLib "mo:base/Time";

module Migration {
  // Define the old Subscription type that didn't have free_canisters
  type OldSubscription = {
    user_id : Principal;
    tier_id : Nat;
    canisters : [Principal];
    used_slots : Nat;
    max_slots : Nat;
    date_created : TimeLib.Time;
    date_updated : TimeLib.Time;
  };

  public func migration(
    old : {
      var stable_book : [(Principal, [(Types.Token, Nat)])];
      var stable_workflow_run_history : [(Principal, [Types.WorkflowRunDetails])];
      var stable_role_map : [(Principal, Types.Role)];
      // var stable_projects : [(Nat, Types.Project)];
      // var stable_user_to_projects : [(Principal, [Nat])];
      var stable_canister_table : [(Principal, Types.CanisterDeployment)];
      // var stable_slots : [(Nat, Types.ShareableCanister)];
      // var stable_user_to_slot : [(Principal, ?Nat)];
      // var stable_used_slots : [(Nat, Bool)];
      // var stable_usage_logs : [(Principal, Types.UsageLog)];
      // var stable_project_activity_logs : [(Types.ProjectId, [Types.ActivityLog])];
      var stable_deployed_canisters : [(Principal, Bool)];
      var stable_user_canisters : [(Principal, [Principal])];
      var stable_subscriptions : [(Principal, OldSubscription)];
    }
  ) : {
    var stable_book : Map.Map<Principal, Map.Map<Types.Token, Nat>>;
    // var stable_workflow_run_history : Map.Map<Nat, [Types.WorkflowRunDetails]>;
    var stable_role_map : Types.RoleMap;
    // var stable_projects : Types.ProjectsMap;
    // var stable_user_to_projects : Types.UserToProjectsMap;
    var stable_canister_table : Types.CanisterDeploymentMap;
    // var stable_slots : Types.SlotsMap;
    // var stable_user_to_slot : Types.UserToSlotMap;
    // var stable_used_slots : Types.UsedSlotsMap;
    // var stable_usage_logs : Types.UsageLogsMap;
    // var stable_project_activity_logs : Types.ProjectActivityLogsMap;
    var stable_deployed_canisters : Types.DeployedCanistersMap;
    var stable_user_canisters : Types.UserCanistersMap;
    var stable_subscriptions : Types.UserSubscriptionsMap;
    var stable_next_project_id : Nat;
    var stable_next_slot_id : Nat;
    var stable_next_canister_id : Nat;
    var stable_quota_timer_id : Nat;
    var stable_slot_id_active_timer : [Nat];
    var stable_quotas : Types.QuotasMap;
    var stable_system_timers : Types.TimersMap;
    // var stable_canister_files : [(Principal, [Types.StaticFile])];
    // var stable_assets_array : [Types.Asset];
    // var stable_chunks_array : [Types.AssetChunk];
    // var stable_pending_cycles : [(Principal, Nat)];
    var stable_timers : [(Nat, Nat)];
    // var asset_canister_wasm : ?[Nat8];
    var TREASURY_ACCOUNT : ?Principal;
  } {
    // Create the outer map for stable_book
    let outer_map = Map.empty<Principal, Map.Map<Types.Token, Nat>>();

    // For each (principal, tokenList) in the old stable_book
    for ((principal, tokenList) in old.stable_book.vals()) {
      // Convert tokenList ([(Types.Token, Nat)]) to a Map
      let inner_map = Map.fromIter<Types.Token, Nat>(tokenList.vals(), Principal.compare);
      // Insert into the outer map
      Map.add(outer_map, Principal.compare, principal, inner_map);
    };

    // Handle stable_subscriptions which might not have existed in the old version
    // and convert from OldSubscription to new Subscription type
    let subscriptions_map = switch (old.stable_subscriptions) {
      case (subscriptions) {
        let new_subscriptions_map = Map.empty<Principal, Types.Subscription>();
        for ((principal, old_subscription) in subscriptions.vals()) {
          // Convert OldSubscription to new Subscription by adding empty free_canisters
          let new_subscription : Types.Subscription = {
            user_id = old_subscription.user_id;
            tier_id = old_subscription.tier_id;
            canisters = old_subscription.canisters;
            free_canisters = []; // Initialize with empty array for old subscriptions
            used_slots = old_subscription.used_slots;
            max_slots = old_subscription.max_slots;
            date_created = old_subscription.date_created;
            date_updated = old_subscription.date_updated;
          };
          Map.add(new_subscriptions_map, Principal.compare, principal, new_subscription);
        };
        new_subscriptions_map;
      };
      // case (null) { Map.empty<Principal, Types.Subscription>() };
    };

    return {
      var stable_book = outer_map;
      // var stable_workflow_run_history = Map.fromIter<Nat, [Types.WorkflowRunDetails]>(old.stable_workflow_run_history.vals(), Nat.compare);
      var stable_role_map = Map.fromIter<Principal, Types.Role>(old.stable_role_map.vals(), Principal.compare);
      // var stable_projects = Map.fromIter<Nat, Types.Project>(old.stable_projects.vals(), Nat.compare);
      // var stable_user_to_projects = Map.fromIter<Principal, [Nat]>(old.stable_user_to_projects.vals(), Principal.compare);
      var stable_canister_table = Map.fromIter<Principal, Types.CanisterDeployment>(old.stable_canister_table.vals(), Principal.compare);
      // var stable_slots = Map.fromIter<Nat, Types.ShareableCanister>(old.stable_slots.vals(), Nat.compare);
      // var stable_user_to_slot = Map.fromIter<Principal, ?Nat>(old.stable_user_to_slot.vals(), Principal.compare);
      // var stable_used_slots = Map.fromIter<Nat, Bool>(old.stable_used_slots.vals(), Nat.compare);
      // var stable_usage_logs = Map.fromIter<Principal, Types.UsageLog>(old.stable_usage_logs.vals(), Principal.compare);
      // var stable_project_activity_logs = Map.fromIter<Nat, [Types.ActivityLog]>(old.stable_project_activity_logs.vals(), Nat.compare);
      var stable_deployed_canisters = Map.fromIter<Principal, Bool>(old.stable_deployed_canisters.vals(), Principal.compare);
      var stable_user_canisters = Map.fromIter<Principal, [Principal]>(old.stable_user_canisters.vals(), Principal.compare);
      var stable_subscriptions = subscriptions_map;

      // Initialize new stable variables that didn't exist before
      var stable_next_project_id : Nat = 0;
      var stable_next_slot_id : Nat = 0;
      var stable_next_canister_id : Nat = 0;
      var stable_quota_timer_id : Nat = 0;
      var stable_slot_id_active_timer : [Nat] = [];
      var stable_quotas : Types.QuotasMap = Map.empty<Principal, Types.Quota>();
      var stable_system_timers : Types.TimersMap = Map.empty<Nat, Nat>();
      // var stable_canister_files : [(Principal, [Types.StaticFile])] = [];
      // var stable_assets_array : [Types.Asset] = [];
      // var stable_chunks_array : [Types.AssetChunk] = [];
      // var stable_pending_cycles : [(Principal, Nat)] = [];
      var stable_timers : [(Nat, Nat)] = [];
      // var asset_canister_wasm : ?[Nat8] = null;
      var TREASURY_ACCOUNT : ?Principal = null;
    };
  };
};
