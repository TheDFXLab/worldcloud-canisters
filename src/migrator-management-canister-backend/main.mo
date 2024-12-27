// asset_manager.mo

import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Iter "mo:base/Iter";
import Types "types";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Principal "mo:base/Principal";

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

  system func preupgrade() {
    Debug.print("Preupgrade: Starting with defensive approach");

    stable_deployed_canisters := [];
    stable_assets_array := [];
    stable_chunks_array := [];
    stable_canister_files := [];

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
    sync_assets();
    sync_chunks();
    Debug.print("Postupgrade: Syncing deployed canisters.");
    deployed_canisters := HashMap.fromIter(stable_deployed_canisters.vals(), 0, Principal.equal, Principal.hash);
    Debug.print("Postupgrade: Finished postupgrade procedure. Synced stable variables. ");
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

  // Function to deploy new asset canister
  public shared (msg) func deployAssetCanister() : async Types.Result {
    Debug.print("Deploying asset canister");
    let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

    Debug.print("Getting wasm bytes...");
    // Get the stored WASM
    let wasm_module = switch (asset_canister_wasm) {
      case null { return #err("Asset canister WASM not uploaded yet") };
      case (?wasm) { wasm };
    };

    try {

      Debug.print("Adding cycles...");
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

      Debug.print("Installing code on canister " # Principal.toText(new_canister_id));

      // Install the asset canister code
      await IC.install_code({
        arg = Blob.toArray(to_candid (()));
        wasm_module = wasm_module;
        mode = #install;
        canister_id = new_canister_id;
      });

      Debug.print("Code installed");

      // After successful deployment, add to tracking
      deployed_canisters.put(new_canister_id, true);

      return #ok("Asset canister deployed with ID: " # Principal.toText(new_canister_id));
    } catch (error) {
      return #err("Failed to deploy asset canister: " # Error.message(error));
    };
  };

  public query func getCanisterFiles(canister_id : Principal) : async [Types.StaticFile] {
    switch (canister_files.get(canister_id)) {
      case null return [];
      case (?files) return files;
    };
  };

  public func getCanisterAsset(canister_id : Principal, asset_key : Text) : async Types.AssetCanisterAsset {
    let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
    Debug.print("Getting asset: " # asset_key);
    let asset = await asset_canister.get({
      key = asset_key;
      accept_encodings = ["identity"];
    });

    Debug.print("Got asset: " # asset_key);

    return asset;
  };

  public shared (msg) func storeInAssetCanister(
    canister_id : Principal,
    files : [Types.StaticFile],
  ) : async Types.Result {

    // let files = getCanisterFiles(canister_id);
    switch (deployed_canisters.get(canister_id)) {
      case null return #err("Asset canister not found");
      case (?_) {
        try {
          let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));

          for (file in files.vals()) {
            let content = file.content;
            let contentSize = content.size();
            let chunkSize = 1900000; // ~1.9MB, slightly below the 2MB limit

            Debug.print("Attempting to upload file " # file.path);
            Debug.print("Content size: " # Nat.toText(contentSize));
            Debug.print("Chunk size: " # Nat.toText(chunkSize));
            if (contentSize <= chunkSize) {
              Debug.print("Small file, uploading directly");
              Debug.print("Key: " # file.path);
              Debug.print("Content type: " # file.content_type);

              // Small file, upload directly
              try {
                if (file.path == "index.html") {
                  await asset_canister.store({
                    key = file.path;
                    content_type = file.content_type;
                    content_encoding = "identity";
                    content = content;
                    sha256 = null;
                    headers = [
                      ("Cache-Control", "public, no-cache, no-store"),
                      ("X-IC-Certification-Path", "*"),
                    ];
                  });

                  Debug.print("index.html stored with special certification");
                } else {
                  await asset_canister.store({
                    key = file.path;
                    content_type = file.content_type;
                    content_encoding = "identity";
                    content = content;
                    sha256 = null;
                    headers = [];
                  });
                };
                Debug.print("Stored file!");

              } catch (error) {
                Debug.print("Failed to upload file: " # Error.message(error));
                throw error; // Re-throw to be caught by the outer try-catch
              };

              Debug.print("File uploaded successfully");
            } else {

              try {
                Debug.print("Large file, using chunked upload.... Creating batch");

                // Large file, use chunked upload
                let batch = await asset_canister.create_batch();
                Debug.print("Batch created id: " # Nat.toText(batch.batch_id));

                let contentArray = Blob.toArray(content);
                var offset = 0;

                while (offset < contentSize) {
                  let chunkEnd = Nat.min(offset + chunkSize, contentSize);
                  Debug.print("Chunk end: " # Nat.toText(chunkEnd));
                  let chunkArray = Array.subArray(contentArray, offset, chunkEnd - offset);
                  let chunk = Blob.fromArray(chunkArray);

                  Debug.print("Chunk size: " # Nat.toText(chunk.size()));

                  let chunk_id = await asset_canister.create_chunk({
                    batch_id = batch.batch_id;
                    content = chunk;
                  });
                  Debug.print("Chunk created id: " # Nat.toText(chunk_id.chunk_id));

                  offset := chunkEnd;
                };

                Debug.print("Batch ID: " # Nat.toText(batch.batch_id));

                // Commit the batch
                await asset_canister.commit_batch({
                  batch_id = batch.batch_id;
                  operations = [
                    #CreateAsset {
                      key = file.path;
                      content_type = file.content_type;
                    },
                  ];
                });

                Debug.print("Batch committed!!");

              } catch (error) {
                Debug.print("Failed to create batch: " # Error.message(error));
              };

            };

          };

          #ok("Files uploaded successfully");
        } catch (error) {
          #err("Failed to upload files: " # Error.message(error));
        };
      };
    };
  };

  // // Function to upload static files to an asset canister
  // public shared (msg) func uploadToAssetCanister(
  //   canister_id : Principal,
  //   files : [Types.StaticFile],
  // ) : async Types.Result {
  //   // Verify the canister exists
  //   switch (deployed_canisters.get(canister_id)) {
  //     case null return #err("Asset canister not found");
  //     case (?_) {
  //       try {
  //         let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));

  //         // Upload each file
  //         for (file in files.vals()) {
  //           // Store the asset metadata
  //           await asset_canister.store({
  //             key = file.path;
  //             content_type = file.content_type;
  //             content_encoding = file.content_encoding;
  //             content = file.content;
  //             sha256 = null;
  //           });
  //         };

  //         return #ok("Files uploaded successfully");
  //       } catch (error) {
  //         return #err("Failed to upload files: " # Error.message(error));
  //       };
  //     };
  //   };
  // };

  // // Initialize a new asset upload
  public func initializeAsset(id : Types.AssetId, asset : Types.Asset) : async Types.Result {
    Debug.print("Initializing asset in canister: " #id);
    switch (assets.get(id)) {
      case (?existing) {
        Debug.print("Asset ID already exists");
        return #err("Asset ID already exists");
      };
      case null {
        Debug.print("Asset ID does not exist. Initializing new asset.");
        assets.put(id, asset);
        return #ok("Asset initialized");
      };
    };
  };

  // Upload a chunk of an asset
  public shared (msg) func uploadChunk(chunk : Types.AssetChunk) : async Types.Result {
    // Verify asset exists
    switch (assets.get(chunk.asset_id)) {
      case null return #err("Asset not found");
      case (?asset) {
        if (chunk.chunk_id >= asset.chunks) {
          return #err("Invalid chunk ID");
        };

        // Store the chunk
        let chunk_key = chunk.asset_id # ":" # Nat32.toText(chunk.chunk_id);
        chunks.put(chunk_key, chunk.data);

        return #ok("Chunk uploaded");
      };
    };
  };

  // Get asset metadata
  public query func getAsset(id : Types.AssetId) : async ?Types.Asset {
    assets.get(id);
  };

  // Get a specific chunk
  public query func getChunk(asset_id : Types.AssetId, chunk_id : Types.ChunkId) : async ?Blob {
    let chunk_key = asset_id # ":" # Nat32.toText(chunk_id);
    chunks.get(chunk_key);
  };

  // Check if all chunks are uploaded
  public query func isAssetComplete(id : Types.AssetId) : async Bool {
    switch (assets.get(id)) {
      case null return false;
      case (?asset) {
        var i : Nat32 = 0;
        while (i < asset.chunks) {
          let chunk_key = id # ":" # Nat32.toText(i);
          switch (chunks.get(chunk_key)) {
            case null return false;
            case (?_) {};
          };
          i += 1;
        };
        return true;
      };
    };
  };

  // Delete an asset and its chunks
  public shared (msg) func deleteAsset(id : Types.AssetId) : async Types.Result {
    switch (assets.get(id)) {
      case null return #err("Asset not found");
      case (?asset) {
        assets.delete(id);

        // Delete all chunks
        var i : Nat32 = 0;
        while (i < asset.chunks) {
          let chunk_key = id # ":" # Nat32.toText(i);
          chunks.delete(chunk_key);
          i += 1;
        };

        return #ok("Asset deleted");
      };
    };
  };
};
