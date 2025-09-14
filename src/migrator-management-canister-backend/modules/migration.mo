import Map "mo:core/Map";
import Principal "mo:base/Principal";
import Types "../types";
import Nat "mo:base/Nat";
import TimeLib "mo:base/Time";
import Text "mo:base/Text";
import Utility "../utils/Utility";

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
  // Overview of a domain registration's records and status
  // type IcDomainRegistrationStatusOld = {
  //   #pending;
  //   #failed;
  //   #complete;
  // };

  // type IcDomainRegistrationOld = {
  //   request_id : Text; // Request id from calling registration endpoint
  //   is_apex : Bool; // Needed for custom domains outside our DNS
  //   domain : Text; // Main domain, should be 'worldcloud.app' for inside canister registration
  //   subdomain : Text; // Unique subdomain linking canister application
  //   status : IcDomainRegistrationStatusOld; // Registration status
  // };

  // type DomainRegistrationOld = {
  //   txt_domain_record_id : Text;
  //   cname_challenge_record_id : Text;
  //   cname_domain_record_id : Text;
  //   ic_registration : IcDomainRegistrationOld;
  // };

  type ProjectOld = {
    id : Nat;
    user : Principal;
    canister_id : ?Principal; // id of canister deployment
    name : Text;
    description : Text;
    tags : [Text];
    plan : Types.ProjectPlan;
    date_created : TimeLib.Time;
    date_updated : TimeLib.Time;
  };
  type ShareableCanisterOld = {
    id : Nat;
    project_id : ?Nat;
    canister_id : ?Principal;
    owner : Principal; // controller of the canister
    user : Principal; // current user of the canister
    start_timestamp : Nat; //time user occupied the canister
    create_timestamp : Nat; //time user occupied the canister
    duration : Nat; //total time allowed for a single user to occupy a canister
    start_cycles : Nat; // total cycles available at start_timestamp
    status : Types.SharedCanisterStatus;
  };

  type DomainRegistrationTimerOld = {
    timer_id : Nat;
    domain_registration_id : Nat;
    subdomain : Text;
    domain : Text;
    canister_id : Principal;
    created_at : Nat;
    max_retries : Nat;
    current_retries : Nat;
  };

  type CounterTypeOld = {
    #addon_id;
    #project_id;
    #subscription_id;
    #domain_registration_id;
  };

  public func migration(
    old : {
      var stable_projects : Map.Map<Nat, ProjectOld>;
      var stable_slots : Map.Map<Nat, ShareableCanisterOld>;
      var domain_registration_timers : Map.Map<Text, DomainRegistrationTimerOld>;
      var index_counter_map : Map.Map<CounterTypeOld, Nat>;
    }
  ) : {
    var stable_projects : Map.Map<Nat, Types.Project>;
    var stable_slots : Map.Map<Nat, Types.ShareableCanister>;
    var domain_registration_timers : Map.Map<Text, Types.DomainRegistrationTimer>;
    var index_counter_map : Map.Map<Types.CounterType, Nat>;
  } {
    // Migrate projects from old format to new format
    var stable_projects_migrated : Map.Map<Nat, Types.Project> = Map.empty<Nat, Types.Project>();
    for ((project_id, old_project) in Map.entries(old.stable_projects)) {
      let new_project : Types.Project = {
        id = old_project.id;
        user = old_project.user;
        canister_id = old_project.canister_id;
        name = old_project.name;
        description = old_project.description;
        tags = old_project.tags;
        plan = old_project.plan;
        url = null; // New field, set to null for migrated projects
        date_created = old_project.date_created;
        date_updated = old_project.date_updated;
      };
      Map.add(stable_projects_migrated, Nat.compare, project_id, new_project);
    };

    // Migrate shareable canisters from old format to new format
    var stable_slots_migrated : Map.Map<Nat, Types.ShareableCanister> = Map.empty<Nat, Types.ShareableCanister>();
    for ((slot_id, old_slot) in Map.entries(old.stable_slots)) {
      let new_slot : Types.ShareableCanister = {
        id = old_slot.id;
        project_id = old_slot.project_id;
        canister_id = old_slot.canister_id;
        owner = old_slot.owner;
        user = old_slot.user;
        start_timestamp = old_slot.start_timestamp;
        create_timestamp = old_slot.create_timestamp;
        duration = old_slot.duration;
        start_cycles = old_slot.start_cycles;
        status = old_slot.status;
        url = null; // New field, set to null for migrated slots
      };
      Map.add(stable_slots_migrated, Nat.compare, slot_id, new_slot);
    };

    var stable_domain_registration_timers_migrated : Map.Map<Text, Types.DomainRegistrationTimer> = Map.empty<Text, Types.DomainRegistrationTimer>();
    for ((id, old_timer) in Map.entries(old.domain_registration_timers)) {
      let new_timer : Types.DomainRegistrationTimer = {
        timer_id = old_timer.timer_id;
        project_id = null;
        domain_registration_id = old_timer.domain_registration_id;
        subdomain = old_timer.subdomain;
        domain = old_timer.domain;
        canister_id = old_timer.canister_id;
        created_at = old_timer.created_at;
        max_retries = old_timer.max_retries;
        current_retries = old_timer.current_retries;
      };

      Map.add(stable_domain_registration_timers_migrated, Text.compare, id, new_timer);
    };

    var stable_index_map_migrated : Map.Map<Types.CounterType, Nat> = Map.empty<Types.CounterType, Nat>();
    for ((type_, old_index) in Map.entries(old.index_counter_map)) {
      let new_index = old_index;
      Map.add(stable_index_map_migrated, Utility.compare_counter_type, type_, new_index);
    };

    Map.add(stable_index_map_migrated, Utility.compare_counter_type, #freemium_domain_registration_id, 0);

    return {
      var stable_projects = stable_projects_migrated;
      var stable_slots = stable_slots_migrated;
      var domain_registration_timers = stable_domain_registration_timers_migrated;
      var index_counter_map = stable_index_map_migrated;
    };
  };
};
