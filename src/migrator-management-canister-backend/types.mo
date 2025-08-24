import HashMap "mo:base/HashMap";
import TimeLib "mo:base/Time";
import Array "mo:base/Array";
import Blob "mo:base/Blob";
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

  public type AddOnService = {
    id : AddOnId;
    status : AddOnServiceStatus;
    type_ : AddOnServiceType;
    created_on : Nat;
    updated_on : Nat;
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
  public type CanisterToDomainRegistration = Map.Map<Principal, [DomainRegistration]>;
  public type SubscriptionServices = Map.Map<ProjectId, [AddOnService]>;

  // Request id received from calling registration endpoint
  public type DomainRegistrationId = Text;

  // Overview of a domain registration's records and status
  public type DomainRegistration = {
    txt_domain_record_id : Text;
    cname_challenge_record_id : Text;
    cname_domain_record_id : Text;
    ic_registration : IcDomainRegistration;
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
    txt_domain_record_id : Text;
    cname_challenge_record_id : Text;
    cname_domain_record_id : Text;
  };

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

  // public type DnsRecord = {
  //   id : Text;
  //   zone_id : Text;
  //   zone_name : Text;
  //   name : Text;
  //   dns_type : DnsRecordType;
  //   content : Text;
  //   ttl : Nat;
  //   proxied : Bool;
  //   created_on : Int;
  //   modified_on : Int;
  // };

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
  };

  // public type CloudflareRecordResponse = {
  //   ARecord : DnsRecord;
  //   AAAARecord : DnsRecord;
  //   CNAMERecord : DnsRecord;
  //   MXRecord : DnsRecord;
  //   NSRecord : DnsRecord;
  //   PTRRecord : DnsRecord;
  //   TXTRecord : DnsRecord;
  //   CAARecord : DnsRecord;

  // };

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

  // public type DnsRecordPayload = {
  //   name : Text;
  //   type_ : Text;
  //   comment : Text;
  //   content : Text;
  // };

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
    // txt_payload : DnsRecordPayload;
    // cname_challenge : DnsRecordPayload;
    // cname_domain : DnsRecordPayload;
    // txt_name : Text;
    domain_name : Text;
    subdomain_name : Text;
    user_principal : Principal;
    canister_id : Principal;

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

  public type CloudflareCredentials = {
    email : ?Text;
    api_key : ?Text;
  };
  public type Cloudflare = {
    list_dns_records : (zone_id : Text, transform : Transform) -> async Response<[DnsRecord]>;
    create_dns_record : (payload : CreateDnsRecordPayload, transform : Transform) -> async Response<DnsRecord>;
    // update_dns_record : (zone_id : Text, record_id : Text, record : DnsRecord) -> async Response<DnsRecord>;
    set_cloudflare_credentials : (email : Text, api_key : Text) -> Response<()>;
    get_cloudflare_credentials : () -> Response<CloudflareCredentials>;
    batch_create_records : (payload : CanisterRecordsPayload, transform : Transform) -> async Response<[CreateRecordResponse]>;
    // get_dns_record : (zone_id : Text, record_id : Text) -> async Response<DnsRecord>;
    // get_dns_zones : () -> async Response<[DnsZone]>;
    // delete_dns_record : (zone_id : Text, record_id : Text) -> async Response<Bool>;
  };

  public type ProjectInterface = {
    // Query Methods
    get_project_by_id : (project_id : Nat) -> Response<Project>;
    get_projects_by_user : (user : Principal, payload : GetProjectsByUserPayload) -> Response<[Project]>;
    get_all_projects_paginated : (payload : PaginationPayload) -> Response<[(ProjectId, Project)]>;
    is_freemium_session_active : (project_id : ProjectId) -> Response<Bool>;
    get_user_projects_batch_paginated : (payload : PaginationPayload) -> Response<[(Principal, [Project])]>;

    // Mutation Methods
    put_project : (project_id : Nat, payload : Project) -> ();
    create_project : (user : Principal, payload : CreateProjectPayload) -> Nat;
    drop_projects : () -> Bool;
    drop_project : (user : Principal, project_id : Nat) -> Response<Bool>;

    // Stable Management Methods
    get_stable_data_projects : () -> [(Nat, Project)];
    get_stable_data_user_to_projects : () -> [(Principal, [Nat])];
    get_stable_data_next_project_id : () -> Nat;
    get_next_project_id : () -> Nat;
    load_from_stable_projects : (stable_data : [(Nat, Project)]) -> ();
    load_from_stable_user_to_projects : (stable_data : [(Principal, [Nat])]) -> ();
    load_from_stable_next_project_id : (stable_data : Nat) -> ();
  };

  public type DomainInterface = {
    // Query Methods
    list_dns_records : (zone_id : Text, transform : Transform, cloudflare : Cloudflare) -> async Response<[DnsRecord]>;
    get_all_records : () -> [(DnsRecordId, CreateRecordResponse)];
    get_all_registrations : () -> [(DomainRegistrationId, DomainRegistration)];
    get_records_for_canister : (canister_id : Principal) -> Response<[CreateRecordResponse]>;
    get_domain_registrations : (canister_id : Principal) -> Response<[DomainRegistration]>;

    // Mutation Methods
    delete_records : () -> ();
    delete_canister_to_records_map : () -> ();
    create_dns_record : (payload : CreateDnsRecordPayload, transform : Transform, cloudflare : Cloudflare) -> async Response<DnsRecord>;
    create_dns_records_for_canister : (zone_id : Text, payload : CreateCanisterDNSRecordsPayload, transform : Transform, cloudflare : Cloudflare) -> async Response<DomainRegistration>;
    edit_ic_domains : (canister_id : Principal, new_ic_domains : StaticFile) -> async Response<()>;
    get_domain_registration_by_id : (id : Text, transform : Transform) -> async Response<Bool>;
    register_domain : (domain : Text, transform : Transform) -> async Response<Text>;
    initialize_domain_registration : (canister_id : Principal) -> DomainRegistration;
  };

  public type RegisterDomainSuccessResponse = {
    id : Text; // request id
  };

  public type DomainRegistrar = {
    request_id : Text;
    canister_id : Principal;
    domain : Text;
  }

  /** End of types */

};
