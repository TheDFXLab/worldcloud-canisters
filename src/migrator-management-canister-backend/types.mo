import HashMap "mo:base/HashMap";
import TimeLib "mo:base/Time";
import Blob "mo:base/Blob";
import Iter "mo:base/Iter";
import Map "mo:core/Map";
import IC "ic:aaaaa-aa";

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

  //   public type AssetCanisterAsset = {
  //   content : Blob;
  //   content_type : Text;
  //   content_encoding : Text;
  //   sha256 : ?Blob;
  //   total_length : Nat;
  // }

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

  public type HttpHeader = {
    name : Text;
    value : Text;
  };

  public type HttpRequestResult = {
    status : Nat;
    headers : [HttpHeader];
    body : Blob;
  };

  // type Transform = {
  //   function : shared query ({
  //     response : HttpRequestResult;
  //     context : Blob;
  //   }) -> async HttpRequestResult;
  //   context : Blob;
  // };

  // public type TransformationInput = {
  //   context : Blob;
  //   response : HttpRequestResult;
  // };

  // public type TransformationOutput = HttpRequestResult;

  public type HttpMethodArgs = {
    #get;
    #head;
    #post;
  };
  public type HttpRequestArgs = {
    url : Text;
    max_response_bytes : ?Nat64;
    method : HttpMethodArgs;
    headers : [HttpHeader];
    body : ?Blob;
    transform : ?Transform;
  };

  // public type IC = actor {
  //   http_request : shared (http_request_args : HttpRequestArgs) -> async HttpRequestResult;
  //   canister_status : shared { canister_id : Principal } -> async CanisterStatusResponse;
  //   create_canister : shared {
  //     settings : ?CanisterSettings;
  //   } -> async {
  //     canister_id : Principal;
  //   };

  //   update_settings : shared ({
  //     canister_id : Principal;
  //     settings : CanisterSettings;
  //   }) -> async ();
  //   install_code : shared {
  //     arg : [Nat8];
  //     wasm_module : [Nat8];
  //     mode : { #install; #reinstall; #upgrade };
  //     canister_id : Principal;
  //   } -> async ();

  //   deposit_cycles : shared {
  //     canister_id : Principal;
  //   } -> async ();

  //   ecdsa_public_key : ({
  //     canister_id : ?Principal;
  //     derivation_path : [Blob];
  //     key_id : { curve : { #secp256k1 }; name : Text };
  //   }) -> async ({ public_key : Blob; chain_code : Blob });
  //   sign_with_ecdsa : ({
  //     message_hash : Blob;
  //     derivation_path : [Blob];
  //     key_id : { curve : { #secp256k1 }; name : Text };
  //   }) -> async ({ signature : Blob });
  // };

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
    url : ?Text;
    date_created : TimeLib.Time;
    date_updated : TimeLib.Time;
  };
  public type GetProjectsByUserPayload = {
    user : Principal;
    limit : ?Nat;
    page : ?Nat;
  };

  public type PaginationPayload = {
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

  /** Add Ons */

  public type MyAddon<T> = {
    addon : AddOnService;
    resource : T;
  };

  public type MyAddonDomainRegistration = {
    addon : AddOnService;
    resource : DomainRegistration;
  };

  public type MyAddons = {
    domain_addons : [MyAddonDomainRegistration];
    /** Insert more addons here */
  };

  public type AddOnServiceType = {
    #register_subdomain; // Registers a subdomain on worldcloud.app
    #register_domain; // Registers a domain using custom name servers
  };

  public type AddOnServiceStatus = {
    #available;
    #frozen;
  };

  public type ExpiryDuration = {
    #none;
    #minute;
    #hour;
    #day;
    #month;
    #year;
  };

  public type ValidateSubscribeAddonResult = {
    expiry : Nat;
    add_on : AddOnVariant;
    project : Project;
    has_credits_result : EnoughCreditsResult;
    canister_id : Principal;
    now : Nat;
  };

  public type AddOnService = {
    id : AddOnId;
    attached_resource_id : ?Nat;
    variant_id : Nat;
    status : AddOnServiceStatus;
    initialized : Bool;
    type_ : AddOnServiceType;
    created_on : Nat;
    updated_on : Nat; // timestamp in ms
    expires_at : ?Nat;
  };

  public type AddOnVariant = {
    id : Nat;
    name : Text;
    type_ : AddOnServiceType;
    expiry_duration : Nat;
    expiry : ExpiryDuration;
    price : Nat;
    features : [Text];
    is_available : Bool;
  };

  public type HasAddonResult = {
    has_add_on : Bool;
    add_ons : [AddOnService];
  };

  public type EnoughCreditsResult = {
    status : Bool;
    need : Nat;
    available : Nat;
  };

  public type AddOnId = Nat;

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
    url : ?Text; // migration
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

  public type UsageLogExtended = {
    usage_log : UsageLog;
    reset_time_unix : Nat;
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

  public type QuotaSchedulerSeconds = {
    seconds_until_next_midnight : Nat;
    seconds_since_midnight : Nat;
  };

  public type WorkflowRunHistoryMap = Map.Map<Nat, [WorkflowRunDetails]>;
  public type UserSubscriptionsMap = Map.Map<Principal, Subscription>;
  public type BookMap = Map.Map<Principal, Map.Map<Token, Nat>>;
  public type RoleMap = Map.Map<Principal, Role>;
  public type ProjectsMap = Map.Map<Nat, Project>;
  public type UserToProjectsMap = Map.Map<Principal, [Nat]>;
  public type CanisterDeploymentMap = Map.Map<Principal, CanisterDeployment>;
  public type SlotsMap = Map.Map<Nat, ShareableCanister>;
  public type CanisterToSlot = Map.Map<Principal, Nat>; // canister to slot id
  public type UserToSlotMap = Map.Map<Principal, ?Nat>;
  public type UsedSlotsMap = Map.Map<Nat, Bool>;
  public type UsageLogsMap = Map.Map<Principal, UsageLog>;
  public type ProjectActivityLogsMap = Map.Map<ProjectId, [ActivityLog]>;
  public type UserCanistersMap = Map.Map<Principal, [Principal]>;
  public type TimersMap = Map.Map<Nat, Nat>;
  public type GlobalTimersMap = Map.Map<Text, Nat>;
  public type DeployedCanistersMap = Map.Map<Principal, Bool>;
  public type QuotasMap = Map.Map<Principal, Quota>;
  public type DnsRecordId = Text;
  public type CanisterToRecordMap = Map.Map<Principal, [DnsRecordId]>;
  public type CloudflareRecordsMap = Map.Map<DnsRecordId, CreateRecordResponse>;
  public type DomainRegistrationMap = Map.Map<DomainRegistrationId, DomainRegistration>;
  public type FreemiumDomainRegistrationMap = Map.Map<DomainRegistrationId, FreemiumDomainRegistration>;
  public type CanisterToDomainRegistration = Map.Map<Principal, [DomainRegistrationId]>;
  public type AddonsMap = Map.Map<AddOnId, AddOnService>;
  public type ProjectAddonsMap = Map.Map<ProjectId, [AddOnId]>;
  public type SubdomainsMap = Map.Map<Text, Principal>;
  public type DomainRegistrationTimers = Map.Map<Text, DomainRegistrationTimer>;
  public type CounterMap = Map.Map<CounterType, Nat>;
  public type SubdomainRecords = Map.Map<Text, DomainRegistrationRecords>;

  public type CounterType = {
    #addon_id;
    #project_id;
    #subscription_id;
    #domain_registration_id;
    #freemium_domain_registration_id;
  };

  public type DomainRegistrationRecords = {
    canister_id : Principal;
    txt_domain_record_id : Text;
    cname_challenge_record_id : Text;
    cname_domain_record_id : Text;
  };

  public type DomainRegistrationTimer = {
    timer_id : Nat;
    project_id : ?ProjectId;
    domain_registration_id : Nat;
    subdomain : Text;
    domain : Text;
    canister_id : Principal;
    created_at : Nat;
    max_retries : Nat;
    current_retries : Nat;
  };

  // Request id received from calling registration endpoint
  public type DomainRegistrationId = Nat;
  public type IcDomainRegistrationId = Text;

  public type DomainRegistrationRecordType = {
    #txt;
    #cname_domain;
    #cname_challenge;
  };

  public type FreemiumDomainRegistration = {
    id : Nat;
    canister_id : Principal;
    txt_domain_record_id : Text;
    cname_challenge_record_id : Text;
    cname_domain_record_id : Text;
    ic_registration : IcDomainRegistration;
    error : DomainRegistrationError;
  };

  // Overview of a domain registration's records and status
  public type DomainRegistration = {
    id : Nat;
    add_on_id : Nat;
    canister_id : Principal;
    txt_domain_record_id : Text;
    cname_challenge_record_id : Text;
    cname_domain_record_id : Text;
    ic_registration : IcDomainRegistration;
    error : DomainRegistrationError;
  };

  public type DomainRegistrationErrorKey = {
    #cloudflare_exists_dns_txt_challenge_record;
    #cloudflare_exists_dns_txt_record;
    #ic_missing_dns_cname_record;
    #ic_existing_dns_txt_challenge_record;
    #ic_missing_dns_txt_record;
    #ic_invalid_dns_txt_record;
    #ic_more_than_one_dns_txt_record;
    #ic_failed_to_retrieve_known_domains;
    #ic_domain_is_missing_from_list_known_domains;
    #ic_rate_limit_exceeded;
    #cloudflare_exist_records;

    #ic_registration_error;
    #none; // no error
  };

  public type DomainRecordPathType = {
    record_type : Text;
    path : Text;
  };

  public type DomainRegistrationError = Text;

  public type SetupDomainResult = {
    domain_registration : DomainRegistration;
    canister_id : Principal;
    addon : AddOnService;
  };

  public type DomainRegistrationResult = {
    domain_registration : DomainRegistration;
    canister_id : Principal;
    addon : AddOnService;
    resource_id : DomainRegistrationId;
  };

  public type SetupFreemiumDomainResult = {
    domain_registration : DomainRegistration;
    canister_id : Principal;
  };

  public type IcDomainRegistrationStatus = {
    #inactive;
    #pending;
    #failed;
    #complete;
  };

  public type IcDomainRegistration = {
    request_id : Text; // Request id from calling registration endpoint
    is_apex : Bool; // Needed for custom domains outside our DNS
    domain : Text; // Main domain, should be 'worldcloud.app' for inside canister registration
    subdomain : Text; // Unique subdomain linking canister application
    status : IcDomainRegistrationStatus; // Registration status
  };

  public type AddDnsRecordsForCanisterResponse = {
    updated_domain_registration : DomainRegistration;
    txt_domain_record_id : Text;
    cname_challenge_record_id : Text;
    cname_domain_record_id : Text;
  };

  public type AddDnsRecordsForFreemiumCanisterResponse = {
    updated_domain_registration : FreemiumDomainRegistration;
    txt_domain_record_id : Text;
    cname_challenge_record_id : Text;
    cname_domain_record_id : Text;
  };

  public type CandleData = {
    timestamp : Int;
    low : Float;
    high : Float;
    open : Float;
    close : Float;
    volume : Float;
  };

  public type TokenPrice = {
    value : Float;
    last_updated_seconds : Nat; // time in seconds
  };

  public type HttpResponse = {
    response : HttpRequestResult;
    body : Text;
  };

  public type TransformationInput = {
    context : Blob;
    response : IC.http_request_result;
  };

  public type TransformationOutput = IC.http_request_result;
  public type Transform = query TransformationInput -> async TransformationOutput;

  public type InitializedResponse = {
    is_init : Bool;
    is_run : Bool;
    is_run_recurring : Bool;
    secs_since_midnight : Nat;
    secs_till_midnight : Nat;
    next_secs_since_midnight : Nat;
    next_secs_till_midnight : Nat;
    next_trigger_at : Nat;
  };

  public type CloudflareConfig = {
    email : Text;
    api_key : Text;
    zone_id : Text;
  };
  public type CloudflareCredentials = {
    email : ?Text;
    api_key : ?Text;
  };

  public type CloudflareMatchOpts = {
    record_type : DomainRegistrationRecordType;
    name : CloudflareRecordSearchOpts;
    content : CloudflareRecordSearchOpts;
  };

  public type CloudflareRecordSearchOpts = {
    contains : Text;
    ends_with : Text;
    exact : Text;
    starts_with : Text;
  };

  public type GetAvailableSlotIdResponse = {
    id : Nat;
    is_new : Bool;
  };

  public type RequestFreemiumSessionResponse = {
    project : Project;
    is_new_slot : Bool;
    canister_id : Principal;
  };

  public type DeployAssetCanisterResponse = {
    is_new_slot : Bool;
    slot : ?ShareableCanister;
    project : Project;
    canister_id : Principal;

  };

  /**********************/
  /**********************/
  /**********************/
  /**********************/
  /**********************/
  /**********************/
  /**********************/
  /**********************/
  /** Class Interfaces **/
  /**********************/
  /**********************/
  /**********************/
  /**********************/
  /**********************/
  /**********************/
  /**********************/

  public type Cloudflare = {
    get_zone_id : () -> Text;
    list_dns_records : (zone_id : Text, transform : Transform) -> async Response<[DnsRecord]>;
    create_dns_record : (payload : CreateDnsRecordPayload, transform : Transform) -> async Response<DnsRecord>;
    // update_dns_record : (zone_id : Text, record_id : Text, record : DnsRecord) -> async Response<DnsRecord>;
    set_cloudflare_credentials : (email : Text, api_key : Text) -> Response<()>;
    get_cloudflare_credentials : () -> Response<CloudflareCredentials>;
    batch_create_records : (payload : CanisterRecordsPayload, transform : Transform) -> async Response<[CreateRecordResponse]>;
    get_subdomain_records_all : () -> [(Text, DomainRegistrationRecords)];
    get_subdomain_records_by_name : (subdomain_name : Text) -> Response<DomainRegistrationRecords>;
    set_subdomain_records : (subdomain_name : Text, txt_id : Text, cname_challenge_id : Text, cname_domain_id : Text, canister_id : Principal) -> ();
    delete_subdomain_records : (subdomain_name : Text) -> ();
    find_dns_record_ids : (subdomain_name : Text, domain_name : Text, canister_id : Principal, transform : Transform) -> async Response<DomainRegistrationRecords>;
    // get_dns_record : (zone_id : Text, record_id : Text) -> async Response<DnsRecord>;
    // get_dns_zones : () -> async Response<[DnsZone]>;
    // delete_dns_record : (zone_id : Text, record_id : Text) -> async Response<Bool>;
  };

  // public type Cloudflare = {
  //   var CLOUDFLARE_API_BASE_URL : Text;
  //   var CLOUDFLARE_API_KEY : ?Text;
  //   var CLOUDFLARE_EMAIL : ?Text;
  //   var CLOUDFLARE_ZONE_ID : ?Text;
  //   batch_create_records : (payload : CanisterRecordsPayload, transform : Transform) -> async Response<[CreateRecordResponse]>;
  //   create_dns_record : (payload : CreateDnsRecordPayload, transform : Transform) -> async Response<DnsRecord>;
  //   get_cloudflare_credentials : () -> Response<{ api_key : ?Text; email : ?Text }>;
  //   list_dns_records : (zone_id : Text, transform : Transform) -> async Response<[DnsRecord]>;
  //   set_cloudflare_credentials : (email : Text, api_key : Text) -> Response<()>;
  //   set_zone_id : (new_zone_id : Text) -> ();
  // };

  public type ProjectInterface = {
    init : (class_reference : ClassesInterface) -> ();

    // Query Methods
    get_project_by_id : (project_id : Nat) -> Response<Project>;
    get_projects_by_user : (user : Principal, payload : GetProjectsByUserPayload) -> Response<[Project]>;
    get_all_projects_paginated : (payload : PaginationPayload) -> Response<[(ProjectId, Project)]>;
    is_freemium_session_active : (project_id : ProjectId) -> Response<Bool>;
    get_user_projects_batch_paginated : (payload : PaginationPayload) -> Response<[(Principal, [Project])]>;

    // Mutation Methods
    put_project : (project_id : Nat, payload : Project) -> ();
    create_project : (user : Principal, payload : CreateProjectPayload) -> async Response<CreateProjectResponse>;
    drop_projects : () -> Bool;
    // drop_project : (user : Principal, project_id : Nat) -> Response<Bool>;
    delete_project : (project_id : ProjectId, caller : Principal, actor_principal : Principal) -> async Response<Bool>;

    get_next_project_id : () -> Nat;
    validate_project_access : (user : Principal, project_id : Nat) -> Response<Bool>;
    set_project_url : (project_id : ProjectId, url : Text) -> Response<Project>;
    clear_project_session : (project_id : ?ProjectId) -> Response<Bool>;
    upload_assets_to_project : (caller : Principal, payload : StoreAssetInCanisterPayload) -> async Response<Bool>;
    clear_project_assets : (caller : Principal, project_id : ProjectId) -> async Response<()>;
    deploy_asset_canister : (project_id : ProjectId, backend_principal : Principal) -> async Response<DeployAssetCanisterResponse>;
  };

  public type DomainInterface = {
    init : (class_reference : ClassesInterface) -> ();

    // Query Methods
    list_dns_records : (zone_id : Text, transform : Transform) -> async Response<[DnsRecord]>;
    get_all_records : () -> [(DnsRecordId, CreateRecordResponse)];
    get_all_registrations : () -> [(DomainRegistrationId, DomainRegistration)];
    get_records_for_canister : (canister_id : Principal) -> Response<[CreateRecordResponse]>;
    get_domain_registrations_by_canister : (canister_id : Principal) -> Response<[DomainRegistration]>;
    get_domain_registration_ids_by_canister : (canister_id : Principal) -> [DomainRegistrationId];
    get_domain_registration_by_id : (id : DomainRegistrationId) -> ?DomainRegistration;
    is_available_subdomain : (project_id : ProjectId, subdomain_name : Text, addon_id : AddOnId) -> Response<Bool>;

    // Mutation Methods
    delete_records : () -> ();
    delete_canister_to_records_map : () -> ();
    create_dns_record : (payload : CreateDnsRecordPayload, transform : Transform) -> async Response<DnsRecord>;
    create_dns_records_for_canister : (
      associated_add_on_id : AddOnId,
      project_id : ProjectId,
      payload : CreateCanisterDNSRecordsPayload,
      transform : Transform,
      existing_registration : DomainRegistration,
    ) -> async Response<DomainRegistration>;
    edit_ic_domains : (canister_id : Principal, new_ic_domains : StaticFile) -> async Response<()>;
    get_ic_domain_registration_request_id : (id : Text, transform : Transform) -> async Response<Bool>;
    register_domain_ic : (canister_id : Principal, domain : Text, transform : Transform) -> async Response<Text>;
    initialize_domain_registration : (canister_id : Principal, associated_addon_id : Nat) -> Response<DomainRegistration>;
    setup_custom_domain_by_project : (
      project_id : ProjectId,
      subdomain_name : Text,
      add_on_id : AddOnId,
      transform : Transform,
    ) -> async Response<SetupDomainResult>;

    _setup_custom_domain_for_canister : (
      project_id : ProjectId,
      canister_id : Principal,
      subdomain_name : Text,
      add_on : AddOnService,
      transform : Transform,
    ) -> async Response<SetupDomainResult>;

    update_registration_status : (registration_id : Nat, new_status : IcDomainRegistrationStatus, error : DomainRegistrationError) -> Response<DomainRegistration>;
    delete_domain_registration : (project_id : ProjectId, addon_id : AddOnId) -> Response<Bool>;
  };

  public type SubscriptionInterface = {
    init : (class_reference : ClassesInterface) -> ();

    // Treasury management
    set_treasury : (new_treasury : Principal) -> ();
    get_treasury : () -> ?Principal;

    // Tier management
    get_tier_id_freemium : () -> Response<Nat>;

    // Subscription queries
    get_all_subscriptions : () -> [(Principal, Subscription)];
    get_subscription : (caller : Principal) -> Response<Subscription>;

    // Add-on management
    get_add_ons_by_project : (project_id : Nat) -> [AddOnService];
    get_add_on_by_id : (project_id : ProjectId, add_on_id : AddOnId) -> Response<AddOnService>;
    find_add_on_variant : (add_on_id : AddOnId) -> ?AddOnVariant;
    find_add_on_by_id : (project_id : ProjectId, id : AddOnId) -> ?AddOnService;
    has_add_on : (project_id : ProjectId, add_on_id : AddOnId) -> HasAddonResult;

    // Subscription operations
    subscribe_add_on : (
      caller : Principal,
      project_id : ProjectId,
      add_on_id : AddOnId,
    ) -> Response<[AddOnService]>;

    update_add_on : (project_id : ProjectId, updated_addon : AddOnService) -> Response<[AddOnService]>;
    create_subscription : (caller : Principal, tier_id : Nat) -> async Response<Subscription>;

    // Slot management
    validate_increment_slots_by_user : (user : Principal) -> Bool;
    push_canister_id : (caller : Principal, canister_id : Principal) -> async Response<Bool>;
    update_sub_delete_project : (caller : Principal, canister_id : Principal) -> async Response<()>;
    update_addon_resource_id : (addon_id : AddOnId, new_resource_id : DomainRegistrationId) -> Response<()>;

    // Validation
    validate_subscription : (caller : Principal) -> async Bool;

    grant_subscription : (user_principal : Principal, tier_id : Nat) -> async Response<Subscription>;
    grant_addon : (project_id : ProjectId, addon_id : AddOnId, expiry_in_ms : Nat) -> async Response<[AddOnService]>;
  };

  public type IndexCounterInterface = {
    get_index : (index_type : CounterType) -> Nat;
    increment_index : (index_type : CounterType) -> ();
    reset_index : (index_type : CounterType) -> ();
  };

  public type WorkflowInterface = {
    // Query methods
    get_workflow_history : (project_id : Nat) -> [WorkflowRunDetails];
    get_workflow_history_all : (payload : PaginationPayload) -> Response<[(Nat, [WorkflowRunDetails])]>;

    // Update methods
    update_workflow_run : (project_id : Nat, workflow_run_details : WorkflowRunDetails) -> async Result;

    // Delete methods
    delete_run_history_all : () -> ();
    delete_run_history : (project_id : ProjectId) -> ();
  };

  public type CanisterInterface = {
    // Initialization
    init : (
      class_reference_init : ClassesInterface
    ) -> ();

    set_asset_canister_wasm : (wasm : [Nat8]) -> ();
    get_asset_list : (canister_id : Principal) -> async Response<ListResponse>;

    // Canister deployment management
    put_canister_table : (canister_id : Principal, payload : CanisterDeployment) -> ();
    get_deployment_by_canister : (canister_id : Principal) -> ?CanisterDeployment;
    add_canister_deployment : (caller : Principal, canister_id : Principal, is_freemium : Bool) -> async ();
    update_deployment_size : (canister_id : Principal, new_file_size : Nat) -> ();
    update_deployment_status : (canister_id : Principal, status : CanisterDeploymentStatus) -> ();

    // Query methods
    get_canister_principals_all : (payload : PaginationPayload) -> Response<[Principal]>;
    get_canister_deployments_all : (payload : PaginationPayload) -> Response<[(Principal, CanisterDeployment)]>;
    get_canister_deployments : (project_id : ProjectId) -> Response<?CanisterDeployment>;
    get_canister_status : (project_id : ProjectId) -> async Response<IC.canister_status_result>;

    // File upload and batch management
    handle_upload_file : (canister_id : Principal, files : [StaticFile], workflow_run_details : ?WorkflowRunDetails) -> async Response<Bool>;
    handle_chunked_file : (file : StaticFile, asset_canister : AssetCanister, batch_id : Nat, canister_id : Principal) -> async ();
    get_chunk_ids_for_canister : (canister_id : Principal, batch_id : Nat) -> [Nat];
    get_batch_id : (canister_id : Principal, file_batch_id : Nat) -> (Bool, Nat);
    set_batch_map : (canister_id : Principal, file_batch_id : Nat, batch_id : Nat) -> ();
    clear_batch_map : (canister_id : Principal) -> ();

    // Cycles management
    validate_canister_cycles : (canister_id : Principal) -> async Response<Nat>;
    get_cycles_to_add : (amount_in_e8s : ?Int, caller_principal : Principal, transform : Transform) -> async Response<Nat>;
    add_cycles : (project_id : ProjectId, amount_in_e8s : Nat, caller : Principal, transform : Transform) -> async Response<Nat>;
    deploy_asset_canister : (user : Principal, is_freemium : Bool, default_controller : Principal) -> async Response<Principal>;
    calculate_cycles_to_add : (amount : Int, transform : Transform) -> async Response<Nat>;
    add_controller : (canister_id : Principal, new_controller : Principal) -> async Result;
    storeInAssetCanister : (caller : Principal, project_id : Nat, files : [StaticFile], workflow_run_details : ?WorkflowRunDetails) -> async Response<Bool>;
    is_controller : (canister_id : Principal, caller : Principal) -> async Bool;
    get_canister_id_by_project : (project_id : Nat) -> Response<Principal>;
    clear_asset_canister : (canister_id : Principal) -> async Response<()>;
    get_canister_asset : (canister_id : Principal, asset_key : Text) -> async Response<?AssetCanisterAsset>;
    remove_controller : (canister_id : Principal, to_remove : Principal) -> async Result;
    get_controllers : (canister_id : Principal) -> async Response<[Principal]>;
  };

  public type ShareableCanisterInterface = {
    // Initialization
    init : (classes_reference_init : ClassesInterface) -> ();

    // Slot management
    reset_slots : (actor_principal : Principal) -> ResetSlotsResult;
    get_slot_by_canister : (canister_id : Principal) -> Response<ShareableCanister>;
    get_canister_by_slot : (slot_id : Nat) -> Response<ShareableCanister>;
    get_slot_id_by_user : (user : Principal) -> Response<?Nat>;
    get_canister_by_user : (user : Principal) -> Response<?ShareableCanister>;
    get_next_slot_id : () -> Nat;
    get_slots : (limit : ?Nat, index : ?Nat) -> [ShareableCanister];
    get_used_slot_ids : () -> [Nat];
    get_available_slots : () -> [Nat];

    // Session management
    request_freemium_session : (project_id : Nat, caller : Principal, default_controller : Principal) -> async Response<RequestFreemiumSessionResponse>;
    request_session : (user : Principal, project_id : Nat) -> async Response<?ShareableCanister>;
    terminate_session : (slot_id : Nat, end_cycles : Nat, actor_principal : Principal) -> Response<?Nat>;
    end_freemium_session : (slot_id : Nat, slot_user : Principal, actor_principal : Principal) -> Response<?Nat>;
    cleanup_session : (slot_id : Nat, canister_id : ?Principal, backend_principal : Principal) -> async Response<()>;
    is_expired_session : (slot_id : Nat) -> Response<Bool>;
    is_active_session : (user : Principal) -> Response<Bool>;

    // Quota and usage management
    get_quota : (user : Principal) -> Quota;
    get_usage_log : (user : Principal) -> UsageLog;
    get_usage_logs_paginated : (payload : PaginationPayload) -> Response<[(Principal, UsageLog)]>;
    reset_quotas : () -> ();
    admin_clear_usage_logs : () -> ();

    // Slot operations
    create_slot : (owner : Principal, user : Principal, canister_id : Principal, project_id : ?Nat, start_cycles : Nat) -> Response<Nat>;
    create_canister_to_slot : (canister_id : Principal, slot_id : Nat) -> ();
    update_slot : (slot_id : Nat, updated_slot : ShareableCanister) -> Response<ShareableCanister>;
    set_canister_url : (slot_id : Nat, url : Text) -> Response<ShareableCanister>;
    set_all_slot_duration : (new_duration_ms : Nat) -> Response<()>;

    // Utility methods
    get_used_slots : () -> [(Nat, Bool)];

    // Stable management
    get_stable_data_slots : () -> [(Nat, ShareableCanister)];
    get_stable_data_user_to_slot : () -> [(Principal, ?Nat)];
    get_stable_data_used_slots : () -> [(Nat, Bool)];
    get_stable_data_usage_logs : () -> [(Principal, UsageLog)];
    get_stable_data_next_slot_id : () -> Nat;
    load_from_stable_slots : (stable_data : [(Nat, ShareableCanister)]) -> ();
    load_from_stable_user_to_slot : (stable_data : [(Principal, ?Nat)]) -> ();
    load_from_stable_used_slots : (stable_data : [(Nat, Bool)]) -> ();
    load_from_stable_usage_logs : (stable_data : [(Principal, UsageLog)]) -> ();
    load_from_stable_next_slot_id : (stable_data : Nat) -> ();
  };

  public type BookInterface = {
    // init: (class_reference: ClassesInterface) -> ();
    // Basic operations
    get : (user : Principal) -> ?Map.Map<Token, Nat>;
    put : (user : Principal, userBalances : Map.Map<Token, Nat>) -> ();
    entries : () -> Iter.Iter<(Principal, Map.Map<Token, Nat>)>;
    size : () -> Nat;

    // Query methods
    get_all_entries : () -> Response<[(Principal, Map.Map<Token, Nat>)]>;
    get_all_entries_paginated : (payload : PaginationPayload) -> Response<[(Principal, Map.Map<Token, Nat>)]>;

    // Token management
    addTokens : (user : Principal, token : Token, amount : Nat) -> ();
    removeTokens : (user : Principal, token : Token, amount : Nat) -> ?Nat;
    process_payment : (from : Principal, to : Principal, token : Token, amount : Nat) -> Bool;
    hasEnoughBalance : (user : Principal, token : Principal, amount : Nat) -> Bool;
    fetchUserIcpBalance : (user : Principal, token : Principal) -> Nat;
    getUsersCumulativeBalance : (canisterPrincipal : Principal, token : Token) -> Nat;

    // Utility methods
    clear : () -> ();
    toStable : () -> [(Principal, [(Token, Nat)])];
    fromStable : (stable_data : [(Principal, [(Token, Nat)])]) -> ();
  };

  public type ClassesInterface = {
    var project_manager : ?ProjectInterface;
    var subscription_manager : ?SubscriptionInterface;
    var cloudflare_manager : ?Cloudflare;
    var index_counter_manager : ?IndexCounterInterface;
    var shareable_canister_manager : ?ShareableCanisterInterface;
    var book_manager : ?BookInterface;
    var domain_manager : ?DomainInterface;
    var canister_manager : ?CanisterInterface;
    var price_feed_manager : ?PriceFeedInterface;
    var access_control_manager : ?AccessControlInterface;
    var workflow_manager : ?WorkflowInterface;
    var activity_manager : ?ActivityInterface;
    var timers_manager : ?TimersInterface;
    var initialized : Bool;

    init : (
      project_manager_init : ProjectInterface,
      subscription_manager_init : SubscriptionInterface,
      cloudflare_manager_init : Cloudflare,
      index_counter_init : IndexCounterInterface,
      shareable_canister_init : ShareableCanisterInterface,
      book_init : BookInterface,
      domain_manager_init : DomainInterface,
      canister_manager_init : CanisterInterface,
      price_feed_manager_init : PriceFeedInterface,
      access_control_init : AccessControlInterface,
      workflow_manager_init : WorkflowInterface,
      activity_manager_init : ActivityInterface,
      timers_manager_init : TimersInterface,
    ) -> ();

  };

  public type PriceFeedInterface = {
    // icp_last_price : TokenPrice;
    // is_updating_icp_price : Bool;
    get_icp_price : (transform : Transform) -> async Response<Float>;
    update_icp_price : (transform : Transform) -> async Response<TokenPrice>;
  };

  public type AccessControlInterface = {
    // Query methods
    get_role_users : (payload : PaginationPayload) -> Response<[(Principal, Role)]>;
    check_role : (principal : Principal) -> Response<Role>;

    // Authorization methods
    assert_super_admin : (caller : Principal) -> Bool;
    assert_admin : (caller : Principal) -> Bool;
    is_authorized : (principal : Principal) -> Bool;

    // CRUD operations
    add_role : (principal : Principal, role : Role, caller : Principal) -> Response<Text>;
    remove_role : (principal : Principal, caller : Principal) -> Response<Text>;
  };

  public type ActivityInterface = {
    // Query methods
    get_project_activity : (project_id : ProjectId) -> Response<[ActivityLog]>;
    get_project_activity_all : (payload : PaginationPayload) -> Response<[(ProjectId, [ActivityLog])]>;

    // Create methods
    create_project_activity : (project_id : ProjectId) -> Response<Bool>;
    update_project_activity : (project_id : ProjectId, category : Text, description : Text) -> Response<Bool>;

    // Delete methods
    clear_all_logs : () -> ();
    clear_project_activity_logs : (project_id : ProjectId) -> Response<Bool>;
    delete_project_activity_log : (project_id : ProjectId, log_id : Nat) -> Response<Bool>;

    // Stable management
    get_stable_data_project_activity : () -> [(ProjectId, [ActivityLog])];
    load_from_stable_project_activity : (stable_data : [(ProjectId, [ActivityLog])]) -> ();
  };

  public type TimersInterface = {
    // Domain registration timer methods
    get_domain_registration_timer_by_subdomain : (subdomain : Text) -> ?DomainRegistrationTimer;
    set_timer_domain_registration : (subdomain : Text, data : DomainRegistrationTimer) -> ();

    // Text-based timer methods
    get_timer_by_text : (key : Text) -> ?Nat;
    set_timer_by_text : (key : Text, id : Nat) -> ();

    // Number-based timer methods
    get_timer_by_number : (key : Nat) -> ?Nat;
    set_timer_by_number : (key : Nat, id : Nat) -> ();

    // Delete methods
    delete_timer_by_number : (key : Nat) -> ();
    delete_timer_by_text : (key : Text) -> ();
    delete_domain_registration_timer : (subdomain : Text) -> ();

  };

  public type ClassType = {
    #project;
    #subscription;
    #domain;
    #cloudflare;
  };

  public type Class<T> = {
    manager : T;
  };

  public type RegisterDomainSuccessResponse = {
    id : Text; // request id
  };

  public type DomainRegistrar = {
    request_id : Text;
    canister_id : Principal;
    domain : Text;
  };

  /***************/
  /***************/
  /***************/
  /***************/
  /***************/
  /***************/
  /***************/
  /***************/
  /** Cloudflare **/
  /***************/
  /***************/
  /***************/
  /***************/
  /***************/
  /***************/
  /***************/
  // DNS Record Types
  public type DnsRecordType = {
    #A;
    #AAAA;
    #CNAME;
    #MX;
    #TXT;
    #SRV;
    #CAA;
    #NS;
    #PTR;
  };

  public type DnsRecord = {
    name : Text;
    ttl : Nat;
    type_ : Text;
    comment : ?Text;
    content : ?Text;
    proxied : ?Bool;
    settings : ?{
      ipv4_only : ?Bool;
      ipv6_only : ?Bool;
    };
    tags : ?[Text];
    id : Text;
  };

  public type DnsZone = {
    id : Text;
    name : Text;
    status : Text;
    paused : Bool;
    dns_type : Text;
    development_mode : Nat;
    name_servers : [Text];
    original_name_servers : [Text];
    original_registrar : ?Text;
    original_dnshost : ?Text;
    created_on : Text;
    modified_on : Text;
    activated_on : Text;
    owner : {
      id : ?Text;
      email : ?Text;
      owner_type : Text;
    };
    account : {
      id : Text;
      name : Text;
    };
    permissions : [Text];
    plan : {
      id : Text;
      name : Text;
      price : Nat;
      currency : Text;
      frequency : ?Text;
      is_subscribed : Bool;
      can_subscribe : Bool;
      legacy_id : Text;
      legacy_discount : Bool;
      externally_managed : Bool;
    };
  };

  public type CloudflareRecord = {
    id : Text;
    name : Text;
    type_ : Text;
    content : Text;
    proxiable : Bool;
    proxied : Bool;
    ttl : Nat;
    settings : { flatten_cname : Bool };
    meta : {};
    comment : ?Text;
    tags : [Text];
    created_on : Text;
    modified_on : Text;
  };

  public type CloudflarePaginationInfo = {
    page : Nat;
    per_page : Nat;
    count : Nat;
    total_count : Nat;
    total_pages : Nat;
  };

  public type CreateDnsRecordPayload = {
    zone_id : Text;
    name : Text;
    ttl : Nat;
    type_ : Text;
    comment : ?Text;
    content : ?Text;
  };
  public type DnsRecordPayload = {
    name : Text;
    type_ : Text;
    comment : ?Text; // Make optional
    content : ?Text; // Make optional for CNAME records
    target : ?Text; // Add target for CNAME records
    ttl : ?Nat; // Make TTL optional
    proxied : ?Bool; // Make proxied optional
  };

  public type TXTDnsRecordPayload = {
    name : Text;
    type_ : Text;
    comment : Text;
    content : Text;
  };

  public type CNAMEDnsRecordPayload = {
    name : Text;
    type_ : Text;
    target : Text;
    proxied : Bool;
  };

  public type CreateCanisterDNSRecordsPayload = {
    domain_name : Text;
    subdomain_name : Text;
    user_principal : Principal;
    canister_id : Principal;

  };

  public type BuildDomainRegistrationRequest = {
    create_record_response : [CreateRecordResponse];
    txt_payload : DnsRecordPayload;
    cname_challenge_payload : DnsRecordPayload;
    cname_domain_payload : DnsRecordPayload;

  };

  public type CreateRecordResponse = {
    id : Text;
    name : Text;
    type_ : Text;
    content : Text;
    created_on : Text;
    modified_on : Text;
    ttl : Nat;
    proxied : Bool;
    proxiable : Bool;
  };

  public type CanisterRecordsPayload = {
    zone_id : Text;
    txt_payload : DnsRecordPayload;
    cname_challenge : DnsRecordPayload;
    cname_domain : DnsRecordPayload;
  };

  public type CloudflareListDNSRecordsResponse = {
    result : [CloudflareRecord];
    success : Bool;
    errors : [Text];
    messages : [Text];
    result_info : CloudflarePaginationInfo;
  };

  /** End of types */

  type SearchRecordsRawPayload = {
    #Object : {
      content : CloudflareRecordSearchOpts;
      name : CloudflareRecordSearchOpts;
    };
  };

};
