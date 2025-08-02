import Array "mo:base/Array";
import Types "../types";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Map "mo:core/Map";
import Order "mo:core/Order";
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

  public class ActivityManager(project_activity_logs_init : Types.ProjectActivityLogsMap) {
    public var project_activity : Types.ProjectActivityLogsMap = project_activity_logs_init;

    public func get_project_activity(project_id : Types.ProjectId) : Types.Response<[Types.ActivityLog]> {
      switch (Map.get(project_activity, Nat.compare, project_id)) {
        case (null) {
          return #err(Errors.NotFoundProject());
        };
        case (?_activity) {
          return #ok(_activity);
        };
      };
    };

    public func get_project_activity_all(payload : Types.PaginationPayload) : Types.Response<[(Types.ProjectId, [Types.ActivityLog])]> {
      let activity : [(Types.ProjectId, [Types.ActivityLog])] = Iter.toArray(Map.entries(project_activity));
      return #ok(Utility.paginate(activity, payload));
    };

    public func create_project_activity(project_id : Types.ProjectId) : Types.Response<Bool> {
      let exists = _exists_log(project_id);
      if (exists) { return #err(Errors.AlreadyCreated()) };

      // Create activity log for new project
      let activity_log : Types.ActivityLog = {
        id = 0;
        category = "Project";
        description = "Project created.";
        create_time = Utility.get_time_now(#nanoseconds);
      };

      // Set in mapping
      let new_logs : [Types.ActivityLog] = [activity_log];
      Map.add(project_activity, Nat.compare, project_id, new_logs);

      return #ok(true);
    };

    public func update_project_activity(
      project_id : Types.ProjectId,
      category : Text,
      description : Text,
    ) : Types.Response<Bool> {
      let logs : [Types.ActivityLog] = switch (Map.get(project_activity, Nat.compare, project_id)) {
        case (null) { return #err(Errors.NotFoundProject()) };
        case (?_logs) { _logs };
      };

      let updated_log : Types.ActivityLog = {
        id = logs.size();
        category = category;
        description = description;
        create_time = Utility.get_time_now(#nanoseconds);
      };

      let _new_array = Array.append(logs, [updated_log]);
      Map.add(project_activity, Nat.compare, project_id, _new_array);
      return #ok(true);

    };

    public func clear_all_logs() {
      project_activity := Map.empty<Types.ProjectId, [Types.ActivityLog]>();
    };

    public func clear_project_activity_logs(project_id : Types.ProjectId) : Types.Response<Bool> {
      let logs = switch (Map.get(project_activity, Nat.compare, project_id)) {
        case (null) { return #ok(true) };
        case (?_logs) { _logs };
      };

      Map.add(project_activity, Nat.compare, project_id, []);
      return #ok(true);
    };

    public func delete_project_activity_log(project_id : Types.ProjectId, log_id : Nat) : Types.Response<Bool> {
      let logs : [Types.ActivityLog] = switch (Map.get(project_activity, Nat.compare, project_id)) {
        case (null) {
          return #err(Errors.NotFoundProject());
        };
        case (?_logs) {
          _logs;
        };
      };

      // Remove the target log id
      let new_array : [Types.ActivityLog] = Array.filter(logs, func(l : Types.ActivityLog) : Bool { l.id == log_id });

      Map.add(project_activity, Nat.compare, project_id, new_array);

      return #ok(true);

    };
    /** End public methods*/

    private func _exists_log(project_id : Types.ProjectId) : Bool {
      let exists = switch (Map.get(project_activity, Nat.compare, project_id)) {
        case null { false };
        case (?activity) { true };
      };
    };
    /** End private methods*/

    /**Start stable management */

    // Function to get data for stable storage
    public func get_stable_data_project_activity() : [(Types.ProjectId, [Types.ActivityLog])] {
      Iter.toArray(Map.entries(project_activity));
    };

    public func load_from_stable_project_activity(stable_data : [(Types.ProjectId, [Types.ActivityLog])]) {
      project_activity := Map.fromIter<Types.ProjectId, [Types.ActivityLog]>(stable_data.vals(), Nat.compare);
    };

    /** End class */

  }

};
