import HashMap "mo:base/HashMap";
import TimeLib "mo:base/Time";
import Array "mo:base/Array";
import Blob "mo:base/Blob";

module {
    // Type definitions
    public type AssetId = Text;
    public type ChunkId = Nat32;

    public type Token = Principal;
    public type Tokens = {
        e8s : Nat64;
    };
    public type DepositReceipt = {
        #Ok : Nat;
        #Err : DepositErr;
    };
    public type DepositErr = {
        #BalanceLow;
        #TransferFailure;
    };

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

    public type Key = Text;
    public type Time = Int;

    public type AssetEncoding = {
        content_encoding : Text;
        sha256 : ?[Nat8];
        length : Nat;
        modified : Int;
    };

    public type CanisterAsset = {
        key : Key;
        content_type : Text;
        encodings : [AssetEncoding];
    };

    public type ListResponse = {
        count : Nat;
        assets : [CanisterAsset];
    };

    // Asset canister
    public type AssetCanister = actor {
        get : shared ({ key : Text; accept_encodings : [Text] }) -> async AssetCanisterAsset;
        list : shared query {} -> async [CanisterAsset];
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

    public type CanisterSettings = {
        freezing_threshold : ?Nat;
        controllers : ?[Principal];
        memory_allocation : ?Nat;
        compute_allocation : ?Nat;
    };
    public type CanisterStatus = {
        #running;
        #stopping;
        #stopped;
    };

    public type CanisterStatusResponse = {
        status : CanisterStatus;
        cycles : Nat;
        settings : CanisterSettings;
    };

    public type IC = actor {
        canister_status : shared { canister_id : Principal } -> async CanisterStatusResponse;
        create_canister : shared {
            settings : ?CanisterSettings;
        } -> async {
            canister_id : Principal;
        };

        update_settings : shared ({
            canister_id : Principal;
            settings : CanisterSettings;
        }) -> async ();
        install_code : shared {
            arg : [Nat8];
            wasm_module : [Nat8];
            mode : { #install; #reinstall; #upgrade };
            canister_id : Principal;
        } -> async ();

        deposit_cycles : shared {
            canister_id : Principal;
        } -> async ();

        ecdsa_public_key : ({
            canister_id : ?Principal;
            derivation_path : [Blob];
            key_id : { curve : { #secp256k1 }; name : Text };
        }) -> async ({ public_key : Blob; chain_code : Blob });
        sign_with_ecdsa : ({
            message_hash : Blob;
            derivation_path : [Blob];
            key_id : { curve : { #secp256k1 }; name : Text };
        }) -> async ({ signature : Blob });
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
        date_created : TimeLib.Time;
        date_updated : TimeLib.Time;
    };

    public type WorkflowRunStatus = {
        #pending;
        #completed;
        #failed;
    };

    public type WorkflowRunDetails = {
        workflow_run_id : Nat;
        repo_name : Text;
        date_created : Nat;
        status : WorkflowRunStatus;
        branch : ?Text;
        commit_hash : ?Text;
        error_message : ?Text;
        size : ?Nat;
    };

    public type UserCanisters = HashMap.HashMap<Principal, [Principal]>;
    public type WorkflowRunHistory = HashMap.HashMap<Principal, [WorkflowRunDetails]>;

    public type AccountIdentifier = Blob;
    public type SubAccount = Blob;
    public type Memo = Nat64;
    public type TimeStamp = { timestamp_nanos : Nat64 };
    public type BlockIndex = Nat64;

    public type AccountBalanceArgs = {
        account : AccountIdentifier;
    };

    public type TransferArgs = {
        memo : Memo;
        amount : Tokens;
        fee : Tokens;
        from_subaccount : ?SubAccount;
        to : AccountIdentifier;
        created_at_time : ?TimeStamp;
    };
    public type TransferResult = {
        #Ok : BlockIndex;
        #Err : TransferError;
    };
    public type TransferError = {
        #BadFee : { expected_fee : Tokens };
        #InsufficientFunds : { balance : Tokens };
        #TxTooOld : { allowed_window_nanos : Nat64 };
        #TxCreatedInFuture : Null;
        #TxDuplicate : { duplicate_of : BlockIndex };
    };

    public type Ledger = actor {
        transfer : shared TransferArgs -> async (TransferResult);
        account_balance : AccountBalanceArgs -> async (Tokens);
    };

    public type Tier = {
        id : Nat;
        name : Text;
        slots : Nat;
        min_deposit : Tokens;
        price : Tokens;
        features : [Text];
    };

    public type Subscription = {
        user_id : Principal;
        tier_id : Nat;
        canisters : [Principal];
        used_slots : Nat;
        max_slots : Nat;
        date_created : TimeLib.Time;
        date_updated : TimeLib.Time;
    };

    public type SubscriptionsMap = HashMap.HashMap<Principal, Subscription>;
    public type TiersMap = HashMap.HashMap<Nat, Tier>;
    public type TiersList = [Tier];

    /** Access Control */
    public type Role = {
        #super_admin;
        #admin;
    };

    public type RoleMap = HashMap.HashMap<Principal, Role>;

    /** Return types */

    public type Result = {
        #ok : Text;
        #err : Text;
    };

    public type Response<T> = {
        #ok : T;
        #err : Text;
    };

    public type GetCyclesAvailableResult = {
        #ok : Float;
        #err : Text;
    };

    /** End of types */
};
