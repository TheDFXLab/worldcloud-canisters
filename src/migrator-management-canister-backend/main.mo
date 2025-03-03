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
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Types "types";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Principal "mo:base/Principal";
import Bool "mo:base/Bool";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Account "Account";
import Book "./book";
import SubscriptionManager "./modules/subscription";
import AccessControl "./modules/access";

// TODO: Remove all deprecated code such as `initializeAsset`, `uploadChunk`, `getAsset`, `getChunk`, `isAssetComplete`, `deleteAsset`
// TODO: Handle stable variables (if needed)
// TODO: Remove unneeded if else in `storeInAssetCanister` for handling files larger than ±2MB (since its handled by frontend)
shared (deployMsg) actor class CanisterManager() = this {

  // var IC_MANAGEMENT_CANISTER : Text = "rwlgt-iiaaa-aaaaa-aaaaa-cai"; // Local replica
  let IC_MANAGEMENT_CANISTER = "aaaaa-aa"; // Production
  let ledger : Principal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");

  // TODO: Get these from price oracle canister
  let ICP_PRICE : Float = 10;
  let XDR_PRICE : Float = 1.33;
  let E8S_PER_ICP : Float = 100_000_000;
  let CYCLES_PER_XDR : Float = 1_000_000_000_000;

  let icp_fee : Nat = 10_000;
  // let ledger : Principal = Principal.fromActor(IcpLedger);
  let Ledger : Types.Ledger = actor (Principal.toText(ledger));

  // Store the WASM bytes in stable memory
  private stable var asset_canister_wasm : ?[Nat8] = null;

  private var canister_files = HashMap.HashMap<Principal, [Types.StaticFile]>(0, Principal.equal, Principal.hash);
  private stable var stable_canister_files : [(Principal, [Types.StaticFile])] = [];

  private var deployed_canisters = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);
  private stable var stable_deployed_canisters : [(Principal, Bool)] = [];

  //Store asset metadata
  private var assets = HashMap.HashMap<Types.AssetId, Types.Asset>(0, Text.equal, Text.hash);
  private stable var stable_assets_array : [Types.Asset] = [];

  //Store chunks for each asset
  //Key format: "assetId:chunkId"
  private var chunks = HashMap.HashMap<Text, Blob>(0, Text.equal, Text.hash);
  private stable var stable_chunks_array : [Types.AssetChunk] = [];

  // private var batchMap: HashMap.HashMap<Nat, Nat> = HashMap.HashMap<Nat, Nat>(0, Nat.equal, Hash.hash);
  private var canisterBatchMap : Types.CanisterBatchMap = HashMap.HashMap<Principal, (Types.BatchMap, Types.BatchChunks)>(0, Principal.equal, Principal.hash);

  private var canister_table : HashMap.HashMap<Principal, Types.CanisterDeployment> = HashMap.HashMap<Principal, Types.CanisterDeployment>(0, Principal.equal, Principal.hash);
  private stable var stable_canister_table : [(Principal, Types.CanisterDeployment)] = [];
  private var user_canisters : Types.UserCanisters = HashMap.HashMap<Principal, [Principal]>(0, Principal.equal, Principal.hash);
  private stable var stable_user_canisters : [(Principal, [Principal])] = [];

  private var pending_cycles : HashMap.HashMap<Principal, Nat> = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
  private stable var stable_pending_cycles : [(Principal, Nat)] = [];

  private var book : Book.Book = Book.Book();
  private stable var stable_book : [(Principal, [(Types.Token, Nat)])] = [];

  private var workflow_run_history : Types.WorkflowRunHistory = HashMap.HashMap<Principal, [Types.WorkflowRunDetails]>(0, Principal.equal, Principal.hash);
  private stable var stable_workflow_run_history : [(Principal, [Types.WorkflowRunDetails])] = [];

  // Subscription manager class
  private let subscription_manager = SubscriptionManager.SubscriptionManager(book, ledger);
  private stable var stable_subscriptions : [(Principal, Types.Subscription)] = [];

  private let access_control = AccessControl.AccessControl(deployMsg.caller);
  private stable var stable_role_map : [(Principal, Types.Role)] = [];

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

  /** Subscription */
  // Create a subscription for the caller
  public shared (msg) func create_subscription(tier_id : Nat) : async Types.Response<Types.Subscription> {
    return await subscription_manager.create_subscription(msg.caller, tier_id);
  };

  public shared (msg) func get_tiers() : async [Types.Tier] {
    return subscription_manager.tiers_list;
  };

  // Get the caller's subscription
  public shared (msg) func get_subscription() : async Types.Response<Types.Subscription> {
    return await subscription_manager.get_subscription(msg.caller);
  };

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

  public shared (msg) func getWorkflowRunHistory(canister_id : Principal) : async [Types.WorkflowRunDetails] {
    // Only owner or admins
    assert ((await _isController(canister_id, msg.caller)) or access_control.is_authorized(msg.caller));

    var workflow_run_history_array : [Types.WorkflowRunDetails] = switch (workflow_run_history.get(canister_id)) {
      case null { [] };
      case (?workflow_run_history) { workflow_run_history };
    };

    return workflow_run_history_array;
  };

  public shared (msg) func getCanisterDeployments() : async [Types.CanisterDeployment] {
    switch (user_canisters.get(msg.caller)) {
      case null { [] };
      case (?canisters) {
        // canisters
        var all_canisters : [Types.CanisterDeployment] = [];
        for (canister in canisters.vals()) {
          let deployment = canister_table.get(canister);
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

  public shared (msg) func getCanisterStatus(canister_id : Principal) : async Types.CanisterStatusResponse {
    // Only owner or admins
    assert ((await _isController(canister_id, msg.caller)) or access_control.is_authorized(msg.caller));

    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });

    return current_settings;
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

  private func _updateWorkflowRun(canister_id : Principal, workflow_run_details : Types.WorkflowRunDetails) : async Types.Result {
    // assert (await _isController(canister_id, msg.caller));

    let workflow_run_history_array = switch (workflow_run_history.get(canister_id)) {
      case null { [] };
      case (?workflow_run_history) { workflow_run_history };
    };

    let target_workflow_run = Array.filter(workflow_run_history_array, func(workflow_run : Types.WorkflowRunDetails) : Bool { workflow_run.workflow_run_id == workflow_run_details.workflow_run_id });

    // Create new entry for workflow run
    if (target_workflow_run.size() == 0) {
      let updated_history = Array.append(workflow_run_history_array, [workflow_run_details]);
      workflow_run_history.put(canister_id, updated_history);
      return #ok("New workflow run created for: " # Principal.toText(canister_id) # " with id: " # Nat.toText(workflow_run_details.workflow_run_id));
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

    workflow_run_history.put(canister_id, updated_history);

    return #ok("Workflow run updated");
  };

  // After user transfers ICP to the target subaccount
  public shared (msg) func depositIcp() : async Types.DepositReceipt {
    // Get amount of ICP in the caller's subaccount
    // let balance = await getMyPendingDeposits();
    let balance = await getPendingDeposits(msg.caller);
    Debug.print("User balance: " # Nat64.toText(balance.e8s));

    // Transfer to default subaccount of this canister
    let result = await deposit(msg.caller, Nat64.toNat(balance.e8s));
    switch result {
      case (#Ok(available)) {
        Debug.print("Deposit result: " # Nat.toText(available));
        return #Ok(available);
      };
      case (#Err(error)) {
        Debug.print("Deposit error: ");
        return #Err(error);
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
          timestamp_nanos = Nat64.fromNat(Int.abs(Time.now()));
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
  public shared (msg) func deployAssetCanister() : async Types.Result {
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    // Get the stored WASM
    let _wasm_module = switch (asset_canister_wasm) {
      case null { return #err("Asset canister WASM not uploaded yet") };
      case (?wasm) { wasm };
    };

    // Validate user subscription limits
    let user_subscription_res = await subscription_manager.get_subscription(msg.caller);
    switch (user_subscription_res) {
      case (#err(error)) {
        return #err(error);
      };
      case (#ok(subscription)) {
        Debug.print("User subscription: " # Nat.toText(subscription.tier_id));
        let is_valid_subscription = await subscription_manager.validate_subscription(msg.caller);
        if (is_valid_subscription != true) {
          return #err("You have reached the maximum number of canisters for your subscription tier.");
        };

        try {

          Debug.print("[Identity " # Principal.toText(msg.caller) # "] Adding cycles....");

          return await _create_canister(subscription, msg.caller, _wasm_module);
        } catch (error) {
          return #err("Failed to deploy asset canister: " # Error.message(error));
        };
      };
    };

  };

  private func _create_canister(user_subscription : Types.Subscription, controller : Principal, wasm_module : [Nat8]) : async Types.Result {
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    // Create new canister

    let min_deposit = subscription_manager.tiers_list[user_subscription.tier_id].min_deposit;
    let deposit_per_canister = Nat64.toNat(min_deposit.e8s) / user_subscription.max_slots;

    let cyclesForCanister = calculateCyclesToAdd(deposit_per_canister);

    Debug.print("Adding cycles for canister: " # Int.toText(Float.toInt(cyclesForCanister)));
    ExperimentalCycles.add(Int.abs(Float.toInt(cyclesForCanister)));

    let settings : Types.CanisterSettings = {
      freezing_threshold = null;
      controllers = ?[Principal.fromActor(this), controller];
      memory_allocation = null;
      compute_allocation = null;
    };

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

    await _addCanisterDeployment(controller, new_canister_id);

    return #ok(Principal.toText(new_canister_id));
  };
  /**
  * Store files in asset canister
  * @param canister_id - The ID of the asset canister to store the files in
  * @param files - The files to store in the asset canister
  * @returns A result indicating the success or failure of the operation
*/
  public shared (msg) func storeInAssetCanister(
    canister_id : Principal,
    files : [Types.StaticFile],
    workflow_run_details : ?Types.WorkflowRunDetails,
  ) : async Types.Result {
    assert ((await _isController(canister_id, msg.caller)) or access_control.is_authorized(msg.caller));

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
              var time = Time.now();
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
              let _updateHistory = await _updateWorkflowRun(canister_id, workflow_details);
            };
            case (?workflow_run_details) {
              let _updateHistory = await _updateWorkflowRun(canister_id, workflow_run_details);
            };
          };

          let _addControllerRespons = await _addController(canister_id, msg.caller);
          #ok("Files uploaded successfully");
        } catch (error) {
          #err("Failed to upload files: " # Error.message(error));
        };
      };
    };

  };

  private func _updateCanisterDeploymentSize(canister_id : Principal, new_file_size : Nat) {
    let deployment = canister_table.get(canister_id);
    switch (deployment) {
      case null {
        Debug.print("Canister deployment not found");
      };
      case (?deployment) {
        let updated_deployment = {
          canister_id = deployment.canister_id;
          status = deployment.status;
          date_created = deployment.date_created;
          date_updated = Time.now();
          size = deployment.size + new_file_size;
        };
        canister_table.put(canister_id, updated_deployment);
      };
    };
  };

  private func _updateCanisterDeployment(canister_id : Principal, status : Types.CanisterDeploymentStatus) {
    let deployment = canister_table.get(canister_id);

    switch (deployment) {
      case null {
        Debug.print("Canister deployment not found");
      };
      case (?deployment) {
        Debug.print("Canister deployment found");
        let updated_deployment = {
          canister_id = canister_id;
          status = status;
          date_created = deployment.date_created;
          date_updated = Time.now();
          size = deployment.size;
        };
        canister_table.put(canister_id, updated_deployment);
      };
    };

  };

  private func _addCanisterDeployment(caller : Principal, canister_id : Principal) : async () {
    let deployment = {
      canister_id = canister_id;
      status = #uninitialized;
      date_created = Time.now();
      date_updated = Time.now();
      size = 0;
    };

    let canisters = switch (user_canisters.get(caller)) {
      case null { [] };
      case (?d) { d };
    };

    let new_canisters = Array.append(canisters, [canister_id]);

    user_canisters.put(caller, new_canisters);
    canister_table.put(canister_id, deployment); // Add to canister table

    let _pushCanisterId = await subscription_manager.push_canister_id(caller, canister_id); // Update subscription
    Debug.print("Added canister deployment by " # Principal.toText(caller) # " for " # Principal.toText(canister_id) # ". Total deployments: " # Nat.toText(new_canisters.size()));
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
    canister_table_to_stable_array();

    workflow_run_history_to_stable_array();
    workflow_run_history_from_stable_array();

    // Restore subscriptions
    stable_subscriptions := subscription_manager.getStableData();
    Debug.print("Stable subscriptions: " # Nat.toText(stable_subscriptions.size()));
    Debug.print("All Subs" # debug_show (stable_subscriptions));

    // Save book to stable array
    stable_book := book.toStable();

    stable_role_map := access_control.getStableData();

    Debug.print("Preupgrade: Variables initialized, beginning conversion");
    Debug.print("Preupgrade: Preparing to sync assets and chunks.");
    Debug.print("Preupgrade: Assets: " # Nat.toText(assets.size()));
    Debug.print("Preupgrade: Chunks: " # Nat.toText(chunks.size()));
    Debug.print("Preupgrade: Canister files: " # Nat.toText(canister_files.size()));
    assets_to_stable_array();
    chunks_to_stable_array();

    stable_deployed_canisters := Iter.toArray(deployed_canisters.entries());
    Debug.print("Preupgrade: Finished preupgrade procedure. Ready for upgrade. ");
  };

  system func postupgrade() {
    Debug.print("Postupgrade: Syncing assets and chunks.");
    Debug.print("Postupgrade: Assets: " # Nat.toText(assets.size()));
    Debug.print("Postupgrade: Chunks: " # Nat.toText(chunks.size()));
    Debug.print("Postupgrade: Canister files: " # Nat.toText(canister_files.size()));
    canister_deployments_from_stable_array();
    canister_table_from_stable_array();

    // Restore subscriptions
    subscription_manager.loadFromStable(stable_subscriptions);
    Debug.print("PostUpgrade: Restored subscriptions");
    Debug.print("PostUpgrade: Restored subscriptions size: " # Nat.toText(stable_subscriptions.size()));
    Debug.print("PostUpgrade: Restored subscriptions: " # debug_show (stable_subscriptions));

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
  };

  private func canister_table_to_stable_array() {
    stable_canister_table := Iter.toArray(canister_table.entries());
    Debug.print("Preupgrade: Backing up canister deployments: " # Nat.toText(stable_user_canisters.size()));
  };

  private func canister_table_from_stable_array() {
    canister_table := HashMap.fromIter(stable_canister_table.vals(), 0, Principal.equal, Principal.hash);
    Debug.print("Postupgrade: Restored canister deployments: " # Nat.toText(canister_table.size()));
  };

  private func canister_deployments_to_stable_array() {
    stable_user_canisters := Iter.toArray(user_canisters.entries());
    Debug.print("Preupgrade: Backing up canister deployments: " # Nat.toText(stable_user_canisters.size()));
  };

  private func canister_deployments_from_stable_array() {
    user_canisters := HashMap.fromIter(stable_user_canisters.vals(), 0, Principal.equal, Principal.hash);
    Debug.print("Postupgrade: Restored canister deployments: " # Nat.toText(user_canisters.size()));
  };

  private func workflow_run_history_to_stable_array() {
    stable_workflow_run_history := Iter.toArray(workflow_run_history.entries());
    Debug.print("Preupgrade: Backing up workflow run history: " # Nat.toText(stable_workflow_run_history.size()));
  };

  private func workflow_run_history_from_stable_array() {
    workflow_run_history := HashMap.fromIter(stable_workflow_run_history.vals(), stable_workflow_run_history.size(), Principal.equal, Principal.hash);
    Debug.print("Postupgrade: Restored workflow run history: " # Nat.toText(workflow_run_history.size()));
  };

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
