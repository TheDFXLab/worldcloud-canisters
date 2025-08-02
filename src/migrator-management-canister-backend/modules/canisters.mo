import Types "../types";
import Map "mo:core/Map";
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

module {
  public class Canisters(canister_table_init : Types.CanisterDeploymentMap, user_canisters_init : Types.UserCanistersMap, deployed_canisters_init : Types.DeployedCanistersMap) {
    public var canister_table : Map.Map<Principal, Types.CanisterDeployment> = canister_table_init;
    public var user_canisters : Types.UserCanistersMap = user_canisters_init;
    public var deployed_canisters : Types.DeployedCanistersMap = deployed_canisters_init;

    // Transient
    private var canisterBatchMap : Types.CanisterBatchMap = HashMap.HashMap<Principal, (Types.BatchMap, Types.BatchChunks)>(0, Principal.equal, Principal.hash);

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
