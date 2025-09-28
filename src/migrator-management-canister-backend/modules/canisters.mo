import Types "../types";
import Map "mo:core/Map";
import Nat8 "mo:core/Nat8";
import Utility "../utils/Utility";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Hash "mo:base/Hash";
import Errors "errors";
import Error "mo:base/Error";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Blob "mo:base/Blob";
import IC "ic:aaaaa-aa";
import Constants "../utils/constants";
import Book "../book";

module {
  public class Canisters(
    canister_table_init : Types.CanisterDeploymentMap,
    user_canisters_init : Types.UserCanistersMap,
    deployed_canisters_init : Types.DeployedCanistersMap,
    asset_canister_wasm_init : ?[Nat8],
  ) {
    public var class_references : ?Types.ClassesInterface = null;
    private var asset_canister_wasm : ?[Nat8] = asset_canister_wasm_init;

    public var canister_table : Map.Map<Principal, Types.CanisterDeployment> = canister_table_init;
    public var user_canisters : Types.UserCanistersMap = user_canisters_init;
    public var deployed_canisters : Types.DeployedCanistersMap = deployed_canisters_init;

    // Transient
    private var canisterBatchMap : Types.CanisterBatchMap = HashMap.HashMap<Principal, (Types.BatchMap, Types.BatchChunks)>(0, Principal.equal, Principal.hash);

    public func init(class_reference_init : Types.ClassesInterface) {
      class_references := ?class_reference_init;
    };

    public func set_asset_canister_wasm(wasm : [Nat8]) : () {
      asset_canister_wasm := ?wasm;
    };

    public func put_canister_table(canister_id : Principal, payload : Types.CanisterDeployment) {
      Map.add(canister_table, Principal.compare, canister_id, payload);
    };

    public func get_deployment_by_canister(canister_id : Principal) : ?Types.CanisterDeployment {
      switch (Map.get(canister_table, Principal.compare, canister_id)) {
        case (null) { return null };
        case (val) { return val };
      };
    };

    public func get_canister_principals_all(payload : Types.PaginationPayload) : Types.Response<[Principal]> {
      let all_principals = Iter.toArray(Map.keys(canister_table));
      let paginated_principals = Utility.paginate(all_principals, payload);
      return #ok(paginated_principals);
    };
    public func get_canister_deployments_all(payload : Types.PaginationPayload) : Types.Response<[(Principal, Types.CanisterDeployment)]> {
      let all_entries = Iter.toArray(Map.entries(canister_table));
      let paginated_entries = Utility.paginate(all_entries, payload);
      return #ok(paginated_entries);
    };

    public func get_canister_deployments(project_id : Types.ProjectId) : Types.Response<?Types.CanisterDeployment> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _project_manager = switch (_classes.project_manager) {
        case (null) return #err(Errors.NotFoundClass("Project Manager"));
        case (?val) val;
      };

      let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(_project)) { _project };
      };

      let canister_id : Principal = switch (project.canister_id) {
        case (null) { return #err(Errors.NotFoundSlot()) };
        case (?id) { id };
      };

      let deployment : Types.CanisterDeployment = switch (get_deployment_by_canister(canister_id)) {
        case null {
          return #ok(null);
        };
        case (?dep) { dep };
      };
      return #ok(?deployment);
    };

    public func get_asset_list(canister_id : Principal) : async Types.Response<Types.ListResponse> {
      try {
        let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
        let response = await asset_canister.list({});

        return #ok({
          count = response.size();
          assets = response;
        });
      } catch (error) {
        return #ok({
          count = 0;
          assets = [];
        });
      };
    };

    public func get_canister_status(project_id : Types.ProjectId) : async Types.Response<IC.canister_status_result> {
      let canister_id = switch (get_canister_id_by_project(project_id)) {
        case (#err(_msg)) { return #err(_msg) };
        case (#ok(id)) { id };
      };

      let current_settings = await IC.canister_status({
        canister_id = canister_id;
      });

      return #ok(current_settings);
    };

    public func add_canister_deployment(caller : Principal, canister_id : Principal, is_freemium : Bool) : async () {
      let deployment = {
        canister_id = canister_id;
        status = #uninitialized;
        date_created = Utility.get_time_now(#milliseconds);
        date_updated = Utility.get_time_now(#milliseconds);
        size = 0;
      };

      if (not is_freemium) {
        // Add to user subscription
        let canisters = switch (Map.get(user_canisters, Principal.compare, caller)) {
          case null { [] };
          case (?d) { d };
        };

        // Update user canisters
        let new_canisters = Array.append(canisters, [canister_id]);
        Map.add(user_canisters, Principal.compare, caller, new_canisters);
      };
      put_canister_table(canister_id, deployment);
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
    public func get_chunk_ids_for_canister(canister_id : Principal, batch_id : Nat) : [Nat] {
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
    public func get_batch_id(canister_id : Principal, file_batch_id : Nat) : (Bool, Nat) {

      let batchMap = canisterBatchMap.get(canister_id);
      switch (batchMap) {
        case null {
          return (false, 0);
        };
        case (?(batchMap, _)) {
          let actual_batch_id = batchMap.get(file_batch_id);

          switch (actual_batch_id) {
            case null {
              return (false, 0);
            };
            case (?actual_batch_id) {
              return (true, actual_batch_id);
            };
          };
        };
      };
    };

    public func set_batch_map(canister_id : Principal, file_batch_id : Nat, batch_id : Nat) {
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

    public func update_deployment_size(canister_id : Principal, new_file_size : Nat) {
      let deployment = get_deployment_by_canister(canister_id);
      switch (deployment) {
        case null {};
        case (?deployment) {
          let updated_deployment = {
            canister_id = deployment.canister_id;
            status = deployment.status;
            date_created = deployment.date_created;
            date_updated = Utility.get_time_now(#milliseconds);
            size = deployment.size + new_file_size;
          };
          put_canister_table(canister_id, updated_deployment);
          // canister_table.put(canister_id, updated_deployment);
        };
      };
    };

    public func update_deployment_status(canister_id : Principal, status : Types.CanisterDeploymentStatus) {
      let deployment = switch (get_deployment_by_canister(canister_id)) {
        case (null) {
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

      put_canister_table(canister_id, deployment);

    };

    public func handle_chunked_file(file : Types.StaticFile, asset_canister : Types.AssetCanister, batch_id : Nat, canister_id : Principal) : async () {
      let chunk = await asset_canister.create_chunk({
        batch_id = batch_id;
        content = file.content;
      });

      _addChunkId(canister_id, batch_id, chunk.chunk_id);

      // Update canister deployment size
      update_deployment_size(canister_id, file.content.size());
    };

    public func clear_batch_map(canister_id : Principal) {
      canisterBatchMap.delete(canister_id);
    };

    public func get_canister_id_by_project(project_id : Nat) : Types.Response<Principal> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _project_manager = switch (_classes.project_manager) {
        case (null) return #err(Errors.NotFoundClass("Project Manager"));
        case (?val) val;
      };

      // Get project
      let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(_project)) { _project };
      };

      // Reject if canister id is null
      switch (project.canister_id) {
        case (null) { return #err(Errors.InactiveSession()) };
        case (?id) { return #ok(id) };
      };
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
    public func storeInAssetCanister(
      caller : Principal,
      project_id : Nat,
      files : [Types.StaticFile],
      workflow_run_details : ?Types.WorkflowRunDetails,
    ) : async Types.Response<Bool> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _project_manager = switch (_classes.project_manager) {
        case (null) return #err(Errors.NotFoundClass("Project manager"));
        case (?val) val;
      };

      let _workflow_manager = switch (_classes.workflow_manager) {
        case (null) return #err(Errors.NotFoundClass("Workflow manager"));
        case (?val) val;
      };

      let canister_id = switch (get_canister_id_by_project(project_id)) {
        case (#err(_msg)) { return #err(_msg) };
        case (#ok(id)) { id };
      };

      // Ensure user can store assets
      let _is_allowed = switch (await _is_allowed_store_assets(canister_id, caller)) {
        case (#err(err)) { return #err(err) };
        case (#ok(val)) {
          if (not (val)) {
            return #err(Errors.Unauthorized());
          };
          val;
        };
      };

      let is_authorized = switch (_project_manager.validate_project_access(caller, project_id)) {
        case (#err(_msg)) { return #err(_msg) };
        case (#ok(res)) { res };
      };

      update_deployment_status(canister_id, #installing); // Update canister deployment status to installing
      // stable_canister_table := canisters.canister_table; // Update stable storage

      let is_uploaded = switch (await handle_upload_file(canister_id, files, workflow_run_details)) {
        case (#err(err)) { return #err(err) };
        case (#ok(val)) {
          val;
        };
      };

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
          let _updateHistory = await _workflow_manager.update_workflow_run(project_id, workflow_details);
        };
        case (?workflow_run_details) {
          let _updateHistory = await _workflow_manager.update_workflow_run(project_id, workflow_run_details);
        };
      };

      let _addControllerRespons = await add_controller(canister_id, caller);
      return #ok(true);
    };

    public func get_canister_asset(canister_id : Principal, asset_key : Text) : async Types.Response<?Types.AssetCanisterAsset> {
      try {
        let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
        let asset = await asset_canister.get({
          key = asset_key;
          accept_encodings = ["identity", "gzip", "compress"];
        });
        return #ok(?asset);

      } catch (e) {
        // return #err(Error.message(e));
        return #ok(null);
      };
    };

    public func is_controller(canister_id : Principal, caller : Principal) : async Bool {
      // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
      let current_settings = await IC.canister_status({
        canister_id = canister_id;
      });
      let current_controllers = current_settings.settings.controllers;
      let matches = Array.filter(current_controllers, func(p : Principal) : Bool { p == caller });
      return matches.size() > 0;
    };

    private func _is_allowed_store_assets(canister_id : Principal, caller : Principal) : async Types.Response<Bool> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };
      let _access_control = switch (_classes.access_control_manager) {
        case (null) return #err(Errors.NotFoundClass("Access control"));
        case (?val) val;
      };
      let _shareable_canister_manager = switch (_classes.shareable_canister_manager) {
        case (null) return #err(Errors.NotFoundClass("Shareable canister manager"));
        case (?val) val;
      };

      if (_access_control.is_authorized(caller)) {
        return #ok(true);
      } else if (await is_controller(canister_id, caller)) {
        return #ok(true);
      } else {
        // TODO: CHeck
        let slot : ?Types.ShareableCanister = switch (_shareable_canister_manager.get_canister_by_user(caller)) {
          case (#err(msg)) { return #err(msg) };
          case (#ok(val)) { val };
        };

        switch (slot) {
          case (null) { return #ok(false) };
          case (?_slot) { return #ok(_slot.user == caller) };
        };
      };
      return #ok(false);
    };

    // TODO: Look into this usage of MIN_CYCLES_INIT_E8S
    public func validate_canister_cycles(canister_id : Principal) : async Types.Response<Nat> {
      // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
      let cycles_balance : Nat = switch (await IC.canister_status({ canister_id = canister_id })) {
        case (val) {
          // Canister low on cycles
          // let current_balance : Nat = if (val.cycles < Constants.MIN_CYCLES_INIT_E8S) {
          let current_balance : Nat = if (val.cycles < Constants.MIN_CYCLES_INIT / 5) {
            // Top up canister to maintain min required cycles on init
            let amount_added = await _add_cycles(canister_id, Constants.MIN_CYCLES_INIT_E8S);
            amount_added;
          } else {
            // Return current cycles balance
            val.cycles;
          };
          current_balance;
        };
      };
      return #ok(cycles_balance);
    };

    public func get_cycles_to_add(amount_in_e8s : ?Int, caller_principal : Principal, transform : Types.Transform) : async Types.Response<Nat> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let book = switch (_classes.book_manager) {
        case (null) return #err(Errors.NotFoundClass("Book manager"));
        case (?val) val;
      };

      let user_credits = book.fetchUserIcpBalance(caller_principal, Principal.fromText(Constants.LEDGER_ID));
      if (user_credits <= 0) {
        return #ok(0);
      };

      let cyclesToAdd = switch (amount_in_e8s) {
        case (?amount) {
          if (amount > user_credits) {
            return #err("Insufficient credits");
          };
          await calculate_cycles_to_add(amount, transform);
        };
        case (null) await calculate_cycles_to_add(user_credits, transform);
      };
      return cyclesToAdd;
    };

    public func add_controller(canister_id : Principal, new_controller : Principal) : async Types.Result {
      // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
      let current_settings = await IC.canister_status({
        canister_id = canister_id;
      });
      let current_controllers = current_settings.settings.controllers;
      let updated_controllers = Array.append(current_controllers, [new_controller]);
      let _canister_settings = await IC.update_settings({
        canister_id;
        settings = {
          controllers = ?updated_controllers;
          compute_allocation = null;
          memory_allocation = null;
          freezing_threshold = null;
          log_visibility = ?current_settings.settings.log_visibility;
          reserved_cycles_limit = ?current_settings.settings.reserved_cycles_limit;
          wasm_memory_limit = ?current_settings.settings.wasm_memory_limit;
          wasm_memory_threshold = ?current_settings.settings.wasm_memory_threshold;
        };
        sender_canister_version = null;
      });
      return #ok("Added permission for controller");
    };

    public func add_cycles(project_id : Types.ProjectId, amount_in_e8s : Nat, caller : Principal, transform : Types.Transform) : async Types.Response<Nat> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let book : Book.Book = switch (_classes.book_manager) {
        case (null) return #err(Errors.NotFoundClass("Book"));
        case (?val) val;
      };

      let _project_manager = switch (_classes.project_manager) {
        case (null) return #err(Errors.NotFoundClass("Project manager"));
        case (?val) val;
      };

      let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
        case (#err(err)) { return #err(err) };
        case (#ok(val)) { val };
      };

      if (project.plan == #freemium) {
        return #err(Errors.NotAllowedOperation());
      };

      let canister_id : Principal = switch (project.canister_id) {
        case (null) { return #err(Errors.NotFoundCanister()) };
        case (?val) { val };
      };

      let claimable = book.fetchUserIcpBalance(caller, Principal.fromText(Constants.LEDGER_ID));

      // Estimate cycles for given amount and add cycles
      let cyclesAdded = switch (await get_cycles_to_add(?amount_in_e8s, caller, transform)) {
        case (#err(err)) {
          return #err(err);
        };
        case (#ok(cycles)) {
          let cycles_added = await _add_cycles(canister_id, cycles);
          cycles_added;
        };
      };

      // let _remaining = _removeCredit(msg.caller, ledger, claimable);

      let removed : Nat = switch (book.removeTokens(caller, Principal.fromText(Constants.LEDGER_ID), claimable)) {
        case (null) 0;
        case (?val) val;
      };

      return #ok(cyclesAdded);
    };

    // Calculates the amount of cycles equivalent to amount in e8s based on xdr price
    public func calculate_cycles_to_add(amountInE8s : Int, transform : Types.Transform) : async Types.Response<Nat> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _price_feed = switch (_classes.price_feed_manager) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let icp_amount = Float.fromInt(amountInE8s) / Float.fromInt(Constants.E8S_PER_ICP);
      let token_price : Types.TokenPrice = switch (await _price_feed.update_icp_price(transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (token_price.value == 0) return #err(Errors.PriceFeedError());
      let usd_value : Float = icp_amount * token_price.value;
      let t_cycles : Float = usd_value / Constants.XDR_PRICE;
      let cyclesToAdd = Int.abs(Float.toInt(Float.floor(t_cycles * Constants.CYCLES_PER_XDR)));
      return #ok(cyclesToAdd);
    };

    // Internal method for adding cycles from amount in cycles
    private func _add_cycles(canister_id : Principal, amount_in_cycles : Nat) : async Nat {
      // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
      ExperimentalCycles.add(amount_in_cycles);
      await IC.deposit_cycles({ canister_id });

      return amount_in_cycles;
    };

    // Function to deploy new asset canister
    public func deploy_asset_canister(user : Principal, is_freemium : Bool, default_controller : Principal) : async Types.Response<Principal> {
      // if (domain.initialized != true or subscription_manager.initialized != true) initialize_class_references();
      // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFoundClass("Canister manager"));
        case (?val) val;
      };

      // Only create a canister if freemium
      if (is_freemium) {
        let tier_id : Nat = switch (_subscription_manager.get_tier_id_freemium()) {
          case (#err(msg)) { return #err(msg) };
          case (#ok(val)) { val };
        };

        let canister_id = switch (await _create_canister(tier_id, user, true, default_controller)) {
          case (#err(_errMsg)) { return #err(_errMsg) };
          case (#ok(id)) { id };
        };
        return #ok(canister_id);

      } else {

        // Create canister and update user subscription
        // Validate user subscription limits
        let user_subscription_res = _subscription_manager.get_subscription(user);
        switch (user_subscription_res) {
          case (#err(error)) {
            return #err(error);
          };
          case (#ok(subscription)) {
            let is_valid_subscription = await _subscription_manager.validate_subscription(user);
            if (is_valid_subscription != true) {
              return #err(Errors.SubscriptionLimitReached());
            };

            try {
              let canister_id = switch (await _create_canister(subscription.tier_id, user, false, default_controller)) {
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

    private func _create_canister(tier_id : Nat, controller : Principal, is_freemium : Bool, default_controller : Principal) : async Types.Response<Principal> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFoundClass("Subscription manager"));
        case (?val) val;
      };

      // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
      let wasm_module = switch (asset_canister_wasm) {
        case null { return #err(Errors.NotFoundWasm()) };
        case (?wasm) { wasm };
      };

      let controllers = switch (is_freemium) {
        case (false) {
          [default_controller, controller];
        };
        case (true) {
          [default_controller];
        };
      };

      // Get cycles to add to fresh canister
      let cyclesForCanister : Int = switch (await _get_cycles_for_canister_init(tier_id, is_freemium)) {
        case (#err(err)) { return #err(err) };
        case (#ok(val)) { val };
      };

      // Ensure cycles amount is enough
      if (cyclesForCanister == 0) {
        return #err(Errors.InsufficientCycleAmount(Int.abs(cyclesForCanister), Constants.MIN_CYCLES_INIT_E8S));
      };

      ExperimentalCycles.add(Int.abs(cyclesForCanister));

      // Set controller
      let settings : IC.canister_settings = {
        controllers = ?controllers;
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
        reserved_cycles_limit = null;
        log_visibility = null;
        wasm_memory_limit = null;
        wasm_memory_threshold = null;
      };

      // Create new canister
      let create_result = await IC.create_canister({
        settings = ?settings;
        sender_canister_version = null;
      });

      let new_canister_id = create_result.canister_id;

      // Construct install code arguments
      let install_code_args : IC.install_code_args = {
        mode = #install;
        canister_id = new_canister_id;
        wasm_module = Blob.fromArray(wasm_module);
        arg = to_candid (());
        sender_canister_version = null;
      };

      // Install the asset canister code
      await IC.install_code(install_code_args);

      // After successful deployment, add to tracking
      Map.add(deployed_canisters, Principal.compare, new_canister_id, true);

      await add_canister_deployment(controller, new_canister_id, is_freemium);

      // Count canister usage in user subscription
      let _pushCanisterId = await _subscription_manager.push_canister_id(controller, new_canister_id); // Update subscription

      return #ok(new_canister_id);
    };

    private func _get_cycles_for_canister_init(tier_id : Nat, is_freemium : Bool) : async Types.Response<Int> {
      switch (is_freemium) {
        case (true) {
          return #ok(Constants.MIN_CYCLES_INIT);
        };
        case (false) {
          return #ok(Constants.MIN_CYCLES_INIT);
        };
      };
    };

    public func clear_asset_canister<system>(canister_id : Principal) : async Types.Response<()> {
      // if (canister_id == backend_principal) {
      //   return #err(Errors.NotAllowedOperation());
      // };

      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _domains = switch (_classes.domain_manager) {
        case (null) return #err(Errors.NotFoundClass("Domains manager"));
        case (?val) val;
      };

      let canister : Types.AssetCanister = actor (Principal.toText(canister_id));

      let deployment_status : Types.CanisterDeployment = switch (get_deployment_by_canister(canister_id)) {
        case (null) {
          let status = {
            canister_id = canister_id;
            status = #uninitialized;
            size = 0;
            date_created = Utility.get_time_now(#milliseconds);
            date_updated = Utility.get_time_now(#milliseconds);
          };
          status;
        };
        case (?val) { val };
      };

      let updated_deployment : Types.CanisterDeployment = {
        canister_id = deployment_status.canister_id;
        status = #uninitialized;
        size = 0;
        date_created = deployment_status.date_created;
        date_updated = Utility.get_time_now(#milliseconds);
      };

      // Restore the ic-domains file
      let asset : ?Types.AssetCanisterAsset = switch (await get_canister_asset(canister_id, "/.well-known/ic-domains")) {
        case (#err(err)) { null };
        case (#ok(val)) { val };
      };

      put_canister_table(canister_id, updated_deployment);

      // Clear the canister assets
      await canister.clear();

      if (asset != null) {
        let asset_file : Types.AssetCanisterAsset = switch (asset) {
          case (null) {
            return #err(Errors.UnexpectedError("setting ic-domains asset file."));
          };
          case (?val) { val };
        };

        // await canister.store
        let file : Types.StaticFile = {
          path = "/.well-known/ic-domains";
          content = asset_file.content;
          content_type = asset_file.content_type;
          content_encoding = ?asset_file.content_encoding;
          is_chunked = false;
          chunk_id = 0;
          batch_id = 0;
          is_last_chunk = true;
        };

        Debug.print("Found well-known/ic-domains file: " # debug_show (file));

        let is_set = switch (await _domains.edit_ic_domains(canister_id, file)) {
          case (#err(err)) return #err(err);
          case (#ok()) return #ok();
        };

      } else {
        Debug.print("Not found well-known/ic-domains file.");
      };
      return #ok();
    };

    /** Controllers*/

    public func get_controllers(canister_id : Principal) : async Types.Response<[Principal]> {
      let current_settings = await IC.canister_status({
        canister_id = canister_id;
      });
      let current_controllers = current_settings.settings.controllers;
      return #ok(current_controllers);
    };

    public func remove_controller(canister_id : Principal, controller_to_remove : Principal) : async Types.Result {
      let current_settings = await IC.canister_status({
        canister_id = canister_id;
      });
      let current_controllers : [Principal] = current_settings.settings.controllers;
      let updated_controllers = Array.filter(current_controllers, func(p : Principal) : Bool { p != controller_to_remove });

      let _canister_settings = await IC.update_settings({
        canister_id;
        settings = {
          controllers = ?updated_controllers;
          compute_allocation = null;
          memory_allocation = null;
          freezing_threshold = null;
          reserved_cycles_limit = ?current_settings.settings.reserved_cycles_limit;
          log_visibility = ?current_settings.settings.log_visibility;
          wasm_memory_limit = ?current_settings.settings.wasm_memory_limit;
          wasm_memory_threshold = ?current_settings.settings.wasm_memory_threshold;
        };
        sender_canister_version = null;
      });

      return #ok("Removed permission for controller");
    };

    public func handle_upload_file(canister_id : Principal, files : [Types.StaticFile], workflow_run_details : ?Types.WorkflowRunDetails) : async Types.Response<Bool> {
      switch (Map.get(deployed_canisters, Principal.compare, canister_id)) {
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

                  // Create a new batch for this chunked file and save the batch id in the batch map
                  let batch = await asset_canister.create_batch();
                  set_batch_map(canister_id, file.batch_id, batch.batch_id);
                };

                let (exists, batch_id) = get_batch_id(canister_id, file.batch_id);
                if (exists == false) {
                  throw Error.reject("[Canister id:  " # Principal.toText(canister_id) # "] Batch ID does not exist");
                };

                await handle_chunked_file(file, asset_canister, batch_id, canister_id);

                if (file.is_last_chunk) {

                  let chunk_ids = get_chunk_ids_for_canister(canister_id, batch_id);

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
                    clear_batch_map(canister_id); // TODO: Verify
                  } catch (error) {
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
                  update_deployment_size(canister_id, contentSize);

                } catch (error) {
                  throw error;
                };
              };

            };
            update_deployment_status(canister_id, #installed); // Update canister deployment status to installed

            #ok(true);
          } catch (error) {
            #err("Failed to upload files: " # Error.message(error));
          };
        };
      };
    }

    /** End class */

  };
};
