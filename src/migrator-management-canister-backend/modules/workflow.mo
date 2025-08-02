import Array "mo:base/Array";
import Types "../types";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";
import Utility "../utils/Utility";
import Errors "errors";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Prelude "mo:base/Prelude";
import Error "mo:base/Error";
import Access "access";
import Map "mo:core/Map";

module {

  public class WorkflowManager(workflowInit : Types.WorkflowRunHistoryMap) {
    // private var workflow_run_history : Types.WorkflowRunHistory = HashMap.HashMap<Nat, [Types.WorkflowRunDetails]>(0, Nat.equal, Hash.hash); // Project id to run history
    public var workflow_run_history : Types.WorkflowRunHistoryMap = workflowInit; // Project id to run history

    public func get_workflow_history(project_id : Nat) : [Types.WorkflowRunDetails] {
      //   var workflow_run_history_array : [Types.WorkflowRunDetails] = switch (workflow_run_history.get(project_id)) {
      var workflow_run_history_array : [Types.WorkflowRunDetails] = switch (Map.get(workflow_run_history, Nat.compare, project_id)) {
        case null { [] };
        case (?workflow_run_history) { workflow_run_history };
      };
      return workflow_run_history_array;
    };

    public func get_workflow_history_all(payload : Types.PaginationPayload) : Types.Response<[(Nat, [Types.WorkflowRunDetails])]> {
      let history : [(Nat, [Types.WorkflowRunDetails])] = Iter.toArray(Map.entries(workflow_run_history));
      return #ok(Utility.paginate(history, payload));
    };

    public func update_workflow_run(project_id : Nat, workflow_run_details : Types.WorkflowRunDetails) : async Types.Result {
      let workflow_run_history_array = get_workflow_history(project_id);

      let target_workflow_run = Array.filter(
        workflow_run_history_array,
        func(workflow_run : Types.WorkflowRunDetails) : Bool {
          workflow_run.workflow_run_id == workflow_run_details.workflow_run_id;
        },
      );

      // Create new entry for workflow run
      if (target_workflow_run.size() == 0) {
        let updated_history = Array.append(workflow_run_history_array, [workflow_run_details]);
        // workflow_run_history.put(project_id, updated_history);
        Map.add(workflow_run_history, Nat.compare, project_id, updated_history);
        return #ok("New workflow run created for project: " # Nat.toText(project_id) # " with id: " # Nat.toText(workflow_run_details.workflow_run_id));
      };

      // Update existing entry for workflow run
      var updated_workflow_run : Types.WorkflowRunDetails = {
        workflow_run_id = target_workflow_run[0].workflow_run_id;
        repo_name = target_workflow_run[0].repo_name;
        date_created = target_workflow_run[0].date_created;
        status = workflow_run_details.status;
        branch = target_workflow_run[0].branch;
        commit_hash = target_workflow_run[0].commit_hash;
        error_message = target_workflow_run[0].error_message;
        size = workflow_run_details.size;
      };

      let updated_history = Array.map(
        workflow_run_history_array,
        func(run : Types.WorkflowRunDetails) : Types.WorkflowRunDetails {
          if (run.workflow_run_id == updated_workflow_run.workflow_run_id) {
            return updated_workflow_run;
          } else {
            return run;
          };
        },
      );

      //   workflow_run_history.put(project_id, updated_history);
      Map.add(workflow_run_history, Nat.compare, project_id, updated_history);

      return #ok("Workflow run updated");
    };

    public func delete_run_history_all() {
      //   workflow_run_history := HashMap.HashMap<Nat, [Types.WorkflowRunDetails]>(0, Nat.equal, Hash.hash);
      workflow_run_history := Map.empty<Nat, [Types.WorkflowRunDetails]>();
    };

    public func delete_run_history(project_id : Types.ProjectId) {
      //   workflow_run_history.delete(project_id);
      ignore Map.delete(workflow_run_history, Nat.compare, project_id);
    };

    /** End private methods*/

  }

};
