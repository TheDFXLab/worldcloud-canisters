// asset_manager.mo

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Nat64 "mo:base/Nat64";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Errors "modules/errors";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Types "types";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Principal "mo:base/Principal";
import Bool "mo:base/Bool";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Timer "mo:base/Timer";
import Account "Account";
import Book "./book";
import SubscriptionManager "./modules/subscription";
import AccessControl "./modules/access";
import Hex "./utils/Hex";
import SHA256 "./utils/SHA256";
import CanisterShareable "modules/canister_shareable";
import Utility "utils/Utility";
import ProjectManager "modules/projects";
import WorkflowManager "modules/workflow";
import ActivityManager "modules/activity";

// TODO: Remove all deprecated code such as `initializeAsset`, `uploadChunk`, `getAsset`, `getChunk`, `isAssetComplete`, `deleteAsset`
// TODO: Handle stable variables (if needed)
// TODO: Remove unneeded if else in `storeInAssetCanister` for handling files larger than ±2MB (since its handled by frontend)
shared (deployMsg) actor class CanisterManager() = this {

  // var IC_MANAGEMENT_CANISTER : Text = "rwlgt-iiaaa-aaaaa-aaaaa-cai"; // Local replica
  let IC_MANAGEMENT_CANISTER = "aaaaa-aa"; // Production
  let ledger : Principal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
  let BASE_CANISTER_START_CYCLES = 230_949_972_000;

  // TODO: Get these from price oracle canister
  let ICP_PRICE : Float = 10;
  let XDR_PRICE : Float = 1.33;
  let E8S_PER_ICP : Float = 100_000_000;
  let CYCLES_PER_XDR : Float = 1_000_000_000_000;

  let icp_fee : Nat = 10_000;
  let Ledger : Types.Ledger = actor (Principal.toText(ledger));

  private stable var asset_canister_wasm : ?[Nat8] = null; // Store the WASM bytes in stable memor
  private var canister_files = HashMap.HashMap<Principal, [Types.StaticFile]>(0, Principal.equal, Principal.hash);
  private var deployed_canisters = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);

  private var assets = HashMap.HashMap<Types.AssetId, Types.Asset>(0, Text.equal, Text.hash); //Store asset metadata

  //Store chunks for each asset
  //Key format: "assetId:chunkId"
  private var chunks = HashMap.HashMap<Text, Blob>(0, Text.equal, Text.hash);
  private var canisterBatchMap : Types.CanisterBatchMap = HashMap.HashMap<Principal, (Types.BatchMap, Types.BatchChunks)>(0, Principal.equal, Principal.hash);
  private var user_canisters : Types.UserCanisters = HashMap.HashMap<Principal, [Principal]>(0, Principal.equal, Principal.hash);
  private var pending_cycles : HashMap.HashMap<Principal, Nat> = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
  private var book : Book.Book = Book.Book();
  // private var workflow_run_history : Types.WorkflowRunHistory = HashMap.HashMap<Principal, [Types.WorkflowRunDetails]>(0, Principal.equal, Principal.hash);
  private var timers : HashMap.HashMap<Nat, Nat> = HashMap.HashMap<Nat, Nat>(0, Nat.equal, Hash.hash);

  /** Canister & Asset stables */
  private stable var stable_canister_files : [(Principal, [Types.StaticFile])] = [];
  private stable var stable_deployed_canisters : [(Principal, Bool)] = [];
  private stable var stable_user_canisters : [(Principal, [Principal])] = [];
  private stable var stable_assets_array : [Types.Asset] = [];
  private stable var stable_chunks_array : [Types.AssetChunk] = [];
  private stable var stable_canister_table : [(Principal, Types.CanisterDeployment)] = [];
  private stable var stable_pending_cycles : [(Principal, Nat)] = [];

  /** Timer Stables*/
  private stable var stable_timers : [(Nat, Nat)] = [];
  private stable var stable_slot_id_active_timer : [Nat] = [];

  /** Book Stables */
  private stable var stable_book : [(Principal, [(Types.Token, Nat)])] = [];

  /** Github Stables*/
  private stable var stable_workflow_run_history : [(Nat, [Types.WorkflowRunDetails])] = [];

  /** Subscription Stables */
  private stable var stable_subscriptions : [(Principal, Types.Subscription)] = [];

  /** Access Control Stables */
  private stable var stable_role_map : [(Principal, Types.Role)] = [];

  /** Projects Stables */
  private stable var stable_projects : [(Nat, Types.Project)] = [];
  private stable var stable_user_to_projects : [(Principal, [Nat])] = [];
  private stable var stable_next_project_id : Nat = 0;

  /** Shareable canister stables */
  private stable var stable_slots : [(Nat, Types.ShareableCanister)] = [];
  private stable var stable_user_to_slot : [(Principal, ?Nat)] = [];
  private stable var stable_used_slots : [(Nat, Bool)] = [];
  private stable var stable_usage_logs : [(Principal, Types.UsageLog)] = [];
  private stable var stable_next_canister_id : Nat = 0;
  private stable var stable_next_slot_id : Nat = 0;
  private stable var stable_project_activity_logs : [(Types.ProjectId, [Types.ActivityLog])] = [];

  /** Classes Instances */
  private let project_manager = ProjectManager.ProjectManager();
  private let subscription_manager = SubscriptionManager.SubscriptionManager(book, ledger);
  private let access_control = AccessControl.AccessControl(deployMsg.caller);
  private let signatures = HashMap.HashMap<Principal, Blob>(0, Principal.equal, Principal.hash);
  private let shareable_canister_manager = CanisterShareable.ShareableCanisterManager();
  private let workflow_manager = WorkflowManager.WorkflowManager();
  private let activity_manager = ActivityManager.ActivityManager();

  /*
   *
   * END CLASSES AND VARIABLES
   *
   */

  /*
   *
   * START SLOTS METHODS (Shareable canisters)
   *
   */
  public shared (msg) func get_projects_by_user(payload : Types.GetProjectsByUserPayload) : async Types.Response<[Types.Project]> {
    // TODO: REENABLE
    // assert not Principal.isAnonymous(msg.caller);
    await project_manager.get_projects_by_user(msg.caller, payload);
  };

  public shared (msg) func get_user_usage() : async Types.Response<Types.UsageLog> {
    return #ok(shareable_canister_manager.get_user_usage(msg.caller));
  };

  /** Shareable Canisters */
  public shared (msg) func get_slots(limit : ?Nat, index : ?Nat) : async Types.Response<[Types.ShareableCanister]> {
    // assert (access_control.is_authorized(msg.caller));
    // if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());

    #ok(shareable_canister_manager.get_slots(limit, index));
  };

  public shared (msg) func get_available_slots(limit : ?Nat, index : ?Nat) : async Types.Response<[Nat]> {
    // assert (access_control.is_authorized(msg.caller));
    // if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());

    #ok(shareable_canister_manager.get_available_slots());
  };

  public shared (msg) func get_user_slot() : async Types.Response<?Types.ShareableCanister> {
    assert not Principal.isAnonymous(msg.caller);

    #ok(shareable_canister_manager.get_canister_by_user(msg.caller));
  };

  public shared (msg) func get_used_slots() : async [(Nat, Bool)] {
    return shareable_canister_manager.get_used_slots();
  };

  public shared (msg) func get_slot_by_id(slot_id : Nat) : async Types.Response<Types.ShareableCanister> {
    return shareable_canister_manager.get_canister_by_slot(slot_id);
  };

  private func get_available_slot_id(caller : Principal, project_id : Nat) : async Types.Response<Nat> {
    // Find available slots
    let available_slot_ids : [Nat] = shareable_canister_manager.get_available_slots();
    // Create new canister and slot if no available shared canisters
    if (available_slot_ids.size() == 0) {

      Debug.print("No available canister slots, creating new one...");
      let new_canister_id : Principal = switch (await _deploy_asset_canister(Principal.fromActor(this), true)) {
        case (#err(_errMsg)) { return #err(_errMsg) };
        case (#ok(id)) { id };
      };

      Debug.print("[Canister " # Principal.toText(new_canister_id) # "] Code installed");

      let slot_id = switch (
        shareable_canister_manager.create_slot(
          Principal.fromActor(this),
          caller,
          new_canister_id,
          ?project_id,
          BASE_CANISTER_START_CYCLES,
        )
      ) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(id)) { id };
      };

      Debug.print("Slot created with id:" # Nat.toText(slot_id));
      return #ok(slot_id);
    } else {
      return #ok(available_slot_ids[0]);
    };
  };
  /*
   *
   * END SLOT METHODS
   *
   */

  /*
   *
   * START ADMIN METHODS
   *
   */
  public shared (msg) func admin_delete_usage_logs() : async () {
    return shareable_canister_manager.admin_clear_usage_logs();
  };
  public shared (msg) func update_slot(slot_id : Nat, updated_slot : Types.ShareableCanister) : async Types.Response<Types.ShareableCanister> {
    shareable_canister_manager.update_slot(slot_id, updated_slot);
  };
  public shared (msg) func delete_projects() : async Bool {
    return project_manager.drop_projects();
  };

  public shared (msg) func delete_workflow_run_history() : async () {
    return workflow_manager.delete_run_history_all();
  };

  public shared (msg) func delete_workflow_run_history_by_user(project_id : Types.ProjectId) : async Types.Response<()> {
    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return #ok(workflow_manager.delete_run_history(project_id));
  };

  public shared (msg) func delete_project(project_id : Nat) : async Types.Response<Bool> {
    // Ensure access to project owner only
    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Cache canister in unused array for paid projects
    if (project.plan == #paid) {
      let canister_id : ?Principal = switch (project.canister_id) {
        case (null) {
          Debug.print("No Canister found for project");
          null;
        };
        case (?id) {
          // Update subscription canister records
          switch (await subscription_manager.update_sub_delete_project(msg.caller, id)) {
            case (#err(errMsg)) {
              Debug.print("Failed to update subscription for delete project." # errMsg);
            };
            case (#ok()) {
              Debug.print("Update subscription for delete project.");
            };
          };
          ?id;
        };
      };
    } else if (project.plan == #freemium) {
      // Check if project is freemium and has an active premium session
      let active_session = switch (project_manager.is_freemium_session_active(project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(active)) { active };
      };

      // Clear active session
      if (active_session) {
        let slot : ?Types.ShareableCanister = switch (shareable_canister_manager.get_canister_by_user(msg.caller)) {
          case (null) {
            Debug.print("No slot");
            null;
          };
          case (?s) {
            _delete_timer(s.id); // Delete session expiry timer
            let project_id : ?Nat = switch (_end_freemium_session(s.id)) {
              // End session gracefully
              case (#err(errMsg)) {
                // TODO: Handle error
                Debug.print("error happened");
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
    workflow_manager.delete_run_history(project_id);

    // Clear project activity logs
    let _cleared_activity_res = activity_manager.clear_project_activity_logs(project_id);

    // Delete project and user association
    let _dropped_project = switch (project_manager.drop_project(msg.caller, project_id)) {
      case (#err(_errMsg)) { return #err(_errMsg) };
      case (#ok(is_dropped)) { is_dropped };
    };

    return #ok(true);
  };
  public shared (msg) func reset_slots() {
    return shareable_canister_manager.reset_slots(Principal.fromActor(this));
  };

  public shared (msg) func purge_expired_sessions() {
    let slots : [Types.ShareableCanister] = shareable_canister_manager.get_slots(null, null);
    var failed : [Nat] = [];
    for ((slot_id, slot_entry) in shareable_canister_manager.slots.entries()) {
      Debug.print("[purge_expired_sessions] Checking slot #" # Nat.toText(slot_id));
      let is_expired = switch (shareable_canister_manager.is_expired_session(slot_id)) {
        case (#err(errMsg)) {
          Debug.trap("Error determining expired session for slot id #: " # Nat.toText(slot_id) # ". Error: " # errMsg);
        };
        case (#ok(is_e)) {
          is_e;
        };
      };

      // Handle expired slots
      if (is_expired) {
        Debug.print("[purge_expired_sessions] Slot #" # Nat.toText(slot_id) # " is expired. Ending freemium session.");
        let project_id : ?Nat = switch (_end_freemium_session(slot_id)) {
          case (#err(msg)) {
            Debug.print("[purge_expired_sessions] Failed to end freemium session. Error: " # msg);
            let _new_array = Array.append(failed, [slot_id]);
            null;
          };
          case (#ok(id)) {
            _delete_timer(slot_id);
            Debug.print("[purge_expired_sessions] Project session ended.");
            id;
          };
        };
        Debug.print("Successfully purged session for project id #" # debug_show (project_id));
      };
    };

    if (failed.size() > 0) {
      Debug.print("Failed to purge " # Nat.toText(failed.size()) # " slots.");
    };

  };

  /*
   *
   * END ADMIN METHODS
   *
   */

  /*
   *
   * START ACTIVITY METHODS
   *
   */

  public shared (msg) func delete_all_logs() {
    return activity_manager.clear_all_logs();
  };

  /*
   *
   * END ACTIVITY METHODS
   *
   */

  /*
   *
   * START PROJECT CREATION METHODS
   *
   */

  // Step 1, create project and get project id
  // Creates a new project (freemium and)
  // TODO: Add validation for subscriptoin for paid projects
  public shared (msg) func create_project(payload : Types.CreateProjectPayload) : async Types.Response<Types.CreateProjectResponse> {
    assert not Principal.isAnonymous(msg.caller);

    let project_id : Nat = project_manager.create_project(
      msg.caller,
      payload,
    );

    let is_created_log = switch (activity_manager.create_project_activity(project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(result)) { result };
    };

    Debug.print("Is created log");

    return #ok({
      project_id = project_id;
      is_freemium = switch (payload.plan) {
        case (#freemium) { true };
        case (#paid) { false };
      };
    });
  };

  // Step 2 (freemium projects) -> request a session
  // Step 2 (paid projects) -> deploy a canister
  // Create a canister for freemium
  public shared (msg) func deployAssetCanister(project_id : Nat) : async Types.Result {
    // assert not Principal.isAnonymous(msg.caller);
    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    if (project.plan == #freemium) {
      // Get freemium session - allocates slot to project user
      let _project : Types.Project = switch (await _request_freemium_session(project_id, msg.caller)) {
        case (#err(_errMsg)) { return #err(_errMsg) };
        case (#ok(project)) { project };
      };
      Debug.print("Project freemium session started");

      // Get updated slot
      let slot = switch (shareable_canister_manager.get_canister_by_user(msg.caller)) {
        case (null) { return #err(Errors.NotFoundSlot()) };
        case (?_slot) { _slot };
      };
      Debug.print("Got slot ");

      // Create timer for clearing freemium session
      _set_cleanup_timer(slot.duration, slot.id);
      Debug.print("Set up clearn up timer");

      // Record data in activity
      let _updated = switch (activity_manager.update_project_activity(project_id, "Runner", "Session started. Using freemium runner.")) {
        case (#err(_msg)) {
          Debug.print("Failed to update activity log for project " # Nat.toText(project_id) # ". Error: " # _msg);
        };
        case (#ok(is_updated)) { is_updated };
      };

      Debug.print("Updated project activity for attached canister..");

      // Return canister id for updated project
      return #ok(
        Principal.toText(
          switch (_project.canister_id) {
            case (null) { return #err(Errors.NotFoundCanister()) };
            case (?id) { id };
          }
        )
      );
    } else if (project.plan == #paid) {
      // Handle Paid plan type
      let canister_id : Principal = switch (project.canister_id) {
        case (null) {
          let canister_id : Principal = switch (await _deploy_asset_canister(msg.caller, false)) {
            case (#err(_errMsg)) { return #err(_errMsg) };
            case (#ok(id)) { id };
          };

          let updated_project : Types.Project = {
            user = msg.caller;
            id = project.id;
            canister_id = ?canister_id;
            name = project.name;
            description = project.description;
            tags = project.tags;
            plan = project.plan;
            date_created = project.date_created;
            date_updated = Utility.get_time_now(#milliseconds);
          };
          project_manager.put_project(project_id, updated_project);
          let updated = activity_manager.update_project_activity(project_id, "Runner", "Attached premium runner.");
          canister_id;
        };
        case (?id) { return #err(Errors.AlreadyCreated()) };
      };

      return #ok(Principal.toText(canister_id));
    };

    return #err(Errors.FailedDeployCanister());
  };

  // Step 3: Upload assets to project's canister
  // Upload files to project's asset canister
  public shared (msg) func upload_assets_to_project(
    payload : Types.StoreAssetInCanisterPayload
  ) : async Types.Response<Bool> {
    // assert not Principal.isAnonymous(msg.caller);
    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(payload.project_id)) {
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
      let slot : ?Types.ShareableCanister = shareable_canister_manager.get_canister_by_user(msg.caller);
      switch (slot) {
        case (null) { return #err(Errors.NotFoundSlot()) };
        case (?_slot) {
          if (not (msg.caller == _slot.user)) {
            return #err(Errors.Unauthorized());
          };
        };
      }

    } else if (project.plan == #paid) {
      if (not (await _isController(canister_id, msg.caller))) {
        return #err(Errors.Unauthorized());
      };
    };

    // TODO: pass caller as parameter
    let res = await storeInAssetCanister(payload.project_id, payload.files, payload.workflow_run_details);

    // Update logs for completion of all batches
    if (payload.current_batch == payload.total_batch_count) {
      let _updated_logs = activity_manager.update_project_activity(payload.project_id, "Assets", "Assets upload complete.");
    } else if (payload.current_batch == 1) {
      let _updated_logs = activity_manager.update_project_activity(payload.project_id, "Assets", "Uploading assets to runner.");
    };

    return res;
  };

  /*
   * END PROJECT CREATION METHODS
   *
   */

  /*
   * START FREEMIUM METHODS
   *
   */

  // Entrypoint for deploying a free canister
  private func _request_freemium_session(project_id : Nat, caller : Principal) : async Types.Response<Types.Project> {

    // assert not Principal.isAnonymous(caller);
    // TODO: assert is registered user

    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Ensure freemium project type
    if (not (project.plan == #freemium)) {
      return #err(Errors.NotFreemiumType());
    };

    // Find available slots
    let slot_id : Nat = switch (await get_available_slot_id(caller, project_id)) {
      case (#err(_errMsg)) { return #err(_errMsg) };
      case (#ok(id)) { id };
    };

    Debug.print("Available slot ID: " # Nat.toText(slot_id));
    Debug.print("Requesting a session...");

    // Request a session - updates slot with new project session
    let slot : Types.ShareableCanister = switch (await shareable_canister_manager.request_session(caller, project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(null)) { return #err(Errors.NotFoundSlot()) };
      case (#ok(?_slot)) { _slot };
    };

    // Update project record with new session
    let updated_project : Types.Project = {
      user = caller;
      id = project.id;
      canister_id = slot.canister_id;
      name = project.name;
      description = project.description;
      tags = project.tags;
      plan = project.plan;
      date_created = project.date_created;
      date_updated = Utility.get_time_now(#milliseconds);
    };
    project_manager.put_project(project_id, updated_project);

    return #ok(updated_project);
  };

  public shared (msg) func end_freemium_session(slot_id : Nat) : async Types.Response<?Nat> {
    let response = _end_freemium_session(slot_id);

    _delete_timer(slot_id); // Clear the timer and pop from stable array of timer ids
    response;
  };

  private func _end_freemium_session(slot_id : Nat) : Types.Response<?Nat> {
    let slot : Types.ShareableCanister = switch (shareable_canister_manager.get_canister_by_slot(slot_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(_slot)) { _slot };
    };
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let cycles = 0;

    // Assert updating the correct project
    let _project_id : ?Nat = switch (slot.project_id) {
      case (null) { null };
      case (?id) {
        let project : Types.Project = switch (project_manager.get_project_by_id(id)) {
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
          date_created = project.date_created;
          date_updated = Utility.get_time_now(#milliseconds);
        };

        // Update project activity
        let _update_activity = activity_manager.update_project_activity(project.id, "Runner", "Freemium session ended.");

        // Apply update
        project_manager.put_project(id, updated_project);
        ?id;
      };
    };

    let response = shareable_canister_manager.terminate_session(slot_id, cycles);

    Debug.print("[_end_freemium_session] Ended freemium session for slot #" # Nat.toText(slot_id));
    response;
  };

  /*
   *
   * END FREEMIUM METHODS
   *
   */

  /*
   *
   * START ACTIVITY LOG METHODS
   *
   */

  public shared (msg) func get_project_activity_logs(project_id : Types.ProjectId) : async Types.Response<[Types.ActivityLog]> {
    // TODO: REENABLE
    // let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
    // case (#err(_msg)) { return #err(_msg) };
    // case (#ok(authorized)) { authorized };
    // };
    return activity_manager.get_project_activity(project_id);
  };

  /*
   *
   * START WORKFLOW METHODS
   *
   */

  public shared (msg) func getWorkflowRunHistory(project_id : Nat) : async Types.Response<[Types.WorkflowRunDetails]> {
    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    // let canister_id = switch (_get_canister_id_by_project(project_id)) {
    //   case (#err(_msg)) { return #err(_msg) };
    //   case (#ok(id)) { id };
    // };

    return #ok(workflow_manager.get_workflow_history(project_id));
  };

  /*
   *
   * END WORKFLOW METHODS
   *
   */

  /*
   *
   * START CANISTER METHODS
   *
   */

  public shared (msg) func getCanisterStatus(project_id : Nat) : async Types.Response<Types.CanisterStatusResponse> {
    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(res)) { res };
    };

    let canister_id = switch (_get_canister_id_by_project(project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(id)) { id };
    };

    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });

    return #ok(current_settings);
  };

  /*
   *
   * END CANISTER METHODS
   *
   */

  /*
   *
   * START ECDSA METHODS
   *
   */
  public shared (msg) func public_key() : async {
    #Ok : { public_key_hex : Text };
    #Err : Text;
  } {
    let caller = Principal.toBlob(msg.caller);
    try {
      let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

      Debug.print("Getting public key for caller: " # Principal.toText(msg.caller));
      let { public_key } = await IC.ecdsa_public_key({
        canister_id = null;
        derivation_path = [caller];
        key_id = { curve = #secp256k1; name = "dfx_test_key" };
      });
      Debug.print("Public key: " # Hex.encode(Blob.toArray(public_key)));
      #Ok({ public_key_hex = Hex.encode(Blob.toArray(public_key)) });
    } catch (err) {
      #Err(Error.message(err));
    };
  };

  public shared (msg) func sign(message : Text) : async {
    #Ok : { signature_hex : Text };
    #Err : Text;
  } {
    let caller = Principal.toBlob(msg.caller);
    try {
      // Include caller in the message
      // let full_message = message # "|caller=" # Principal.toText(msg.caller);

      Debug.print("Signing message: " # message);
      let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

      let message_hash : Blob = Blob.fromArray(SHA256.sha256(Blob.toArray(Text.encodeUtf8(message))));
      ExperimentalCycles.add(30_000_000_000);
      let { signature } = await IC.sign_with_ecdsa({
        message_hash;
        derivation_path = [caller];
        key_id = { curve = #secp256k1; name = "dfx_test_key" };
      });

      Debug.print("Signature: " # Hex.encode(Blob.toArray(signature)));
      #Ok({ signature_hex = Hex.encode(Blob.toArray(signature)) });
    } catch (err) {
      #Err(Error.message(err));
    };
  };

  /*
   * END ECDSA METHODS
   *
   */

  /*
   * START ACCESS CONTROL METHODS
   *
   */
  /** Access Control */
  public shared (msg) func grant_role(principal : Principal, role : Types.Role) : async Types.Response<Text> {
    return access_control.add_role(principal, role, msg.caller);
  };

  public shared (msg) func revoke_role(principal : Principal) : async Types.Response<Text> {
    return access_control.remove_role(principal, msg.caller);
  };

  public shared (msg) func check_role(principal : Principal) : async Types.Response<Types.Role> {
    return access_control.check_role(principal);
  };

  /*
   * END ACCESS CONTROL METHODS
   *
   */

  /*
   * START ACCESS CONTROL METHODS
   *
   */

  /** Shareable Canisters */

  public shared (msg) func check_shared_canister_session() {};

  /*
   * END SHAREABLE CANISTERS METHODS
   *
   */

  /*
   * START SUBSCRIPTION METHODS
   *
   */

  /** Subscription */
  // Create a subscription for the caller
  public shared (msg) func create_subscription(tier_id : Nat) : async Types.Response<Types.Subscription> {
    return await subscription_manager.create_subscription(msg.caller, tier_id);
  };

  public func get_tiers() : async [Types.Tier] {
    return subscription_manager.tiers_list;
  };

  // Get the caller's subscription
  public shared (msg) func get_subscription() : async Types.Response<Types.Subscription> {
    Debug.print("API: Get subscription for user " # Principal.toText(msg.caller));

    let sub = await subscription_manager.get_subscription(msg.caller);
    return sub;
  };

  /*
   * END SUBSCRIPTION METHODS
   *
   */

  /*
   * START ASSET CANISTER METHODS
   *
   */

  /** Asset Canister */
  // Function to upload the asset canister WASM
  public shared (msg) func uploadAssetCanisterWasm(wasm : [Nat8]) : async Types.Result {
    // Only admins
    assert (access_control.is_authorized(msg.caller));

    asset_canister_wasm := ?wasm;
    return #ok("Asset canister WASM uploaded successfully");
  };

  // TODO: Implement paging for data retrieval
  // Helper function to get all deployed asset canisters
  public shared (msg) func getDeployedCanisters() : async [Principal] {
    // Only admins
    assert (access_control.is_authorized(msg.caller));
    Iter.toArray(deployed_canisters.keys());
  };

  public query func getWasmModule() : async [Nat8] {
    let wasm_module = switch (asset_canister_wasm) {
      case null { [] };
      case (?wasm) { wasm };
    };
    return wasm_module;
  };

  public shared (msg) func getAssetList(canister_id : Principal) : async Types.ListResponse {

    // Only owner or admins
    assert ((await _isController(canister_id, msg.caller)) or access_control.is_authorized(msg.caller));

    try {
      let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
      Debug.print("Getting asset list for canister " # Principal.toText(canister_id));
      let response = await asset_canister.list({});
      Debug.print("Got asset list for canister " # Principal.toText(canister_id));

      return {
        count = response.size();
        assets = response;
      };
    } catch (error) {
      Debug.print("Error getting asset list: " # Error.message(error));
      return {
        count = 0;
        assets = [];
      };
    };
  };

  public shared (msg) func getCanisterFiles(canister_id : Principal) : async [Types.StaticFile] {
    // Only owner or admins
    assert ((await _isController(canister_id, msg.caller)) or access_control.is_authorized(msg.caller));

    switch (canister_files.get(canister_id)) {
      case null return [];
      case (?files) return files;
    };
  };

  public shared (msg) func getCanisterAsset(canister_id : Principal, asset_key : Text) : async Types.AssetCanisterAsset {
    // Only owner or admins
    assert ((await _isController(canister_id, msg.caller)) or access_control.is_authorized(msg.caller));

    let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
    let asset = await asset_canister.get({
      key = asset_key;
      accept_encodings = ["identity", "gzip", "compress"];
    });

    return asset;
  };

  /*
   * END ASSET CANISTERS METHODS
   *
   */

  /*
   * START DEPOSIT METHODS
   *
   */
  public func get_deposit_account_id(canisterPrincipal : Principal, caller : Principal) : async Blob {
    let accountIdentifier = Account.accountIdentifier(canisterPrincipal, Account.principalToSubaccount(caller));
    return accountIdentifier;
  };

  public shared (msg) func get_all_subscriptions() : async [(Principal, Types.Subscription)] {
    // Only admins
    assert (access_control.is_authorized(msg.caller));

    return await subscription_manager.get_all_subscriptions();
  };

  // Get pending deposits for the caller
  public shared (msg) func getMyPendingDeposits() : async Types.Tokens {
    return await getPendingDeposits(msg.caller);
  };

  // Get pending deposits for the specified caller
  public func getPendingDeposits(caller : Principal) : async Types.Tokens {
    // Calculate target subaccount
    let source_account = Account.accountIdentifier(Principal.fromActor(this), Account.principalToSubaccount(caller));

    // Check ledger for value
    let balance = await Ledger.account_balance({
      account = source_account;
    });

    return balance;
  };

  // Returns the caller's available credits in book
  public shared (msg) func getMyCredits() : async Nat {
    return book.fetchUserIcpBalance(msg.caller, ledger);
  };

  /*
   * END DEPOSIT METHODS
   *
   */

  /*
   * START DEPLOYMENT METHODS
   *
   */

  public shared (msg) func getCanisterDeployments() : async [Types.CanisterDeployment] {
    switch (user_canisters.get(msg.caller)) {
      case null { [] };
      case (?canisters) {
        // canisters
        var all_canisters : [Types.CanisterDeployment] = [];
        for (canister in canisters.vals()) {
          let deployment = project_manager.get_deployment_by_canister(canister);
          switch (deployment) {
            case null {
              Debug.print("Deployment not found for canister " # Principal.toText(canister));
            };
            case (?deployment) {
              all_canisters := Array.append(all_canisters, [deployment]);
            };
          };
        };
        return all_canisters;
      };
    };
  };

  private func _validate_project_access(user : Principal, project_id : Nat) : Types.Response<Bool> {
    // Reject anonymous users
    if (Principal.isAnonymous(user)) return #err(Errors.Unauthorized());

    // Allow admin access
    let is_authorized = access_control.is_authorized(user);
    if (is_authorized) {
      return #ok(true);
    };

    // Ensure users access their own projects
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Assert user access to own project
    if (not (project.user == user)) {
      return #err(Errors.Unauthorized());
    };

    return #ok(true);
  };

  private func _get_canister_id_by_project(project_id : Nat) : Types.Response<Principal> {
    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Reject if canister id is null
    switch (project.canister_id) {
      case (null) { return #err(Errors.InactiveSession()) };
      case (?id) { return #ok(id) };
    };
  };

  public shared (msg) func getControllers(canister_id : Principal) : async [Principal] {
    // Only owner or admins
    assert ((await _isController(canister_id, msg.caller)) or access_control.is_authorized(msg.caller));

    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });
    let current_controllers = switch (current_settings.settings.controllers) {
      case null [];
      case (?controllers) controllers;
    };
    return current_controllers;
  };

  private func _isController(canister_id : Principal, caller : Principal) : async Bool {
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });
    let current_controllers = switch (current_settings.settings.controllers) {
      case null {
        return false;
      };
      case (?controllers) {
        let matches = Array.filter(controllers, func(p : Principal) : Bool { p == caller });
        return matches.size() > 0;
      };
    };
  };

  /**********
  * Write Methods
  **********/

  // After user transfers ICP to the target subaccount
  public shared (msg) func depositIcp() : async Types.Response<Nat> {
    // Get amount of ICP in the caller's subaccount
    // let balance = await getMyPendingDeposits();
    let balance = await getPendingDeposits(msg.caller);
    Debug.print("User balance: " # Nat64.toText(balance.e8s));

    // Transfer to default subaccount of this canister
    let result = await deposit(msg.caller, Nat64.toNat(balance.e8s));
    switch result {
      case (#Ok(available)) {
        Debug.print("Deposit result: " # Nat.toText(available));
        return #ok(available);
      };
      case (#Err(error)) {
        Debug.print("Deposit error: ");
        if (error == #BalanceLow) return #err(Errors.InsufficientFunds());
        if (error == #TransferFailure) return #err(Errors.TransferFailed());
        return #err(Errors.FailedDeposit());
      };
    };
  };

  // Transfers a user's ICP deposit from their respective subaccount to the default subaccount of this canister
  private func deposit(from : Principal, balance : Nat) : async Types.DepositReceipt {
    let subAcc = Account.principalToSubaccount(from);
    let destination_deposit_identifier : Types.AccountIdentifier = Account.accountIdentifier(Principal.fromActor(this), Account.defaultSubaccount());

    // Transfer to default subaccount of this canister
    let icp_receipt = if ((balance) > icp_fee) {
      await Ledger.transfer({
        memo : Nat64 = 0;
        from_subaccount = ?subAcc;
        to = destination_deposit_identifier;
        amount = { e8s = Nat64.fromNat(balance - icp_fee) };
        fee = { e8s = Nat64.fromNat(icp_fee) };
        created_at_time = ?{
          timestamp_nanos = Nat64.fromNat(Int.abs(Utility.get_time_now(#nanoseconds)));
        };
      });

    } else {
      return #Err(#BalanceLow);
    };

    switch icp_receipt {
      case (#Err _) {
        return #Err(#TransferFailure);
      };
      case _ {};
    };
    let available = { e8s : Nat = balance - icp_fee };

    // Keep track of deposited ICP
    _addCredit(from, ledger, available.e8s);

    return #Ok(available.e8s);
  };

  // Increase deposited amount for `to` principal
  private func _addCredit(to : Principal, token : Types.Token, amount : Nat) {
    book.addTokens(to, token, amount);
  };

  // Decrease deposited amount for `from` principal
  private func _removeCredit(from : Principal, token : Types.Token, amount : Nat) : Nat {
    let newBalanceOpt = book.removeTokens(from, token, amount);
    switch (newBalanceOpt) {
      case (?newBalance) {
        Debug.print("User new balance: " # Principal.toText(from) # Nat.toText(newBalance));
        return newBalance;
      };
      case (null) {
        return 0;
      };
    };

  };

  public shared (msg) func addController(canister_id : Principal, new_controller : Principal) : async Types.Result {
    assert (await _isController(canister_id, msg.caller));
    return await _addController(canister_id, new_controller);
  };

  private func _addController(canister_id : Principal, new_controller : Principal) : async Types.Result {
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });
    Debug.print("Current settings..");
    let current_controllers = switch (current_settings.settings.controllers) {
      case null [];
      case (?controllers) controllers;
    };
    Debug.print("Current controllers: " # Nat.toText(current_controllers.size()));
    let updated_controllers = Array.append(current_controllers, [new_controller]);
    Debug.print("Updated controllers: " # Nat.toText(updated_controllers.size()));
    let _canister_settings = await IC.update_settings({
      canister_id;
      settings = {
        controllers = ?updated_controllers;
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
      };
    });
    Debug.print("Canister settings updated");
    return #ok("Added permission for controller");
  };

  public shared (msg) func removeController(canister_id : Principal, controller_to_remove : Principal) : async (Types.Result) {
    // Check if the caller is a controller
    assert (await _isController(canister_id, msg.caller));

    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });
    let current_controllers = switch (current_settings.settings.controllers) {
      case null [];
      case (?controllers) controllers;
    };
    let updated_controllers = Array.filter(current_controllers, func(p : Principal) : Bool { p != controller_to_remove });

    let _canister_settings = await IC.update_settings({
      canister_id;
      settings = {
        controllers = ?updated_controllers;
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
      };
    });
    return #ok("Removed permission for controller");
  };

  // TODO: get icp and xdr price from api
  public shared (msg) func getCyclesToAdd(amount_in_e8s : ?Int, caller_principal : ?Principal) : async Types.GetCyclesAvailableResult {
    let _caller = switch (caller_principal) {
      case null {
        msg.caller;
      };
      case (?caller) {
        caller;
      };
    };

    let user_credits = book.fetchUserIcpBalance(_caller, ledger);

    if (user_credits <= 0) {
      return #ok(0);
    };

    let cyclesToAdd = switch (amount_in_e8s) {
      case (?amount) {
        if (amount > user_credits) {
          return #err("Insufficient credits");
        };
        calculateCyclesToAdd(amount);
      };
      case (null) calculateCyclesToAdd(user_credits);
    };
    return #ok(cyclesToAdd);
  };

  public shared (msg) func estimateCyclesToAdd(amount_in_e8s : Int) : async Float {
    return calculateCyclesToAdd(amount_in_e8s);
  };

  private func calculateCyclesToAdd(amountInE8s : Int) : Float {
    let icp_amount = Float.fromInt(amountInE8s) / E8S_PER_ICP;
    let usd_value = icp_amount * ICP_PRICE;
    let xdr_value = usd_value / XDR_PRICE;

    let cyclesToAdd = xdr_value * CYCLES_PER_XDR;
    return cyclesToAdd;
  };

  public shared (msg) func addCycles(canister_id : Principal, amountInIcp : Float) : async Types.Result {
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let claimable = book.fetchUserIcpBalance(msg.caller, ledger);
    let amount_in_e8s = Float.floor(amountInIcp * E8S_PER_ICP);
    //
    let cyclesToAdd = await getCyclesToAdd(?Float.toInt(amount_in_e8s), ?msg.caller);

    switch (cyclesToAdd) {
      case (#err(error)) {
        return #err(error);
      };
      case (#ok(cyclesToAdd)) {
        ExperimentalCycles.add(Int.abs(Float.toInt(Float.floor(cyclesToAdd))));
        await IC.deposit_cycles({ canister_id });

        let _remaining = _removeCredit(msg.caller, ledger, claimable);
        return #ok("Cycles added successfully");
      };
    };
  };

  // Function to deploy new asset canister
  private func _deploy_asset_canister(user : Principal, is_freemium : Bool) : async Types.Response<Principal> {
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

    // Only create a canister if freemium
    if (is_freemium) {
      let tier_id : Nat = subscription_manager.get_tier_id_freemium();
      let canister_id = switch (await _create_canister(tier_id, user, true)) {
        case (#err(_errMsg)) { return #err(_errMsg) };
        case (#ok(id)) { id };
      };
      return #ok(canister_id);

    } else {

      // Create canister and update user subscription
      Debug.print("Getting sub for user " # Principal.toText(user));
      // Validate user subscription limits
      let user_subscription_res = await subscription_manager.get_subscription(user);
      switch (user_subscription_res) {
        case (#err(error)) {
          Debug.print("Error getting sub for: " # Principal.toText(user));
          return #err(error);
        };
        case (#ok(subscription)) {
          Debug.print("User subscription: " # Nat.toText(subscription.tier_id));
          let is_valid_subscription = await subscription_manager.validate_subscription(user);
          if (is_valid_subscription != true) {
            return #err(Errors.SubscriptionLimitReached());
          };

          try {
            Debug.print("[Identity " # Principal.toText(user) # "] Adding cycles....");
            let canister_id = switch (await _create_canister(subscription.tier_id, user, false)) {
              case (#err(_errMsg)) { return #err(_errMsg) };
              case (#ok(id)) { id };
            };
            return #ok(canister_id);
          } catch (error) {
            return #err(Error.message(error));
          };
        };
      };
    }

  };

  private func _convert_e8s_to_cycles(e8s : Nat64, max_slots : Nat) : Float {
    let deposit_per_canister = Nat64.toNat(e8s) / max_slots;

    let cyclesForCanister = calculateCyclesToAdd(deposit_per_canister);
  };

  private func _get_cycles_for_canister_init(tier_id : Nat) : Int {
    let min_deposit = subscription_manager.tiers_list[tier_id].min_deposit;
    let cyclesForCanister = _convert_e8s_to_cycles(min_deposit.e8s, subscription_manager.tiers_list[tier_id].slots);
    Debug.print("Adding cycles for canister: " # Int.toText(Float.toInt(cyclesForCanister)));
    return Float.toInt(cyclesForCanister);
  };

  private func _create_canister(tier_id : Nat, controller : Principal, is_freemium : Bool) : async Types.Response<Principal> {
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let wasm_module = switch (asset_canister_wasm) {
      case null { return #err(Errors.NotFoundWasm()) };
      case (?wasm) { wasm };
    };

    let controllers = switch (is_freemium) {
      case (false) {
        [Principal.fromActor(this), controller];
      };
      case (true) {
        [Principal.fromActor(this)];
      };
    };

    // Get cycles to add to fresh canister
    let cyclesForCanister : Int = _get_cycles_for_canister_init(tier_id);
    ExperimentalCycles.add(Int.abs(cyclesForCanister));

    // Set controller
    let settings : Types.CanisterSettings = {
      freezing_threshold = null;
      controllers = ?controllers;
      memory_allocation = null;
      compute_allocation = null;
    };

    // Create new canister
    let create_result = await IC.create_canister({
      settings = ?settings;
    });

    let new_canister_id = create_result.canister_id;

    Debug.print("[Canister " # Principal.toText(new_canister_id) # "] Installing code");

    // Install the asset canister code
    await IC.install_code({
      arg = Blob.toArray(to_candid (()));
      wasm_module = wasm_module;
      mode = #install;
      canister_id = new_canister_id;
    });

    Debug.print("[Canister " # Principal.toText(new_canister_id) # "] Code installed");

    // After successful deployment, add to tracking
    deployed_canisters.put(new_canister_id, true);

    await _addCanisterDeployment(controller, new_canister_id, is_freemium);

    return #ok(new_canister_id);
  };

  private func _is_allowed_store_assets(canister_id : Principal, caller : Principal) : async Bool {
    if (access_control.is_authorized(caller)) {
      return true;
    } else if (await _isController(canister_id, caller)) {
      return true;
    } else {
      // TODO: CHeck
      let slot : ?Types.ShareableCanister = shareable_canister_manager.get_canister_by_user(caller);
      switch (slot) {
        case (null) {
          return false;
        };
        case (?_slot) {
          return _slot.user == caller;
        };
      };
    };
    return false;
  };

  // TODO: Add counter for size
  /**
  * Store files in asset canister
  * @param canister_id - The ID of the asset canister to store the files in
  * @param files - The files to store in the asset canister
  * @returns A result indicating the success or failure of the operation
*/
  // TODO: Make private
  // TODO: Reject calls with canister_id being a shareable canister
  public shared (msg) func storeInAssetCanister(
    project_id : Nat,
    files : [Types.StaticFile],
    workflow_run_details : ?Types.WorkflowRunDetails,
  ) : async Types.Response<Bool> {
    let canister_id = switch (_get_canister_id_by_project(project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(id)) { id };
    };

    if (not (await _is_allowed_store_assets(canister_id, msg.caller))) {
      return #err(Errors.Unauthorized());
    };

    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(res)) { res };
    };

    Debug.print("Storing files in asset canister for user: " # Principal.toText(msg.caller));
    _updateCanisterDeployment(canister_id, #installing); // Update canister deployment status to installing

    // Check if the asset canister is deployed
    switch (deployed_canisters.get(canister_id)) {
      case null return #err("[Canister " # Principal.toText(canister_id) # "] Asset canister not found");
      case (?_) {
        try {
          let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));

          // Iterate over the files
          for (file in files.vals()) {

            // Upload chunks if file is chunked
            if (file.is_chunked) {

              // Create a new batch for this chunked file
              if (file.chunk_id == 0) {
                Debug.print("[Canister " # Principal.toText(canister_id) # "] Processing chunked file: " # file.path);

                // Create a new batch for this chunked file and save the batch id in the batch map
                let batch = await asset_canister.create_batch();
                _setBatchMap(canister_id, file.batch_id, batch.batch_id);
              };

              let (exists, batch_id) = _getBatchId(canister_id, file.batch_id);
              if (exists == false) {
                Debug.print("[Canister " # Principal.toText(canister_id) # "] Batch ID does not exist");
                throw Error.reject("[Canister " # Principal.toText(canister_id) # "] Batch ID does not exist");
              };

              await _handleChunkedFile(file, asset_canister, batch_id, canister_id);

              if (file.is_last_chunk) {

                let chunk_ids = _getChunkIdsForCanister(canister_id, batch_id);
                Debug.print("[Canister " # Principal.toText(canister_id) # "] Commiting chunk IDs: " # Text.join(", ", Iter.map<Nat, Text>(Array.vals(chunk_ids), func(id) = Nat.toText(id))));

                try {
                  await asset_canister.commit_batch({
                    batch_id = batch_id;
                    operations = [
                      #CreateAsset {
                        key = file.path;
                        content_type = file.content_type;
                        headers = ?[
                          ("Content-Type", file.content_type),
                          ("Content-Encoding", "identity"),
                        ];
                      },
                      #SetAssetContent {
                        key = file.path;
                        content_encoding = "identity";
                        chunk_ids = chunk_ids;
                        sha256 = null;
                      },
                    ];
                  });
                  Debug.print("[Canister " # Principal.toText(canister_id) # "] Committed batch " # Nat.toText(file.batch_id));
                } catch (error) {
                  Debug.print("[Canister " # Principal.toText(canister_id) # "] Failed to commit batch: " # Error.message(error));
                  throw Error.reject("[Canister " # Principal.toText(canister_id) # "] Failed to commit batch: " # Error.message(error));
                };
              }

            } else {
              let content = file.content;
              let contentSize = content.size();

              // Small file, upload directly
              try {
                await asset_canister.store({
                  key = file.path;
                  content_type = file.content_type;
                  content_encoding = "identity";
                  content = content;
                  sha256 = null;
                  headers = if (file.path == "index.html") {
                    [
                      ("Cache-Control", "public, no-cache, no-store"),
                      ("X-IC-Certification-Path", "*"),
                    ];
                  } else { [] };
                });

                // Update canister deployment size
                _updateCanisterDeploymentSize(canister_id, contentSize);
                Debug.print("[Canister " # Principal.toText(canister_id) # "] Stored file at " # file.path # " with size " # Nat.toText(contentSize) # " bytes");

              } catch (error) {
                Debug.print("[Canister " # Principal.toText(canister_id) # "] Failed to upload file: " # Error.message(error));
                throw error;
              };
            };

          };
          _updateCanisterDeployment(canister_id, #installed); // Update canister deployment status to installed

          switch (workflow_run_details) {
            case null {
              var time = Utility.get_time_now(#milliseconds);
              let workflow_details : Types.WorkflowRunDetails = {
                workflow_run_id = 0;
                repo_name = "";
                date_created = Int.abs(time);
                status = #completed;
                branch = null;
                commit_hash = null;
                error_message = null;
                size = null;
              };
              let _updateHistory = await workflow_manager.update_workflow_run(project_id, workflow_details);
            };
            case (?workflow_run_details) {
              let _updateHistory = await workflow_manager.update_workflow_run(project_id, workflow_run_details);
            };
          };

          let _addControllerRespons = await _addController(canister_id, msg.caller);
          #ok(true);
        } catch (error) {
          #err("Failed to upload files: " # Error.message(error));
        };
      };
    };

  };

  private func _updateCanisterDeploymentSize(canister_id : Principal, new_file_size : Nat) {
    let deployment = project_manager.get_deployment_by_canister(canister_id);
    switch (deployment) {
      case null {
        Debug.print("Canister deployment not found");
      };
      case (?deployment) {
        let updated_deployment = {
          canister_id = deployment.canister_id;
          status = deployment.status;
          date_created = deployment.date_created;
          date_updated = Utility.get_time_now(#milliseconds);
          size = deployment.size + new_file_size;
        };
        project_manager.put_canister_table(canister_id, updated_deployment);
        // canister_table.put(canister_id, updated_deployment);
      };
    };
  };

  private func _updateCanisterDeployment(canister_id : Principal, status : Types.CanisterDeploymentStatus) {
    let deployment = switch (project_manager.get_deployment_by_canister(canister_id)) {
      case (null) {
        Debug.print("Canister deployment not found, creating new record.");
        let new_deployment : Types.CanisterDeployment = {
          canister_id = canister_id;
          status = status;
          size = 0;
          date_created = Utility.get_time_now(#milliseconds);
          date_updated = Utility.get_time_now(#milliseconds);
        };
        new_deployment;
      };
      case (?d) {
        Debug.print("Canister deployment found");
        let updated_deployment = {
          canister_id = canister_id;
          status = status;
          date_created = d.date_created;
          date_updated = Utility.get_time_now(#milliseconds);
          size = d.size;
        };
        updated_deployment;
      };
    };

    project_manager.put_canister_table(canister_id, deployment);

  };

  // TODO: Add is_freemium
  private func _addCanisterDeployment(caller : Principal, canister_id : Principal, is_freemium : Bool) : async () {
    let deployment = {
      canister_id = canister_id;
      status = #uninitialized;
      date_created = Utility.get_time_now(#milliseconds);
      date_updated = Utility.get_time_now(#milliseconds);
      size = 0;
    };

    if (not is_freemium) {
      // Add to user subscription
      let canisters = switch (user_canisters.get(caller)) {
        case null { [] };
        case (?d) { d };
      };

      // Update user canisters
      let new_canisters = Array.append(canisters, [canister_id]);
      user_canisters.put(caller, new_canisters);

      // Count canister usage in user subscription
      let _pushCanisterId = await subscription_manager.push_canister_id(caller, canister_id); // Update subscription
      Debug.print("Added canister deployment by " # Principal.toText(caller) # " for " # Principal.toText(canister_id) # ". Total deployments: " # Nat.toText(new_canisters.size()));

    };
    project_manager.put_canister_table(canister_id, deployment);
  };

  private func _handleChunkedFile(file : Types.StaticFile, asset_canister : Types.AssetCanister, batch_id : Nat, canister_id : Principal) : async () {
    let chunk = await asset_canister.create_chunk({
      batch_id = batch_id;
      content = file.content;
    });

    _addChunkId(canister_id, batch_id, chunk.chunk_id);

    // Update canister deployment size
    _updateCanisterDeploymentSize(canister_id, file.content.size());

    Debug.print("Creating chunk for batch id " # Nat.toText(batch_id) # "with chunk id " # Nat.toText(chunk.chunk_id));

    Debug.print("Uploaded chunk ID: " # Nat.toText(chunk.chunk_id));
  };

  private func _addChunkId(canister_id : Principal, batch_id : Nat, chunk_id : Nat) {
    switch (canisterBatchMap.get(canister_id)) {
      case (?(_, batchChunks)) {
        let existing = switch (batchChunks.get(batch_id)) {
          case null { [] };
          case (?chunks) { chunks };
        };
        batchChunks.put(batch_id, Array.append(existing, [chunk_id]));
      };
      case null {};
    };
  };

  // Gets the chunk ids for a given batch id
  private func _getChunkIdsForCanister(canister_id : Principal, batch_id : Nat) : [Nat] {
    switch (canisterBatchMap.get(canister_id)) {
      case (?(_, batchChunks)) {
        switch (batchChunks.get(batch_id)) {
          case (?chunks) { chunks };
          case null { [] };
        };
      };
      case null { [] };
    };
  };

  // Gets the actual batch id for a given file id
  private func _getBatchId(canister_id : Principal, file_batch_id : Nat) : (Bool, Nat) {

    let batchMap = canisterBatchMap.get(canister_id);
    switch (batchMap) {
      case null {
        Debug.print("Batch map does not exist");
        return (false, 0);
      };
      case (?(batchMap, _)) {
        let actual_batch_id = batchMap.get(file_batch_id);
        Debug.print("Getting batch id for batch " # Nat.toText(file_batch_id));

        switch (actual_batch_id) {
          case null {
            Debug.print("Batch ID does not exist");
            return (false, 0);
          };
          case (?actual_batch_id) {
            Debug.print("Batch ID exists: " # Nat.toText(actual_batch_id));
            return (true, actual_batch_id);
          };
        };
      };
    };
  };

  // Initializes a file batch map for a given canister (called only on first chunk of file)
  private func _setBatchMap(canister_id : Principal, file_batch_id : Nat, batch_id : Nat) {
    let batchMap = canisterBatchMap.get(canister_id);

    switch (batchMap) {
      case null {
        let newBatchMap = HashMap.HashMap<Nat, Nat>(0, Nat.equal, Hash.hash);
        let newBatchChunks = HashMap.HashMap<Nat, [Nat]>(0, Nat.equal, Hash.hash);
        // Create new maps
        newBatchMap.put(file_batch_id, batch_id);
        newBatchChunks.put(batch_id, []);
        // Initialize empty batch map and chunks
        canisterBatchMap.put(canister_id, (newBatchMap, newBatchChunks));
      };
      case (?(batchMap, batchChunks)) {
        // Map the file id to the actual batch id
        batchMap.put(file_batch_id, batch_id);
        // Update the canister's batch map
        canisterBatchMap.put(canister_id, (batchMap, batchChunks));
      };
    };
  };

  /** Handle canister upgrades */

  system func preupgrade() {
    Debug.print("Preupgrade: Starting with defensive approach");

    stable_deployed_canisters := [];
    stable_assets_array := [];
    stable_chunks_array := [];
    stable_canister_files := [];

    canister_deployments_to_stable_array();
    // canister_table_to_stable_array();
    stable_canister_table := project_manager.get_stable_data_canister_table();

    // workflow_run_history_to_stable_array();
    // workflow_run_history_from_stable_array();

    stable_workflow_run_history := workflow_manager.get_stable_data_workflow_run_history();

    // Restore subscriptions
    stable_subscriptions := subscription_manager.getStableData();
    Debug.print("Stable subscriptions: " # Nat.toText(stable_subscriptions.size()));
    Debug.print("All Subs" # debug_show (stable_subscriptions));

    // Save book to stable array
    stable_book := book.toStable();

    stable_role_map := access_control.getStableData();

    // Backup shareable canister state
    stable_slots := shareable_canister_manager.get_stable_data_slots();
    stable_user_to_slot := shareable_canister_manager.get_stable_data_user_to_slot();
    stable_used_slots := shareable_canister_manager.get_stable_data_used_slots();
    stable_usage_logs := shareable_canister_manager.get_stable_data_usage_logs();
    stable_next_slot_id := shareable_canister_manager.get_stable_data_next_slot_id();

    stable_projects := project_manager.get_stable_data_projects();
    stable_user_to_projects := project_manager.get_stable_data_user_to_projects();
    stable_next_project_id := project_manager.get_stable_data_next_project_id();

    stable_project_activity_logs := activity_manager.get_stable_data_project_activity();

    Debug.print("Preupgrade: Variables initialized, beginning conversion");
    Debug.print("Preupgrade: Preparing to sync assets and chunks.");
    Debug.print("Preupgrade: Assets: " # Nat.toText(assets.size()));
    Debug.print("Preupgrade: Chunks: " # Nat.toText(chunks.size()));
    Debug.print("Preupgrade: Canister files: " # Nat.toText(canister_files.size()));
    assets_to_stable_array();
    chunks_to_stable_array();

    stable_deployed_canisters := Iter.toArray(deployed_canisters.entries());
    // stable_projects := project_manager.migrate_projects_add_project_id(stable_projects);

    _backup_timer_slots(); // Keep track of existing cleanup timers to be reestablished
    Debug.print("Preupgrade: Finished preupgrade procedure. Ready for upgrade. ");
  };

  system func postupgrade() {
    Debug.print("Postupgrade: Syncing assets and chunks.");
    Debug.print("Postupgrade: Assets: " # Nat.toText(assets.size()));
    Debug.print("Postupgrade: Chunks: " # Nat.toText(chunks.size()));
    Debug.print("Postupgrade: Canister files: " # Nat.toText(canister_files.size()));
    canister_deployments_from_stable_array();
    // canister_table_from_stable_array();
    project_manager.load_from_stable_canister_table(stable_canister_table);
    project_manager.load_from_stable_projects(stable_projects);
    project_manager.load_from_stable_user_to_projects(stable_user_to_projects);
    project_manager.load_from_stable_next_project_id(stable_next_project_id);

    // Restore subscriptions
    subscription_manager.loadFromStable(stable_subscriptions);
    Debug.print("PostUpgrade: Restored subscriptions");
    Debug.print("PostUpgrade: Restored subscriptions size: " # Nat.toText(stable_subscriptions.size()));
    Debug.print("PostUpgrade: Restored subscriptions: " # debug_show (stable_subscriptions));

    // Restore shareable canister stable data
    shareable_canister_manager.load_from_stable_slots(stable_slots);
    shareable_canister_manager.load_from_stable_user_to_slot(stable_user_to_slot);
    shareable_canister_manager.load_from_stable_used_slots(stable_used_slots);
    shareable_canister_manager.load_from_stable_usage_logs(stable_usage_logs);
    shareable_canister_manager.load_from_stable_next_slot_id(stable_next_slot_id);
    Debug.print("PostUpgrade: Restored shareable canister stable data");

    activity_manager.load_from_stable_project_activity(stable_project_activity_logs);
    stable_project_activity_logs := [];

    // Workflow Run History stable data
    workflow_manager.load_from_stable_workflow_run_history(stable_workflow_run_history);
    Debug.print("PostUpgrade: Restored workflow run stable data");

    // Restore book
    book.fromStable(stable_book);
    stable_book := [];

    access_control.loadFromStable(stable_role_map);
    stable_role_map := [];

    sync_assets();
    sync_chunks();
    Debug.print("Postupgrade: Syncing deployed canisters.");
    deployed_canisters := HashMap.fromIter(stable_deployed_canisters.vals(), 0, Principal.equal, Principal.hash);
    Debug.print("Postupgrade: Finished postupgrade procedure. Synced stable variables. ");

    let is_set = subscription_manager.set_treasury(Principal.fromActor(this));
    Debug.print("Postupgrade: Treasury set: " # Bool.toText(is_set));

    // Initialize access control
    access_control.init();

    _recover_timers();
  };

  private func _backup_timer_slots() {
    let slot_ids = Iter.toArray(timers.keys());
    // slot_ids;

    stable_slot_id_active_timer := slot_ids;
  };

  private func _recover_timers<system>() : () {
    for ((slot_id) in Iter.fromArray(stable_slot_id_active_timer)) {
      Debug.print("[_recover_timers] Slot #" # Nat.toText(slot_id) # " recovering timer");
      let slot : Types.ShareableCanister = switch (shareable_canister_manager.get_canister_by_slot(slot_id)) {
        case (#err(_msg)) {
          return;
        };
        case (#ok(_slot)) {
          _slot;
        };
      };
      let now = Int.abs(Utility.get_time_now(#milliseconds));
      let remaining_duration_s : Nat = if (now > slot.start_timestamp) {
        (now - slot.start_timestamp) / 1_000;
      } else {
        0;
      };
      // Convert nanoseconds to seconds for the timer and cap at max safe value
      // let remaining_duration_s : Nat = Nat.min(remaining_duration_ns / 1_000_000_000, 4_294_967_295); // Cap at u32.MAX_VALUE
      // Only recover valid non-expired session. Force end if less than 50s is left before expiry
      if (remaining_duration_s > 50) {
        _set_cleanup_timer(remaining_duration_s, slot_id);
        Debug.print("[RecoverTimers] Project freemium session is active. Setup cleanup timer for slot #" # Nat.toText(slot_id));
      } else {
        let _project_id = _end_freemium_session(slot_id);
        Debug.print("[RecoverTimers] Project freemium session expired. Terminated session for slot #" # Nat.toText(slot_id));
      };
    };
  };

  private func _get_timer_id(slot_id : Nat) : Nat {
    Utility.expect(timers.get(slot_id), Errors.NotFoundTimer());
  };

  // Delete slot id to timer id reference from `timers` mapping
  // Pop out slot id from array of slot ids with active timers
  private func _delete_timer(slot_id : Nat) {
    let _res = switch (timers.get(slot_id)) {
      case (null) {
        0;
      };
      case (?_timer_id) {
        timers.delete(_timer_id);
        0;
      };
    };

    let new_active_slot_timers : [Nat] = Array.filter(stable_slot_id_active_timer, func(slot : Nat) : Bool { slot != slot_id });

    Debug.print("Removed " # Int.toText(Int.abs(new_active_slot_timers.size() - stable_slot_id_active_timer.size())));
    stable_slot_id_active_timer := new_active_slot_timers;
  };

  private func _set_cleanup_timer<system>(duration : Nat, slot_id : Nat) : () {
    let timer_id = Timer.setTimer<system>(
      #seconds duration,
      func() : async () {
        // This code runs after 10 seconds
        Debug.print("[Timer Triggered] Ending session on slot #" # Nat.toText(slot_id));
        let res = _end_freemium_session(slot_id);
        switch (res) {
          case (#err(error)) {
            Debug.print("Failed to stop session on slot #" # Nat.toText(slot_id) # " error: " # error);
          };
          case (#ok(?project_id)) {
            Debug.print("Stopped session running on slot #" # Nat.toText(slot_id) # " for project id: " # Nat.toText(project_id) # " @ " # Int.toText(Int.abs(Utility.get_time_now(#milliseconds))));
            _delete_timer(slot_id);
          };
          case (#ok(null)) {
            Debug.print("Stopped session running on slot # " #Nat.toText(slot_id) # " Project id not set.");
            _delete_timer(slot_id);
          };
        };
      },
    );

    Debug.print("[Timer] Created timer with id: " # Nat.toText(timer_id) # ". Triggers @" # Int.toText(Int.abs(Utility.get_time_now(#milliseconds))) # "s UNIX Time.");
    timers.put(slot_id, timer_id);
  };

  private func canister_deployments_to_stable_array() {
    stable_user_canisters := Iter.toArray(user_canisters.entries());
    Debug.print("Preupgrade: Backing up canister deployments: " # Nat.toText(stable_user_canisters.size()));
  };

  private func canister_deployments_from_stable_array() {
    user_canisters := HashMap.fromIter(stable_user_canisters.vals(), 0, Principal.equal, Principal.hash);
    Debug.print("Postupgrade: Restored canister deployments: " # Nat.toText(user_canisters.size()));
  };

  // private func workflow_run_history_to_stable_array() {
  //   stable_workflow_run_history := Iter.toArray(workflow_run_history.entries());
  //   Debug.print("Preupgrade: Backing up workflow run history: " # Nat.toText(stable_workflow_run_history.size()));
  // };

  // private func workflow_run_history_from_stable_array() {
  //   workflow_run_history := HashMap.fromIter(stable_workflow_run_history.vals(), stable_workflow_run_history.size(), Principal.equal, Principal.hash);
  //   Debug.print("Postupgrade: Restored workflow run history: " # Nat.toText(workflow_run_history.size()));
  // };

  // Convert assets to stable array
  private func assets_to_stable_array() {
    stable_assets_array := Iter.toArray(assets.vals());
  };

  // Convert chunks to stable array
  private func chunks_to_stable_array() {
    stable_chunks_array := Array.map<(Text, Blob), Types.AssetChunk>(
      Iter.toArray(chunks.entries()),
      func((key : Text, data : Blob)) : Types.AssetChunk {
        let parts = Text.split(key, #char ':');
        let parts_array = Iter.toArray(parts);
        let asset_id = parts_array[0];

        let chunk_id = switch (Nat.fromText(parts_array[1])) {
          case (?num) Nat32.fromNat(num);
          case null Debug.trap("Invalid chunk ID");
        };
        {
          asset_id;
          chunk_id;
          data;
        };
      },
    );
  };

  // Sync assets from stable array to map
  private func sync_assets() {
    Debug.print("Syncing all assets");

    assets := HashMap.fromIter<Types.AssetId, Types.Asset>(
      Array.map<Types.Asset, (Types.AssetId, Types.Asset)>(
        stable_assets_array,
        func(asset : Types.Asset) : (Types.AssetId, Types.Asset) {
          Debug.print("Syncing asset: " # asset.id # asset.name);
          (asset.id, asset);
        },
      ).vals(),
      0,
      Text.equal,
      Text.hash,
    );

    Debug.print("Synced assets: " # Nat.toText(assets.size()));
  };

  // Sync chunks from stable array to map
  private func sync_chunks() {
    chunks := HashMap.fromIter<Text, Blob>(
      Array.map<Types.AssetChunk, (Text, Blob)>(
        stable_chunks_array,
        func(chunk : Types.AssetChunk) : (Text, Blob) {
          let chunk_key = chunk.asset_id # ":" # Nat32.toText(chunk.chunk_id);
          (chunk_key, chunk.data);
        },
      ).vals(),
      0,
      Text.equal,
      Text.hash,
    );

    Debug.print("Synced chunks: " # Nat.toText(chunks.size()));
  };

};
