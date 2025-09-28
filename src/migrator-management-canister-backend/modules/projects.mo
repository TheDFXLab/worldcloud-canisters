import Array "mo:base/Array";
import Types "../types";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Map "mo:core/Map";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";
import Utility "../utils/Utility";
import Errors "errors";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Prelude "mo:base/Prelude";
import Error "mo:base/Error";
import Access "access";

module {

  public class ProjectManager(projects_init : Types.ProjectsMap, user_to_projects_init : Types.UserToProjectsMap, index_counter_init : Types.IndexCounterInterface) {
    public var projects : Types.ProjectsMap = projects_init;
    public var user_to_projects : Map.Map<Principal, [Nat]> = user_to_projects_init;
    public var index_counter : Types.IndexCounterInterface = index_counter_init;

    public var class_references : ?Types.ClassesInterface = null;

    public func init(class_reference_init : Types.ClassesInterface) {
      class_references := ?class_reference_init;
    };

    public func get_project_by_id(project_id : Nat) : Types.Response<Types.Project> {
      let project : Types.Project = switch (Map.get(projects, Nat.compare, project_id)) {
        case (null) { return #err(Errors.NotFoundProject()) };
        case (?_project) { _project };
      };

      return #ok(project);
    };

    public func put_project(project_id : Nat, payload : Types.Project) : () {
      Map.add(projects, Nat.compare, project_id, payload);
    };

    public func get_projects_by_user(user : Principal, payload : Types.GetProjectsByUserPayload) : Types.Response<[Types.Project]> {
      let project_ids : [Nat] = Utility.expect_else(Map.get(user_to_projects, Principal.compare, user), []);
      // Early return for empty projects
      if (project_ids.size() == 0) return #ok([]);

      let _limit = Utility.expect_else(payload.limit, 20);
      var _page = Utility.expect_else(payload.page, 0);

      // Paginate data
      var start = _page * _limit;
      var end = if (start + _limit >= project_ids.size() - 1) {
        project_ids.size() - 1; // Return empty array if start is beyond array bounds
      } else {
        start + _limit; // Don't go beyond array bounds
      };

      // If start is beyond array bounds, return empty array
      if (start >= project_ids.size()) {
        return #ok([]);
      };

      var result_projects : [Types.Project] = [];
      for (index in Iter.range(start, end)) {
        let project_id = project_ids[index];
        let project : Types.Project = switch (Map.get(projects, Nat.compare, project_id)) {
          case (null) { return #err(Errors.NotFoundProject()) };
          case (?val) { val };
        };
        result_projects := Array.append(result_projects, [project]);
      };

      #ok(result_projects);
    };

    public func get_all_projects_paginated(payload : Types.PaginationPayload) : Types.Response<[(Types.ProjectId, Types.Project)]> {
      let all_entries = Iter.toArray(Map.entries(projects));
      let paginated_entries = Utility.paginate(all_entries, payload);
      return #ok(paginated_entries);
    };

    public func is_freemium_session_active(project_id : Types.ProjectId) : Types.Response<Bool> {
      let project : Types.Project = switch (Map.get(projects, Nat.compare, project_id)) {
        case (null) { return #err(Errors.NotFoundProject()) };
        case (?p) { p };
      };

      switch (project.plan) {
        case (#paid) { return #ok(false) };
        case (#freemium) {
          if (project.canister_id == null) {
            return #ok(false);
          } else {
            return #ok(true);
          };
        };
      };
    };

    public func get_user_projects_batch_paginated(payload : Types.PaginationPayload) : Types.Response<[(Principal, [Types.Project])]> {
      let all_entries = Iter.toArray(Map.entries(user_to_projects));
      let paginated_entries = Utility.paginate(all_entries, payload);

      // Get paginated entries and fetch projects for each user
      var result : [(Principal, [Types.Project])] = [];
      for ((user, project_ids) in paginated_entries.vals()) {
        var user_projects : [Types.Project] = [];

        // Fetch projects for this user
        for (project_id in project_ids.vals()) {
          switch (Map.get(projects, Nat.compare, project_id)) {
            case (null) { /* Skip if project not found */ };
            case (?p) {
              user_projects := Array.append(user_projects, [p]);
            };
          };
        };

        result := Array.append(result, [(user, user_projects)]);
      };

      return #ok(result);
    };

    public func deploy_asset_canister(project_id : Types.ProjectId, backend_principal : Principal) : async Types.Response<Types.DeployAssetCanisterResponse> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _shareable_canister_manager = switch (_classes.shareable_canister_manager) {
        case (null) return #err(Errors.NotFoundClass("Shareable Canister Manager"));
        case (?val) val;
      };

      let _activity_manager = switch (_classes.activity_manager) {
        case (null) return #err(Errors.NotFoundClass("Activity Manager"));
        case (?val) val;
      };

      let _subscription_manager = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFoundClass("Subscription manager"));
        case (?val) val;
      };

      let _canisters = switch (_classes.canister_manager) {
        case (null) return #err(Errors.NotFoundClass("Canisters manager"));
        case (?val) val;
      };

      // Get project
      let project : Types.Project = switch (get_project_by_id(project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(_project)) { _project };
      };

      let deploy_result : Types.DeployAssetCanisterResponse = if (project.plan == #freemium) {
        // Get freemium session - allocates slot to project user
        // let _project : Types.Project = switch (await _request_freemium_session(project_id, msg.caller)) {
        let _request_session_res : Types.RequestFreemiumSessionResponse = switch (await _shareable_canister_manager.request_freemium_session(project_id, project.user, backend_principal)) {
          case (#err(_errMsg)) { return #err(_errMsg) };
          case (#ok(res)) { res };
        };

        // Get updated slot
        let slot = switch (_shareable_canister_manager.get_canister_by_user(project.user)) {
          case (#err(err)) { return #err(err) };
          case (#ok(null)) { return #err(Errors.NotFoundSlot()) };
          case (#ok(?val)) { val };
        };

        // Create timer for clearing freemium session
        // _set_cleanup_timer(slot.duration / 1_000, slot.id, _request_session_res.project.canister_id);
        // stable_next_slot_id := shareable_canister_manager.next_slot_id; // update stable storage
        // stable_slots := shareable_canister_manager.slots;
        // stable_next_slot_id := shareable_canister_manager.next_slot_id;

        // Record data in activity
        let _updated = switch (_activity_manager.update_project_activity(project_id, "Runner", "Session started. Using freemium runner.")) {
          case (#err(_msg)) {
            false;
          };
          case (#ok(is_updated)) { is_updated };
        };

        // Return result
        {
          project = _request_session_res.project;
          is_new_slot = _request_session_res.is_new_slot;
          slot = ?slot;
          canister_id = _request_session_res.canister_id;
        };

      } else if (project.plan == #paid) {
        // Ensure user doesnt go over subscription limit
        let can_subscribe = switch (_subscription_manager.validate_increment_slots_by_user(project.user)) {
          case (false) return #err(Errors.MaxSlotsReached());
          case (true) true;
        };

        // Handle Paid plan type
        let updated_project : Types.Project = switch (project.canister_id) {
          case (null) {
            let _canister_id : Principal = switch (await _canisters.deploy_asset_canister(project.user, false, backend_principal)) {
              case (#err(_errMsg)) { return #err(_errMsg) };
              case (#ok(id)) { id };
            };

            let _updated_project : Types.Project = {
              user = project.user;
              id = project.id;
              canister_id = ?_canister_id;
              name = project.name;
              description = project.description;
              tags = project.tags;
              plan = project.plan;
              url = null;
              date_created = project.date_created;
              date_updated = Utility.get_time_now(#milliseconds);
            };

            put_project(project_id, _updated_project);

            let updated = _activity_manager.update_project_activity(project_id, "Runner", "Attached premium runner.");
            _updated_project;
          };
          case (?id) { return #err(Errors.AlreadyCreated()) };
        };

        let new_canister : Principal = switch (updated_project.canister_id) {
          case (null) return #err(Errors.UnexpectedError("deterimining project canister id"));
          case (?val) val;
        };

        // Return result
        {
          project = updated_project;
          is_new_slot = false;
          slot = null;
          canister_id = new_canister;
        };
      } else {
        return #err(Errors.UnexpectedError("deploying asset canister"));
      };

      return #ok(deploy_result);
    };

    public func upload_assets_to_project(caller : Principal, payload : Types.StoreAssetInCanisterPayload) : async Types.Response<Bool> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _shareable_canister_manager = switch (_classes.shareable_canister_manager) {
        case (null) return #err(Errors.NotFoundClass("Shareable Canister Manager"));
        case (?val) val;
      };

      let _canisters = switch (_classes.canister_manager) {
        case (null) return #err(Errors.NotFoundClass("Canister Manager"));
        case (?val) val;
      };

      let _activity_manager = switch (_classes.activity_manager) {
        case (null) return #err(Errors.NotFoundClass("Activity Manager"));
        case (?val) val;
      };

      // Get project
      let project : Types.Project = switch (get_project_by_id(payload.project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(_project)) { _project };
      };

      // Get canister id
      let canister_id : Principal = switch (project.canister_id) {
        case (null) {
          return #err(Errors.NoCanisterInProject());
        };
        case (?id) {
          id;
        };
      };

      if (project.plan == #freemium) {
        let slot : ?Types.ShareableCanister = switch (_shareable_canister_manager.get_canister_by_user(caller)) {
          case (#err(err)) { return #err(err) };
          case (#ok(val)) { val };
        };

        let is_user = switch (slot) {
          case (null) { return #err(Errors.NotFoundSlot()) };
          case (?_slot) {
            if (not (caller == _slot.user)) {
              return #err(Errors.Unauthorized());
            };
            true;
          };
        };

      } else if (project.plan == #paid) {
        if (not (await _canisters.is_controller(canister_id, caller))) {
          return #err(Errors.Unauthorized());
        };
      };

      // TODO: pass caller as parameter
      let res = await _canisters.storeInAssetCanister(caller, payload.project_id, payload.files, payload.workflow_run_details);

      // Update logs for completion of all batches
      if (payload.current_batch == payload.total_batch_count) {
        let _updated_logs = _activity_manager.update_project_activity(payload.project_id, "Assets", "Assets upload complete.");
      } else if (payload.current_batch == 1) {
        let _updated_logs = _activity_manager.update_project_activity(payload.project_id, "Assets", "Uploading assets to runner.");
      };

      return res;
    };

    /** Destructive Methods */
    public func drop_projects() : Bool {
      projects := Map.empty<Nat, Types.Project>();
      user_to_projects := Map.empty<Principal, [Nat]>();
      index_counter.reset_index(#project_id);
      return true;
    };

    public func clear_project_session(project_id : ?Nat) : Types.Response<Bool> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _activity_manager = switch (_classes.activity_manager) {
        case (null) return #err(Errors.NotFoundClass("Activity manager"));
        case (?val) val;
      };

      // Ensure updating the correct project
      let _project_id : ?Nat = switch (project_id) {
        case (null) { null };
        case (?id) {
          let project : Types.Project = switch (get_project_by_id(id)) {
            case (#err(errMsg)) { return #err(errMsg) };
            case (#ok(_project)) { _project };
          };

          // Updated project object
          let updated_project : Types.Project = {
            user = project.user;
            id = project.id;
            canister_id = null;
            name = project.name;
            description = project.description;
            tags = project.tags;
            plan = project.plan;
            url = null;
            date_created = project.date_created;
            date_updated = Utility.get_time_now(#milliseconds);
          };

          // Update project activity
          let _update_activity = _activity_manager.update_project_activity(project.id, "Runner", "Freemium session ended.");

          // Apply update
          put_project(id, updated_project);
          ?id;
        };
      };
      return #ok(true);
    };

    public func clear_project_assets(caller : Principal, project_id : Types.ProjectId) : async Types.Response<()> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _canisters = switch (_classes.canister_manager) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      // Get project
      let project : Types.Project = switch (get_project_by_id(project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(_project)) { _project };
      };

      // Ensure caller is project owner
      if (not (project.user == caller)) {
        return #err(Errors.Unauthorized());
      };

      let canister_id : Principal = switch (project.canister_id) {
        case (null) { return #err(Errors.NotFoundCanister()) };
        case (?id) { id };
      };

      let _cleared = switch (await _canisters.clear_asset_canister(canister_id)) {
        case (#err(err)) { return #err(err) };
        case (#ok()) { true };
      };

      return #ok();
    };

    public func delete_project(project_id : Types.ProjectId, caller : Principal, actor_principal : Principal) : async Types.Response<Bool> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFoundClass("Subscription manager"));
        case (?val) val;
      };

      let _activity_manager = switch (_classes.activity_manager) {
        case (null) return #err(Errors.NotFoundClass("Activity manager"));
        case (?val) val;
      };

      let _shareable_canister_manager = switch (_classes.shareable_canister_manager) {
        case (null) return #err(Errors.NotFoundClass("Shareable canister manager"));
        case (?val) val;
      };

      let _workflow_manager = switch (_classes.workflow_manager) {
        case (null) return #err(Errors.NotFoundClass("Workflow manager"));
        case (?val) val;
      };

      let _canisters = switch (_classes.canister_manager) {
        case (null) return #err(Errors.NotFoundClass("Subscription manager"));
        case (?val) val;
      };

      // Get project
      let project : Types.Project = switch (get_project_by_id(project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(_project)) { _project };
      };

      // Cache canister in unused array for paid projects
      if (project.plan == #paid) {
        let _canister_id : ?Principal = switch (project.canister_id) {
          case (null) {
            null;
          };
          case (?id) {
            // Update subscription canister records
            switch (await _subscription_manager.update_sub_delete_project(caller, id)) {
              case (#err(errMsg)) {
                return #err(errMsg);
              };
              case (#ok()) {};
            };

            // stable_subscriptions := subscription_manager.subscriptions; // update stable storage

            // Clear asset canister files
            let res = switch (await _canisters.clear_asset_canister(id)) {
              case (#err(err)) return #err(err);
              case (#ok(val)) val;
            };
            ?id;
          };
        };
      } else if (project.plan == #freemium) {
        // Check if project is freemium and has an active premium session
        let active_session = switch (is_freemium_session_active(project_id)) {
          case (#err(errMsg)) { return #err(errMsg) };
          case (#ok(active)) { active };
        };

        // Clear active session
        if (active_session) {
          let slot : ?Types.ShareableCanister = switch (_shareable_canister_manager.get_canister_by_user(caller)) {
            case (#err(err)) {
              null;
            };
            case (#ok(null)) {
              null;
            };
            case (#ok(?s)) {
              // TODO: Check if needed
              // _delete_timer(s.id); // Delete session expiry timer
              let project_id : ?Nat = switch (_shareable_canister_manager.end_freemium_session(s.id, s.user, actor_principal)) {
                // End session gracefully
                case (#err(errMsg)) {
                  null;
                };
                case (#ok(id)) {
                  id;
                };
              };
              ?s;
            };
          };
        };
      };

      // Clear workflow run history
      _workflow_manager.delete_run_history(project_id);

      // Clear project activity logs
      let _cleared_activity_res = _activity_manager.clear_project_activity_logs(project_id);

      // Delete project and user association
      let _dropped_project = switch (drop_project(caller, project_id)) {
        case (#err(_errMsg)) { return #err(_errMsg) };
        case (#ok(is_dropped)) { is_dropped };
      };

      return #ok(true);
    };

    private func drop_project(user : Principal, project_id : Nat) : Types.Response<Bool> {
      let user_projects : [Nat] = switch (Map.get(user_to_projects, Principal.compare, user)) {
        case (null) { return #err(Errors.NotFoundProject()) };
        case (?projects) { projects };
      };

      var new_array : [Nat] = [];
      for (project_id_in_array in user_projects.vals()) {
        if (project_id_in_array != project_id) {
          new_array := Array.append(new_array, [project_id_in_array]);
        };
      };

      Map.add(user_to_projects, Principal.compare, user, new_array);
      ignore Map.delete(projects, Nat.compare, project_id);
      return #ok(true);
    };

    public func create_project(user : Principal, payload : Types.CreateProjectPayload) : async Types.Response<Types.CreateProjectResponse> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFoundClass("Subscription manager"));
        case (?val) val;
      };

      let _index_manager = switch (_classes.index_counter_manager) {
        case (null) return #err(Errors.NotFoundClass("Index counter manager"));
        case (?val) val;
      };

      let _activity_manager = switch (_classes.activity_manager) {
        case (null) return #err(Errors.NotFoundClass("Activity manager"));
        case (?val) val;
      };

      // Ensure user doesnt go over subscription limit
      let can_subscribe = switch (_subscription_manager.validate_increment_slots_by_user(user)) {
        case (false) return #err(Errors.MaxSlotsReached());
        case (true) true;
      };

      let subscription : Types.Subscription = switch (_subscription_manager.get_subscription(user)) {
        case (#err(err)) {
          if (err == Errors.SubscriptionNotFound() and payload.plan == #freemium) return #err(Errors.FreemiumSubscriptionRequired());
          if (err == Errors.SubscriptionNotFound() and payload.plan == #paid) return #err(Errors.SubscriptionRequired());
          return #err(err);
        };
        case (#ok(val)) { val };
      };

      let new_project_id : Nat = index_counter.get_index(#project_id);

      // Create the project record
      let project : Types.Project = {
        id = new_project_id;
        user = user;
        canister_id = null;
        name = payload.project_name;
        description = payload.project_description;
        tags = payload.tags;
        plan = payload.plan;
        url = null;
        date_created = Utility.get_time_now(#milliseconds);
        date_updated = Utility.get_time_now(#milliseconds);
      };

      // Store the records
      Map.add(projects, Nat.compare, new_project_id, project);
      let existing_projects : [Nat] = Utility.expect_else(Map.get(user_to_projects, Principal.compare, user), []);
      Map.add(user_to_projects, Principal.compare, user, Array.append(existing_projects, [new_project_id]));

      // Update the next project id
      _index_manager.increment_index(#project_id);

      let is_created_log = switch (_activity_manager.create_project_activity(new_project_id)) {
        case (#err(_msg)) { return #err(_msg) };
        case (#ok(result)) { result };
      };

      return #ok({
        project_id = new_project_id;
        is_freemium = switch (payload.plan) {
          case (#freemium) { true };
          case (#paid) { false };
        };
      });
    };

    public func set_project_url(project_id : Types.ProjectId, url : Text) : Types.Response<Types.Project> {
      let project : Types.Project = switch (get_project_by_id(project_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Prevent freemium projects from updating project url
      if (project.plan == #freemium) return #err(Errors.PremiumFeature());

      // Update url
      let updated_project : Types.Project = {
        project with url = ?url;
      };

      Map.add(projects, Nat.compare, project_id, updated_project);

      return #ok(project);
    };

    // Function to get current next_project_id for syncing with stable variable
    public func get_next_project_id() : Nat {
      index_counter.get_index(#project_id);
    };

    /// Validates access to a project to either admins, or to owner of a project
    public func validate_project_access(user : Principal, project_id : Nat) : Types.Response<Bool> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _access_control = switch (_classes.access_control_manager) {
        case (null) return #err(Errors.NotFoundClass("Access control manager"));
        case (?val) val;
      };

      // Reject anonymous users
      if (Utility.is_anonymous(user)) return #err(Errors.Unauthorized());

      // Allow admin access
      let is_authorized = _access_control.is_authorized(user);
      if (is_authorized) {
        return #ok(true);
      };

      // Ensure users access their own projects
      let project : Types.Project = switch (get_project_by_id(project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(_project)) { _project };
      };

      // Ensure user access to own project
      if (not (project.user == user)) {
        return #err(Errors.Unauthorized());
      };

      return #ok(true);
    };

    /** End class */
  }

};
