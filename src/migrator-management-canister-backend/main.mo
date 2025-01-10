// asset_manager.mo

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Iter "mo:base/Iter";
import Types "types";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Principal "mo:base/Principal";
import Bool "mo:base/Bool";
import Time "mo:base/Time";
import Account "Account";

// TODO: Remove all deprecated code such as `initializeAsset`, `uploadChunk`, `getAsset`, `getChunk`, `isAssetComplete`, `deleteAsset`
// TODO: Handle stable variables (if needed)
// TODO: Remove unneeded if else in `storeInAssetCanister` for handling files larger than ±2MB (since its handled by frontend)
actor CanisterManager {

  // var IC_MANAGEMENT_CANISTER : Text = "rwlgt-iiaaa-aaaaa-aaaaa-cai"; // Local replica
  let IC_MANAGEMENT_CANISTER = "aaaaa-aa"; // Production

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
  private var canisterBatchMap: Types.CanisterBatchMap = HashMap.HashMap<Principal, (Types.BatchMap, Types.BatchChunks)>(0, Principal.equal, Principal.hash);
  
  private var canister_table: HashMap.HashMap<Principal, Types.CanisterDeployment> = HashMap.HashMap<Principal, Types.CanisterDeployment>(0, Principal.equal, Principal.hash);
  private stable var stable_canister_table: [(Principal, Types.CanisterDeployment)] = [];
  private var user_canisters: Types.UserCanisters = HashMap.HashMap<Principal, [Principal]>(0, Principal.equal, Principal.hash);
  private stable var stable_user_canisters: [(Principal, [Principal])] = [];

  private var pending_cycles: HashMap.HashMap<Principal, Nat> = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
  private stable var stable_pending_cycles: [(Principal, Nat)] = [];

  // Function to upload the asset canister WASM
  public shared (msg) func uploadAssetCanisterWasm(wasm : [Nat8]) : async Types.Result {
    // Add authorization check here
    asset_canister_wasm := ?wasm;
    return #ok("Asset canister WASM uploaded successfully");
  };

  // Helper function to get all deployed asset canisters
  public query func getDeployedCanisters() : async [Principal] {
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

  public shared (msg) func getAssetList(canister_id: Principal) : async Types.ListResponse {
    try {
        let asset_canister: Types.AssetCanister = actor(Principal.toText(canister_id));
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

  public shared (msg) func getCanisterDeployments() : async [Types.CanisterDeployment] {
    switch (user_canisters.get(msg.caller)) {
      case null { [] };
      case (?canisters) { 
        // canisters 
        var all_canisters: [Types.CanisterDeployment] = [];
        for (canister in canisters.vals()) {
          let deployment = canister_table.get(canister);
          switch(deployment) {
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

  public query func getCanisterFiles(canister_id : Principal) : async [Types.StaticFile] {
    switch (canister_files.get(canister_id)) {
      case null return [];
      case (?files) return files;
    };
  };

  public shared (msg)func getCanisterAsset(canister_id : Principal, asset_key : Text) : async Types.AssetCanisterAsset {
    // Check if the caller is a controller
    assert(await _isController(canister_id, msg.caller));
    
    let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
    let asset = await asset_canister.get({
      key = asset_key;
      accept_encodings =["identity", "gzip", "compress"];
    });

    return asset;
  };

  public shared (msg) func getCanisterStatus(canister_id: Principal) : async Types.CanisterStatusResponse {
     // Check if the caller is a controller
    assert(await _isController(canister_id, msg.caller));

    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({ canister_id = canister_id });
    return current_settings;
  };

  public shared (msg) func getControllers(canister_id: Principal) : async [Principal] {
    // Check if the caller is a controller
    assert(await _isController(canister_id, msg.caller));

    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({ canister_id = canister_id });
    Debug.print("Current settings..");
    let current_controllers = switch (current_settings.settings.controllers) {
      case null [];
      case (?controllers) controllers;
    };
    return current_controllers;
  };

  private func _isController(canister_id: Principal, caller: Principal) :async Bool {
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({ canister_id = canister_id });
    let current_controllers = switch (current_settings.settings.controllers) {
      case null false;
      case (?controllers) { 
        let matches = Array.filter(controllers, func (p: Principal) : Bool { p == caller });
        return matches.size() > 0;
        };
    };
  };

  /**********
  * Write Methods
  **********/

  public shared(msg) func addController(canister_id: Principal, new_controller: Principal) : async Types.Result {
    // Check if the caller is a controller
    if (not (await _isController(canister_id, msg.caller))) {
      return #err("You are not a controller");
    };

    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({ canister_id = canister_id });
    Debug.print("Current settings..");
    let current_controllers = switch (current_settings.settings.controllers) {
      case null [];
      case (?controllers) controllers;
    };
    Debug.print("Current controllers: " # Nat.toText(current_controllers.size()));
    let updated_controllers = Array.append(current_controllers, [new_controller]);
    Debug.print("Updated controllers: " # Nat.toText(updated_controllers.size()));
    let canister_settings = await IC.update_settings({
      canister_id;
      settings = {
        controllers = ?updated_controllers;
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
      }
    });
    Debug.print("Canister settings updated");
    return #ok("Added permission for controller");
  };

  public shared(msg) func removeController(canister_id: Principal, controller_to_remove: Principal) : async (Types.Result) {
     // Check if the caller is a controller
    if (not (await _isController(canister_id, msg.caller))) {
      return #err("You are not a controller");
    };

    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({ canister_id = canister_id });
    let current_controllers = switch (current_settings.settings.controllers) {
      case null [];
      case (?controllers) controllers;
    };
    let updated_controllers = Array.filter(current_controllers, func (p: Principal) : Bool { p != controller_to_remove });
    
    let canister_settings = await IC.update_settings({
      canister_id;
      settings = {
        controllers = ?updated_controllers;
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
      }
    });
    return #ok("Removed permission for controller");
  };


  public shared (msg) func addCycles(canister_id: Principal, amountInCycles: Nat) {
    let IC: Types.IC = actor (IC_MANAGEMENT_CANISTER);

    ExperimentalCycles.add(amountInCycles);
    Debug.print("Depositing..." # Nat.toText(amountInCycles) # " cycles to canister " # Principal.toText(canister_id));
    await IC.deposit_cycles({canister_id});
    Debug.print("Added cycles to canister " # Principal.toText(canister_id));
  };


  // TODO: Remove
  public shared (msg) func wallet_receive() : async Nat {
    let amount = ExperimentalCycles.available();
    let accepted = ExperimentalCycles.accept(amount);

    let user_cycles = switch (pending_cycles.get(msg.caller)) {
      case null { 0 };
      case (?cycles) { cycles };
    };
    pending_cycles.put(msg.caller, user_cycles + accepted);
    Debug.print("Accepted cycles: " # Nat.toText(accepted));
    return accepted;
  };

  // TODO: Remove
  public shared(msg) func wallet_send(amount : Nat, destination: Principal) : async Nat {
  assert(await _isController(destination, msg.caller));
  ExperimentalCycles.add(amount);
  let canister : actor { wallet_receive : () -> async Nat } = actor(Principal.toText(destination));
  let result = await canister.wallet_receive();

  let user_cycles = switch (pending_cycles.get(msg.caller)) {
    case null { 0 };
    case (?cycles) { cycles };
  };

  if (user_cycles < amount) {
    throw Error.reject("Insufficient cycles");
  };

  pending_cycles.put(msg.caller, user_cycles - amount);
  let remaining_cycles = switch (pending_cycles.get(msg.caller)) {
    case null { 0 };
    case (?cycles) { cycles };
  };
  Debug.print("Remaining cycles: " # Nat.toText(remaining_cycles));
  return result;
};


// Function to deploy new asset canister
public shared (msg) func deployAssetCanister() : async Types.Result {
  let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
  // Get the stored WASM
  let wasm_module = switch (asset_canister_wasm) {
    case null { return #err("Asset canister WASM not uploaded yet") };
    case (?wasm) { wasm };
  };

  try {
    Debug.print("[Identity " # Principal.toText(msg.caller) # "] Adding cycles....");
    // Create new canister
    let cyclesForCanister = 1_000_000_000_000; // 1T cycles
    ExperimentalCycles.add(cyclesForCanister);

    Debug.print("Creating canister...");
    let settings : Types.CanisterSettings = {
      freezing_threshold = null;
      controllers = ?[Principal.fromActor(CanisterManager), msg.caller];
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

    _addCanisterDeployment(msg.caller, new_canister_id);

    return #ok(Principal.toText(new_canister_id));
  } catch (error) {
    return #err("Failed to deploy asset canister: " # Error.message(error));
  };
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
) : async Types.Result {

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
                                ("Content-Encoding", "identity")
                            ];
                        },
                        #SetAssetContent {
                            key = file.path;
                            content_encoding = "identity";
                            chunk_ids = chunk_ids;
                            sha256 = null;
                        }
                    ]
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
                  headers =  if (file.path == "index.html") {
                    [
                      ("Cache-Control", "public, no-cache, no-store"),
                      ("X-IC-Certification-Path", "*"),
                    ]
                  } else {
                    []
                  };
                });
              Debug.print("[Canister " # Principal.toText(canister_id) # "] Stored file at " # file.path # " with size " # Nat.toText(contentSize) # " bytes");

            } catch (error) {
              Debug.print("[Canister " # Principal.toText(canister_id) # "] Failed to upload file: " # Error.message(error));
              throw error;
            };
          };

        };
        _updateCanisterDeployment(canister_id, #installed); // Update canister deployment status to installed
        #ok("Files uploaded successfully");
      } catch (error) {
        #err("Failed to upload files: " # Error.message(error));
      };
    };
  };

};

  private func _updateCanisterDeployment(canister_id: Principal, status: Types.CanisterDeploymentStatus) {
    let deployment = canister_table.get(canister_id);

    switch(deployment) {
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

  private func _addCanisterDeployment(caller: Principal, canister_id: Principal) {
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
    Debug.print("Added canister deployment by " # Principal.toText(caller) # " for " # Principal.toText(canister_id) # ". Total deployments: " # Nat.toText(new_canisters.size()));
  };


  private func _handleChunkedFile(file: Types.StaticFile, asset_canister: Types.AssetCanister, batch_id: Nat, canister_id: Principal): async () {
      let chunk = await asset_canister.create_chunk({
        batch_id = batch_id;
        content = file.content;
      });
      
      _addChunkId(canister_id, batch_id, chunk.chunk_id);
                
      Debug.print("Creating chunk for batch id " # Nat.toText(batch_id) # "with chunk id " # Nat.toText(chunk.chunk_id));

      Debug.print("Uploaded chunk ID: " # Nat.toText(chunk.chunk_id));
  };

  private func _addChunkId(canister_id: Principal, batch_id: Nat, chunk_id: Nat) {
    switch(canisterBatchMap.get(canister_id)) {
        case (?(_, batchChunks)) {
            let existing = switch(batchChunks.get(batch_id)) {
                case null { [] };
                case (?chunks) { chunks };
            };
            batchChunks.put(batch_id, Array.append(existing, [chunk_id]));
        };
        case null { };
    };
};

  // Gets the chunk ids for a given batch id
  private func _getChunkIdsForCanister(canister_id: Principal, batch_id: Nat): [Nat] {
    switch(canisterBatchMap.get(canister_id)) {
      case (?(_, batchChunks)) {
        switch(batchChunks.get(batch_id)) {
          case (?chunks) { chunks };
          case null { [] };
        };
      };
      case null { [] };
    };
  };


// Gets the actual batch id for a given file id
  private func _getBatchId(canister_id: Principal, file_batch_id: Nat): (Bool, Nat) {
    let batchMap = canisterBatchMap.get(canister_id);
    switch(batchMap) {  
      case null {
        Debug.print("Batch map does not exist");
        return (false, 0);
      };
      case (?(batchMap, _)) {
        let actual_batch_id = batchMap.get(file_batch_id);
        Debug.print("Getting batch id for batch " # Nat.toText(file_batch_id));
        
        switch(actual_batch_id) {
            case null {
              Debug.print("Batch ID does not exist");
              return (false, 0);
            };
            case (?actual_batch_id) {
              Debug.print("Batch ID exists: " # Nat.toText(actual_batch_id));
              return (true, actual_batch_id);
            }
        }
      };
    };
  };

  // Initializes a file batch map for a given canister (called only on first chunk of file)
  private func _setBatchMap(canister_id: Principal, file_batch_id: Nat, batch_id: Nat) {
    let batchMap = canisterBatchMap.get(canister_id);

    switch(batchMap) {
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
    sync_assets();
    sync_chunks();
    Debug.print("Postupgrade: Syncing deployed canisters.");
    deployed_canisters := HashMap.fromIter(stable_deployed_canisters.vals(), 0, Principal.equal, Principal.hash);
    Debug.print("Postupgrade: Finished postupgrade procedure. Synced stable variables. ");
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
