import HashMap "mo:base/HashMap";
import TimeLib "mo:base/Time";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Map "mo:core/Map";

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
    clear : shared () -> async ();
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

  public type ProjectPlan = {
    #freemium;
    #paid;
  };

  public type Project = {
    id : Nat;
    user : Principal;
    canister_id : ?Principal; // id of canister deployment
    name : Text;
    description : Text;
    tags : [Text];
    plan : ProjectPlan;
    date_created : TimeLib.Time;
    date_updated : TimeLib.Time;
  };
  public type GetProjectsByUserPayload = {
    user : Principal;
    limit : ?Nat;
    page : ?Nat;
  };
  public type CreateProjectPayload = {
    project_name : Text;
    project_description : Text;
    tags : [Text];
    plan : ProjectPlan;
  };

  public type CreateProjectResponse = {
    project_id : Nat;
    is_freemium : Bool;
  };

  public type StoreAssetInCanisterPayload = {
    project_id : Nat;
    files : [StaticFile];
    workflow_run_details : ?WorkflowRunDetails;
    current_batch : Nat;
    total_batch_count : Nat;
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
  public type WorkflowRunHistory = HashMap.HashMap<Nat, [WorkflowRunDetails]>;

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
    free_canisters : [Principal];
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

  /** Shareable Canister Types */

  public type SharedCanisterStatus = {
    #available;
    #occupied;
  };

  public type ShareableCanister = {
    id : Nat;
    project_id : ?Nat;
    canister_id : ?Principal;
    owner : Principal; // controller of the canister
    user : Principal; // current user of the canister
    start_timestamp : Nat; //time user occupied the canister
    create_timestamp : Nat; //time user occupied the canister
    duration : Nat; //total time allowed for a single user to occupy a canister
    start_cycles : Nat; // total cycles available at start_timestamp
    status : SharedCanisterStatus;
  };

  public type ShareableCanisterStatistics = {
    total_cycles_consumed : Nat; //total amount of cycles consumed since genesis of canister
    create_time : Nat; // time the canister was created
    usage_count : Nat; // total times the canister was occupied
  };

  public type UserShareSession = {
    slot_id : Nat; // slot id currently used by the user
    // usage_count : Nat; // amount of times the canister was occupied by the user since last used. Resets to 0 when (now - last_used > rate_limit_window)
    // last_used : Nat; //last time the canister was occupied by the user
    // rate_limit_window : Nat; //duration of a theoretical session. used to deny occupying a shared canister when (usage_count > max_uses_threshold)
    // max_uses_threshold : Nat; // maximum number of times the user is allowed to occupy the shared canister within the rate_limit_window
  };

  public type UsageLog = {
    is_active : Bool;
    usage_count : Nat; // amount of times the canister was occupied by the user since last used. Resets to 0 when (now - last_used > rate_limit_window)
    last_used : Nat; //last time the canister was occupied by the user
    rate_limit_window : Nat; //duration of a theoretical session. used to deny occupying a shared canister when (usage_count > max_uses_threshold)
    max_uses_threshold : Nat; // maximum number of times the user is allowed to occupy the shared canister within the rate_limit_window
    quota : Quota;
  };

  public type Quota = {
    consumed : Nat;
    total : Nat;
  };

  public type SlotToCanister = HashMap.HashMap<Nat, ShareableCanister>;
  public type UserToSlots = HashMap.HashMap<Principal, ?Nat>;
  public type UsedCanisters = HashMap.HashMap<Nat, Bool>;
  public type UsageLogs = HashMap.HashMap<Principal, UsageLog>;

  public type StableDataTypeShareableCanister = {
    #slot_to_canister;
    #user_to_slots;
    #used_canisters;
    #usage_logs;
  };

  public type ProjectId = Nat;
  public type ProjectActivity = HashMap.HashMap<ProjectId, [ActivityLog]>;
  public type ActivityLog = {
    id : Nat;
    category : Text;
    description : Text;
    create_time : Time;
  };

  public type TimeFormat = {
    #nanoseconds;
    #microseconds;
    #milliseconds;
    #seconds;
  };

  public type ResetSlotsResult = {
    slot_ids : [Nat];
    project_ids : [?Nat];
  };

  public type WorkflowRunHistoryMap = Map.Map<Nat, [WorkflowRunDetails]>;
  public type UserSubscriptionsMap = Map.Map<Principal, Subscription>;
  public type BookMap = Map.Map<Principal, Map.Map<Token, Nat>>;
  public type RoleMap = Map.Map<Principal, Role>;
  public type ProjectsMap = Map.Map<Nat, Project>;
  public type UserToProjectsMap = Map.Map<Principal, [Nat]>;
  public type CanisterDeploymentMap = Map.Map<Principal, CanisterDeployment>;
  public type SlotsMap = Map.Map<Nat, ShareableCanister>;
  public type UserToSlotMap = Map.Map<Principal, ?Nat>;
  public type UsedSlotsMap = Map.Map<Nat, Bool>;
  public type UsageLogsMap = Map.Map<Principal, UsageLog>;
  public type ProjectActivityLogsMap = Map.Map<ProjectId, [ActivityLog]>;
  public type UserCanistersMap = Map.Map<Principal, [Principal]>;
  public type TimersMap = Map.Map<Nat, Nat>;
  public type DeployedCanistersMap = Map.Map<Principal, Bool>;
  public type QuotasMap = Map.Map<Principal, Quota>;

  public type QuotaSchedulerSeconds = {
    seconds_until_next_midnight : Nat;
    seconds_since_midnight : Nat;
  };
  /** End of types */
};
