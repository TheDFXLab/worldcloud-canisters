import HashMap "mo:base/HashMap";
import Time "mo:base/Time";

module {
    public type Key = Text;
    // Type definitions
    public type AssetId = Text;
    public type ChunkId = Nat32;

    public type StaticFile = {
        path : Text;
        content_type : Text;
        content_encoding : ?Text;
        content : Blob;
        is_chunked : Bool;
        chunk_id : Nat;
        batch_id : Nat;
        is_last_chunk : Bool;
    };

    // Asset canister operations
    public type Operation = {
        #CreateAsset : {
            key : Text;
            content_type : Text;
            headers : ?[(Text, Text)];
        };
        #SetAssetContent : {
            key : Key;
            content_encoding : Text;
            chunk_ids : [Nat];
            sha256 : ?Blob;
        };
        #DeleteAsset : {
            key : Text;
        };
        #Clear : {};
        #SetAssetProperties : {
            key : Text;
            max_age : ?Nat64;
            headers : ?[(Text, Text)];
            allow_raw_access : ?Bool;
        };
        #UnsetAssetContent : {
            key : Text;
            content_encoding : Text;
        };
    };

    public type CertifiedTree = {
        root : Blob;
        proofs : [Blob];
    };

    // Asset canister
    public type AssetCanister = actor {
        get : shared ({ key : Text; accept_encodings : [Text] }) -> async AssetCanisterAsset;

        store : shared ({
            key : Text;
            content_type : Text;
            content_encoding : Text;
            content : Blob;
            sha256 : ?Blob;
            headers : [(Text, Text)];
        }) -> async ();

        create_batch : shared () -> async { batch_id : Nat };

        create_chunk : shared ({
            batch_id : Nat;
            content : Blob;
        }) -> async {
            chunk_id : Nat;
        };

        commit_batch : shared ({
            batch_id : Nat;
            operations : [Operation];
        }) -> async ();
    };

    public type Asset = {
        id : AssetId;
        name : Text; // e.g., "docs/report.pdf"
        content_type : Text; // e.g., "application/pdf"
        total_size : Nat; // Total file size in bytes
        chunks : Nat32; // Total number of chunks expected
        encoding : ?Text;
    };
    public type AssetCanisterAsset = {
        content : Blob;
        content_type : Text;
        content_encoding : Text;
        sha256 : ?Blob;
        total_length : Nat;
    };

    public type AssetChunk = {
        asset_id : AssetId;
        chunk_id : ChunkId;
        data : Blob;
    };

    public type Result = {
        #ok : Text;
        #err : Text;
    };

    public type CanisterSettings = {
        freezing_threshold : ?Nat;
        controllers : ?[Principal];
        memory_allocation : ?Nat;
        compute_allocation : ?Nat;
    };

    public type IC = actor {
        create_canister : shared {
            settings : ?CanisterSettings;
        } -> async {
            canister_id : Principal;
        };

        install_code : shared {
            arg : [Nat8];
            wasm_module : [Nat8];
            mode : { #install; #reinstall; #upgrade };
            canister_id : Principal;
        } -> async ();
    };

    public type CanisterDeploymentStatus = {
        #uninitialized;
        #installing;
        #installed;
        #failed;
    };

    // public type CanisterBatchMap = HashMap.HashMap<Principal, BatchMap>;
    public type BatchMap = HashMap.HashMap<Nat, Nat>;
    public type BatchChunks = HashMap.HashMap<Nat, [Nat]>; // batch_id -> chunk_ids
    public type CanisterBatchMap = HashMap.HashMap<Principal, (BatchMap, BatchChunks)>;
    public type CanisterDeployment = {
        canister_id : Principal;
        status : CanisterDeploymentStatus;
        size : Nat;
        date_created : Time.Time;
        date_updated : Time.Time;
    };

    public type UserCanisters = HashMap.HashMap<Principal, [Principal]>;
};
