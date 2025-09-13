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
    /** Destructive Methods */
    public func drop_projects() : Bool {
      projects := Map.empty<Nat, Types.Project>();
      user_to_projects := Map.empty<Principal, [Nat]>();
      index_counter.reset_index(#project_id);
      return true;
    };

    public func drop_project(user : Principal, project_id : Nat) : Types.Response<Bool> {
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

    public func create_project(user : Principal, payload : Types.CreateProjectPayload) : Nat {
      let next_project_id : Nat = index_counter.get_index(#project_id);

      // Create the project record
      let project : Types.Project = {
        id = next_project_id;
        user = user;
        canister_id = null;
        name = payload.project_name;
        description = payload.project_description;
        tags = payload.tags;
        plan = payload.plan;
        date_created = Utility.get_time_now(#milliseconds);
        date_updated = Utility.get_time_now(#milliseconds);
      };

      // Store the records
      Map.add(projects, Nat.compare, next_project_id, project);
      let existing_projects : [Nat] = Utility.expect_else(Map.get(user_to_projects, Principal.compare, user), []);
      Map.add(user_to_projects, Principal.compare, user, Array.append(existing_projects, [next_project_id]));

      // Update the next project id
      index_counter.increment_index(#project_id);

      return next_project_id;
    };

    // Function to get current next_project_id for syncing with stable variable
    public func get_next_project_id() : Nat {
      index_counter.get_index(#project_id);
    };

    /** End class */
  }

};
