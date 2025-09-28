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
import Errors "modules/errors";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Types "types";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Principal "mo:base/Principal";
import Bool "mo:base/Bool";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Timer "mo:base/Timer";
import Char "mo:base/Char";
import Account "Account";
import Book "./book";
import SubscriptionManager "./modules/subscription";
import AccessControl "./modules/access";
import Hex "./utils/Hex";
import SHA256 "./utils/SHA256";
import CanisterShareable "modules/canister_shareable";
import Utility "utils/Utility";
import ProjectManager "modules/projects";
import Canisters "modules/canisters";
import WorkflowManager "modules/workflow";
import ActivityManager "modules/activity";
import Map "mo:core/Map";
import { migration } "modules/migration";
import Access "modules/access";
import JSON "mo:json.mo/JSON";
import Parsing "utils/Parsing";
import Nat8 "mo:base/Nat8";
import Outcall "modules/outcall";
import Domain "modules/domain";
import Cloudflare "modules/cloudflare";
import Counter "modules/counter";
import IC "ic:aaaaa-aa";
import Classes "modules/classes";
import PriceFeed "modules/pricefeed";
import TimersManager "modules/timers";

// (with migration)

shared (deployMsg) persistent actor class CanisterManager() = this {
  transient let IC_MANAGEMENT_CANISTER = "aaaaa-aa"; // Production
  transient let ledger : Principal = Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
  transient let BASE_CANISTER_START_CYCLES = 230_949_972_000;

  transient let XDR_PRICE : Float = 1.3;
  transient let E8S_PER_ICP : Nat = 100_000_000;
  transient let CYCLES_PER_XDR : Float = 1_000_000_000_000;
  transient let REFRESH_PRICE_INTERVAL_SECONDS = 3600;

  transient let icp_fee : Nat = 10_000;
  transient let Ledger : Types.Ledger = actor (Principal.toText(ledger));

  /** Canister & Asset stables - DANGLING */
  private stable var stable_canister_files : [(Principal, [Types.StaticFile])] = [];
  private stable var stable_assets_array : [Types.Asset] = [];
  private stable var stable_chunks_array : [Types.AssetChunk] = [];
  private stable var stable_pending_cycles : [(Principal, Nat)] = []; // unused

  /** Timer Stables*/
  private stable var stable_timers : [(Nat, Nat)] = []; // unused

  /** Stable Memory **/
  private stable var asset_canister_wasm : ?[Nat8] = null; // Store the WASM bytes in stable memory
  private stable var stable_projects : Types.ProjectsMap = Map.empty<Nat, Types.Project>();
  private stable var stable_user_to_projects : Types.UserToProjectsMap = Map.empty<Principal, [Nat]>();
  private stable var stable_next_project_id : Nat = 0;
  private stable var stable_slots : Types.SlotsMap = Map.empty<Nat, Types.ShareableCanister>();
  private stable var stable_user_to_slot : Types.UserToSlotMap = Map.empty<Principal, ?Nat>();
  private stable var stable_used_slots : Types.UsedSlotsMap = Map.empty<Nat, Bool>();
  private stable var stable_usage_logs : Types.UsageLogsMap = Map.empty<Principal, Types.UsageLog>();
  private stable var stable_next_canister_id : Nat = 0; // unused
  private stable var stable_next_slot_id : Nat = 0;
  private stable var stable_canister_table : Types.CanisterDeploymentMap = Map.empty<Principal, Types.CanisterDeployment>();
  private stable var stable_project_activity_logs : Types.ProjectActivityLogsMap = Map.empty<Types.ProjectId, [Types.ActivityLog]>();
  private stable var _subscriptions = Map.empty<Principal, Types.Subscription>();
  private stable var stable_role_map : Types.RoleMap = Map.empty<Principal, Types.Role>();
  private stable var stable_book : Types.BookMap = Map.empty<Principal, Map.Map<Types.Token, Nat>>();
  private stable var stable_subscriptions : Types.UserSubscriptionsMap = Map.empty<Principal, Types.Subscription>(); // unused
  private stable var stable_workflow_run_history : Types.WorkflowRunHistoryMap = Map.empty<Nat, [Types.WorkflowRunDetails]>();
  private stable var stable_user_canisters : Types.UserCanistersMap = Map.empty<Principal, [Principal]>();
  private stable var stable_slot_id_active_timer : [Nat] = [];
  private stable var timers : Types.TimersMap = Map.empty<Nat, Nat>();
  private stable var global_timers : Types.GlobalTimersMap = Map.empty<Text, Nat>();
  private stable var domain_registration_timers : Types.DomainRegistrationTimers = Map.empty<Text, Types.DomainRegistrationTimer>();
  private stable var active_global_timers : [Text] = [];

  private stable var stable_deployed_canisters : Types.DeployedCanistersMap = Map.empty<Principal, Bool>();
  private stable var stable_quotas : Types.QuotasMap = Map.empty<Principal, Types.Quota>();
  private stable var stable_system_timers : Types.TimersMap = Map.empty<Nat, Nat>();
  private stable var stable_quota_timer_id : Nat = 0;
  private stable var TREASURY_ACCOUNT : ?Principal = ?deployMsg.caller;
  private stable var canister_to_records_map : Types.CanisterToRecordMap = Map.empty<Principal, [Types.DnsRecordId]>();
  private stable var cloudflare_records_map : Types.CloudflareRecordsMap = Map.empty<Types.DnsRecordId, Types.CreateRecordResponse>();
  private stable var domain_registration : Types.DomainRegistrationMap = Map.empty<Types.DomainRegistrationId, Types.DomainRegistration>();
  private stable var freemium_domain_registration : Types.FreemiumDomainRegistrationMap = Map.empty<Types.DomainRegistrationId, Types.FreemiumDomainRegistration>();
  private stable var canister_to_domain_registration : Types.CanisterToDomainRegistration = Map.empty<Principal, [Types.DomainRegistrationId]>();
  private stable var canister_to_freemium_domain_registration : Types.CanisterToDomainRegistration = Map.empty<Principal, [Types.DomainRegistrationId]>();
  private stable var canister_to_slot : Types.CanisterToSlot = Map.empty<Principal, Nat>();
  private stable var index_counter_map : Types.CounterMap = Map.empty<Types.CounterType, Nat>();

  // private transient var project_addons_map : Types.ProjectAddonsMap = Map.empty<Types.ProjectId, [Types.AddOnId]>();
  // private transient var addons_map : Types.AddonsMap = Map.empty<Nat, Types.AddOnService>();
  // private transient var subdomains_map : Types.SubdomainsMap = Map.empty<Text, Principal>();

  private stable var project_addons_map : Types.ProjectAddonsMap = Map.empty<Types.ProjectId, [Types.AddOnId]>();
  private stable var addons_map : Types.AddonsMap = Map.empty<Nat, Types.AddOnService>();
  private stable var subdomains_map : Types.SubdomainsMap = Map.empty<Text, Principal>();
  private stable var subdomain_records : Types.SubdomainRecords = Map.empty<Text, Types.DomainRegistrationRecords>();

  private transient var QUOTA_CLEAR_DURATION_SECONDS : Nat = 24 * 60 * 60;
  private transient var QUOTA_CLEAR_DURATION_SECONDS_DEV : Nat = 3 * 60;

  // private transient var icp_last_price : Types.TokenPrice = {
  //   value = 0.0;
  //   last_updated_seconds = 0;
  // };

  // Cloudflare API Configuration
  private stable var CLOUDFLARE_API_BASE_URL : Text = "https://api.cloudflare.com/client/v4";
  private stable var CLOUDFLARE_EMAIL : ?Text = null;
  private stable var CLOUDFLARE_API_KEY : ?Text = null;
  private stable var CLOUDFLARE_ZONE_ID : ?Text = null;

  /** Classes Instances */
  private transient let index_counter = Counter.IndexCounter(index_counter_map);
  private transient var book : Book.Book = Book.Book(stable_book);
  private transient let project_manager = ProjectManager.ProjectManager(stable_projects, stable_user_to_projects, index_counter);
  private transient let access_control = AccessControl.AccessControl(deployMsg.caller, stable_role_map);
  private transient let signatures = HashMap.HashMap<Principal, Blob>(0, Principal.equal, Principal.hash);
  private transient let shareable_canister_manager = CanisterShareable.ShareableCanisterManager(stable_slots, canister_to_slot, stable_user_to_slot, stable_used_slots, stable_usage_logs, stable_next_slot_id, stable_quotas);
  private transient let workflow_manager = WorkflowManager.WorkflowManager(stable_workflow_run_history);
  private transient let activity_manager = ActivityManager.ActivityManager(stable_project_activity_logs);
  private transient let domain = Domain.Domain(cloudflare_records_map, canister_to_records_map, canister_to_domain_registration, domain_registration, subdomains_map, freemium_domain_registration, canister_to_freemium_domain_registration);
  // TODO: create init method for each class and pass reference of other classes after creation
  private transient let subscription_manager = SubscriptionManager.SubscriptionManager(book, ledger, _subscriptions, TREASURY_ACCOUNT, project_addons_map, addons_map);
  private transient let canisters = Canisters.Canisters(stable_canister_table, stable_user_canisters, stable_deployed_canisters, asset_canister_wasm);
  private transient let cloudflare = Cloudflare.Cloudflare(CLOUDFLARE_API_BASE_URL, CLOUDFLARE_EMAIL, CLOUDFLARE_API_KEY, CLOUDFLARE_ZONE_ID, subdomain_records);
  private transient let classes = Classes.ClassesManager();
  private transient let price_feed = PriceFeed.PriceFeed();
  private transient let timers_manager = TimersManager.TimerManager(timers, global_timers, domain_registration_timers);

  /** Transient Storage */
  private transient var chunks = HashMap.HashMap<Text, Blob>(0, Text.equal, Text.hash);
  private transient var pending_cycles : HashMap.HashMap<Principal, Nat> = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
  private transient var assets = HashMap.HashMap<Types.AssetId, Types.Asset>(0, Text.equal, Text.hash); //Store asset metadata
  // private transient var is_updating_icp_price = false;

  /** Initialization*/
  private func init<system>() {
    init_quota_timer<system>();
  };

  private func initialize_class_references() : () {
    classes.init(
      project_manager,
      subscription_manager,
      cloudflare,
      index_counter,
      shareable_canister_manager,
      book,
      domain,
      canisters,
      price_feed,
      access_control,
      workflow_manager,
      activity_manager,
      timers_manager,
    );

    project_manager.init(classes);
    domain.init(classes);
    subscription_manager.init(classes);
    canisters.init(classes);
    shareable_canister_manager.init(classes);

  };

  private func init_quota_timer<system>() {
    let clear_duration = QUOTA_CLEAR_DURATION_SECONDS;
    // let clear_duration = QUOTA_CLEAR_DURATION_SECONDS;
    let id : Nat = Map.size(stable_system_timers);
    let schedule : Types.QuotaSchedulerSeconds = Utility.get_quota_scheduler_seconds(clear_duration);
    let now : Nat = Int.abs(Utility.get_time_now(#seconds));
    // Set the next quota reset utc time
    shareable_canister_manager.next_quota_reset_s := now + schedule.seconds_until_next_midnight;

    // Set initial timer to run at next midnight
    let initial_timer_id = Timer.setTimer<system>(
      #seconds(schedule.seconds_until_next_midnight),
      func() : async () {
        // Reset quotas
        shareable_canister_manager.reset_quotas();
        shareable_canister_manager.next_quota_reset_s := Int.abs(Utility.get_time_now(#seconds)) + clear_duration;

        // Set up recurring timer for every 24 hours after this
        let recurring_timer_id = Timer.recurringTimer<system>(
          #seconds(clear_duration), // 24 hours in seconds
          func() : async () {
            let target_time = Int.abs(Utility.get_time_now(#seconds)) + clear_duration;
            shareable_canister_manager.reset_quotas();

            shareable_canister_manager.next_quota_reset_s := target_time;
          },
        );

        // Store the recurring timer ID
        Map.add(stable_system_timers, Nat.compare, id, recurring_timer_id);
      },
    );

    // Store the initial timer ID
    Map.add(stable_system_timers, Nat.compare, id, initial_timer_id);
    stable_quota_timer_id := id; // Track the key id for the timer
  };

  // init();
  /*
   *
   * END CLASSES AND VARIABLES
   *
   */

  /*
   *
   * START SLOTS METHODS (Shareable canisters)
   *
   */
  public shared query func get_next_quota_reset_utc() : async Nat {
    return shareable_canister_manager.next_quota_reset_s;
  };

  public shared query func get_next_project_id() : async Nat {
    return stable_next_project_id;
  };
  /// TODO: Implement paging for large project count
  /// Gets user's projects list
  public shared query (msg) func get_projects_by_user(payload : Types.GetProjectsByUserPayload) : async Types.Response<[Types.Project]> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());
    return project_manager.get_projects_by_user(msg.caller, payload);
  };

  public shared query (msg) func get_add_ons_list() : async [Types.AddOnVariant] {
    if (classes.initialized != true) initialize_class_references();
    return subscription_manager.addons_list;
  };

  /// Retrieve purchased add-ons for a project
  public shared query (msg) func get_add_ons_by_project(project_id : Types.ProjectId) : async Types.Response<[Types.AddOnService]> {
    if (classes.initialized != true) initialize_class_references();
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };
    return #ok(subscription_manager.get_add_ons_by_project(project_id));
  };

  /// Check if project has the specified add on activated
  public shared query (msg) func has_add_on_by_project(project_id : Types.ProjectId, add_on_id : Types.AddOnId) : async Types.Response<Bool> {
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let result : Types.HasAddonResult = subscription_manager.has_add_on(project_id, add_on_id);
    return #ok(result.has_add_on);
  };

  public shared (msg) func subscribe_add_on(project_id : Types.ProjectId, add_on_id : Types.AddOnId) : async Types.Response<[Types.AddOnService]> {
    if (classes.initialized != true) initialize_class_references();
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return subscription_manager.subscribe_add_on(msg.caller, project_id, add_on_id);
  };

  public shared query (msg) func get_user_usage() : async Types.Response<Types.UsageLogExtended> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());
    let usage_log : Types.UsageLog = shareable_canister_manager.get_usage_log(msg.caller);

    return #ok({
      usage_log = usage_log;
      reset_time_unix = shareable_canister_manager.next_quota_reset_s;
    });
  };

  /** Shareable Canisters */
  // TAG: Admin
  public shared query (msg) func get_slots(limit : ?Nat, index : ?Nat) : async Types.Response<[Types.ShareableCanister]> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    #ok(shareable_canister_manager.get_slots(limit, index));
  };

  /// TAG: Admin
  public shared query (msg) func get_available_slots(limit : ?Nat, index : ?Nat) : async Types.Response<[Nat]> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    #ok(shareable_canister_manager.get_available_slots());
  };

  /// Returns the slot details used by the caller
  public shared query (msg) func get_user_slot() : async Types.Response<?Types.ShareableCanister> {
    if (Utility.is_anonymous(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return shareable_canister_manager.get_canister_by_user(msg.caller);
  };

  /// TAG: Admin
  public shared query (msg) func get_used_slots() : async [(Nat, Bool)] {
    if (not access_control.is_authorized(msg.caller)) return [];
    return shareable_canister_manager.get_used_slots();
  };

  /// TAG: Admin
  public shared query (msg) func get_slot_by_id(slot_id : Nat) : async Types.Response<Types.ShareableCanister> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    return shareable_canister_manager.get_canister_by_slot(slot_id);
  };

  /*
   *
   * END SLOT METHODS
   *
   */

  /*
   *
   * START ADMIN METHODS
   *
   */
  private func get_treasury_account() : Types.Response<Types.AccountIdentifier> {
    let treasury_principal = switch (TREASURY_ACCOUNT) {
      case (null) { return #err(Errors.TreasuryNotSet()) };
      case (?val) { val };
    };
    // Calculate treasury subaccount
    let treasury_account = Account.accountIdentifier(Principal.fromActor(this), Account.principalToSubaccount(treasury_principal));
    return #ok(treasury_account);
  };

  public shared query (msg) func is_admin() : async Types.Response<Bool> {
    return #ok(access_control.is_authorized(msg.caller));
  };

  public shared (msg) func admin_reset_quotas() : async Types.Response<()> {
    if (domain.initialized != true) initialize_class_references();

    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    shareable_canister_manager.reset_quotas();
    return #ok();
  };

  public shared (msg) func admin_grant_subscription(user_principal : Principal, subscription_tier_id : Nat) : async Types.Response<Types.Subscription> {
    if (domain.initialized != true) initialize_class_references();

    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return await subscription_manager.grant_subscription(user_principal, subscription_tier_id);
  };

  public shared (msg) func admin_set_canister_to_slot(canister_id : Principal, slot_id : Nat) : async Types.Response<()> {
    if (domain.initialized != true) initialize_class_references();

    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return #ok(shareable_canister_manager.create_canister_to_slot(canister_id, slot_id));
  };

  public shared (msg) func admin_grant_addon(project_id : Types.ProjectId, addon_id : Types.AddOnId, expiry_in_ms : Nat) : async Types.Response<[Types.AddOnService]> {
    if (domain.initialized != true) initialize_class_references();

    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return await subscription_manager.grant_addon(project_id, addon_id, expiry_in_ms);
  };

  public shared (msg) func admin_delete_domain_registration(registration_id : Types.DomainRegistrationId, type_ : Types.ProjectPlan) : async Types.Response<()> {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return domain.admin_delete_domain_registration(registration_id, type_);
  };

  public shared query (msg) func admin_get_freemium_domain_registrations(canister_id : Principal) : async Types.Response<[Types.FreemiumDomainRegistration]> {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return domain.get_freemium_domain_registration_by_canister(canister_id);
  };

  public shared query (msg) func admin_get_freemium_domain_registrations_paginated(limit : ?Nat, page : ?Nat) : async Types.Response<[(Types.DomainRegistrationId, Types.FreemiumDomainRegistration)]> {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let payload : Types.PaginationPayload = {
      limit = limit;
      page = page;
    };
    return #ok(domain.get_freemium_domain_registrations_paginated(payload));
  };

  public shared query (msg) func admin_get_domain_registrations_paginated(limit : ?Nat, page : ?Nat) : async Types.Response<[(Types.DomainRegistrationId, Types.DomainRegistration)]> {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let payload : Types.PaginationPayload = {
      limit = limit;
      page = page;
    };
    return #ok(domain.get_domain_registrations_paginated(payload));
  };

  public shared (msg) func admin_get_domain_registration_id_by_domain(domain_name : Text, canister_id : Principal) : async Types.Response<Types.IcDomainRegistrationId> {
    if (domain.initialized != true) initialize_class_references();

    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let id = switch (await domain.register_domain_ic(canister_id, domain_name, transform)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };
    return #ok(id);
  };

  public shared (msg) func admin_cancel_domain_registration_timer(subdomain_name : Text) : async Types.Response<Bool> {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    let key : Text = subdomain_name;
    let timer_id : Nat = switch (Map.get(domain_registration_timers, Text.compare, key)) {
      case (null) return #err(Errors.NotFound("global timer id for key " # key));
      case (?val) val.timer_id;
    };

    Timer.cancelTimer(timer_id);
    ignore Map.delete(domain_registration_timers, Text.compare, key);
    return #ok(true);
  };

  public shared query (msg) func admin_get_domain_registrations() : async Types.Response<[(Types.DomainRegistrationId, Types.DomainRegistration)]> {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return #ok(domain.get_all_registrations());
  };

  public shared query (msg) func admin_get_dns_records() : async Types.Response<[(Types.DnsRecordId, Types.CreateRecordResponse)]> {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return #ok(domain.get_all_records());
  };

  public shared query (msg) func admin_get_canister_domain_registrations(canister_id : Principal) : async Types.Response<[Types.DomainRegistration]> {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return domain.get_domain_registrations_by_canister(canister_id);
  };

  public shared query (msg) func admin_get_global_timers() : async [(Text, Nat)] {
    if (not access_control.is_authorized(msg.caller)) {
      return [];
    };
    return Iter.toArray(Map.entries(global_timers));
  };

  public shared query (msg) func admin_get_domain_registration_timers() : async [(Text, Types.DomainRegistrationTimer)] {
    if (domain.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return [];
    };
    return Iter.toArray(Map.entries(domain_registration_timers));
  };

  public shared (msg) func admin_setup_freemium_subdomain(canister_id : Principal, subdomain_name : Text) : async Types.Response<Types.FreemiumDomainRegistration> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    // Get freemium slot
    let slot : Types.ShareableCanister = switch (shareable_canister_manager.get_slot_by_canister(canister_id)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    // Get canister id associated with slot
    let slot_canister_id : Principal = switch (slot.canister_id) {
      case (null) return #err(Errors.NotFoundCanister());
      case (?val) val;
    };

    // Prevent cross canister usage
    if (slot_canister_id != canister_id) return #err(Errors.NotMatch("Canister id"));

    // create ic file

    let ic_domains_file : Types.StaticFile = {
      path = "/.well-known/ic-domains";
      content = Text.encodeUtf8(subdomain_name # "." # "worldcloud.app");
      content_type = "application/octet-stream";
      content_encoding = null;
      is_chunked = false;
      chunk_id = 0;
      batch_id = 0;
      is_last_chunk = true;
    };

    // Create the `ic-domains` file in `.well-known` directory
    let create_ic_domains = switch (await domain.edit_ic_domains(canister_id, ic_domains_file)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    // Setup domain for freemium canister
    let registration : Types.FreemiumDomainRegistration = switch (await domain.setup_freemium_canister_subdomain(canister_id, "worldcloud.app", subdomain_name, Principal.fromActor(this), transform)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    // Schedule ic registration
    schedule_register_domain(null, canister_id, "worldcloud.app", subdomain_name, domain.cooldown_ic_registration, registration.id);

    return #ok(registration);
  };

  public shared (msg) func admin_setup_custom_domain(project_id : Types.ProjectId, canister_id : Principal, subdomain_name : Text, add_on_id : Types.AddOnId) : async Types.Response<Types.DomainRegistration> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    // Get target addon
    let add_on : Types.AddOnService = switch (subscription_manager.get_add_on_by_id(project_id, add_on_id)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    let res : Types.SetupDomainResult = switch (await domain._setup_custom_domain_for_canister(project_id, canister_id, subdomain_name, add_on, transform)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    return #ok(res.domain_registration);
  };

  public shared query (msg) func admin_get_treasury_principal() : async Types.Response<Principal> {
    let principal : Principal = switch (TREASURY_ACCOUNT) {
      case (null) { return #err(Errors.TreasuryNotSet()) };
      case (?val) { val };
    };
    return #ok(principal);
  };

  public shared (msg) func admin_set_treasury(principal : Principal) : async Types.Response<()> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    subscription_manager.set_treasury(principal);
    TREASURY_ACCOUNT := ?principal;
    return #ok();
  };

  public shared (msg) func admin_get_treasury_balance() : async Types.Response<Nat> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let treasury_account : Types.AccountIdentifier = switch (get_treasury_account()) {
      case (#err(err)) { return #err(err) };
      case (#ok(val)) { val };
    };

    // Check ledger for treasury balance
    let balance = await Ledger.account_balance({
      account = treasury_account;
    });
    return #ok(Nat64.toNat(balance.e8s));
  };

  public shared query (msg) func admin_get_activity_logs_all(payload : Types.PaginationPayload) : async Types.Response<[(Types.ProjectId, [Types.ActivityLog])]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return activity_manager.get_project_activity_all(payload);
  };

  public shared query (msg) func admin_get_workflow_run_history_all(payload : Types.PaginationPayload) : async Types.Response<[(Nat, [Types.WorkflowRunDetails])]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return workflow_manager.get_workflow_history_all(payload);
  };

  public shared query (msg) func admin_get_usage_logs_all(payload : Types.PaginationPayload) : async Types.Response<[(Principal, Types.UsageLog)]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return shareable_canister_manager.get_usage_logs_paginated(payload);
  };

  public shared query (msg) func admin_get_user_slot_id(user : Principal) : async Types.Response<?Types.ShareableCanister> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return shareable_canister_manager.get_canister_by_user(user);
  };

  public shared query (msg) func admin_get_user_projects_all(payload : Types.PaginationPayload) : async Types.Response<[(Principal, [Types.Project])]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return project_manager.get_user_projects_batch_paginated(payload);
  };

  public shared query (msg) func admin_get_user_projects(user : Principal, payload : Types.PaginationPayload) : async Types.Response<[Types.Project]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let payload_with_user = {
      user = user;
      limit = payload.limit;
      page = payload.page;
    };
    return project_manager.get_projects_by_user(user, payload_with_user);
  };

  public shared query (msg) func admin_get_admins(payload : Types.PaginationPayload) : async Types.Response<[(Principal, Types.Role)]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return access_control.get_role_users(payload);
  };

  public shared query (msg) func admin_get_projects_all(payload : Types.PaginationPayload) : async Types.Response<[(Types.ProjectId, Types.Project)]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return project_manager.get_all_projects_paginated(payload);
  };

  public shared query (msg) func admin_get_canister_deployments_all(payload : Types.PaginationPayload) : async Types.Response<[(Principal, Types.CanisterDeployment)]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return canisters.get_canister_deployments_all(payload);
  };

  public shared query (msg) func admin_get_book_entries_all(payload : Types.PaginationPayload) : async Types.Response<[(Principal, [(Types.Token, Nat)])]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let book_entries = book.get_all_entries_paginated(payload);
    switch (book_entries) {
      case (#err(err)) { return #err(err) };
      case (#ok(entries)) {
        // Convert Map to stable array format
        let stable_entries = Array.map<(Principal, Map.Map<Types.Token, Nat>), (Principal, [(Types.Token, Nat)])>(
          entries,
          func(entry) {
            let (principal, balances_map) = entry;
            let balances_array = Iter.toArray(Map.entries(balances_map));
            (principal, balances_array);
          },
        );
        return #ok(stable_entries);
      };
    };
  };

  public shared (msg) func admin_set_all_slot_duration(new_duration_ms : Nat) : async Types.Response<()> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    return shareable_canister_manager.set_all_slot_duration(new_duration_ms);
  };

  /// TAG: Admin
  public shared (msg) func admin_delete_usage_logs() : async () {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) return;
    shareable_canister_manager.admin_clear_usage_logs();
    // stable_usage_logs := shareable_canister_manager.usage_logs; // Update stable storage
    return;
  };

  /// TAG: Admin
  public shared (msg) func update_slot(slot_id : Nat, updated_slot : Types.ShareableCanister) : async Types.Response<Types.ShareableCanister> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    let response = shareable_canister_manager.update_slot(slot_id, updated_slot);
    return response;
  };

  /// TAG: Admin
  public shared (msg) func delete_projects() : async Bool {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) return false;

    let is_dropped = project_manager.drop_projects();
    if (not is_dropped) return false;

    return true;
  };

  /// TAG: Admin
  public shared (msg) func delete_workflow_run_history() : async () {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) return;
    let response = workflow_manager.delete_run_history_all();
    return response;
  };

  /// Deletes a project's workflow run history
  public shared (msg) func delete_workflow_run_history_by_user(project_id : Types.ProjectId) : async Types.Response<()> {
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let response = workflow_manager.delete_run_history(project_id);
    return #ok(response);

  };

  public shared (msg) func delete_project(project_id : Nat) : async Types.Response<Bool> {
    if (classes.initialized != true) initialize_class_references();
    // Ensure access to project owner only
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return await project_manager.delete_project(project_id : Types.ProjectId, msg.caller, Principal.fromActor(this));
  };

  /// TAG: Admin
  public shared (msg) func reset_project_slot(project_id : Nat) : async Types.Response<Bool> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    return project_manager.clear_project_session(?project_id);
  };

  /// TAG: Admin
  public shared (msg) func reset_slots() : async Types.Response<()> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    let res : Types.ResetSlotsResult = shareable_canister_manager.reset_slots(Principal.fromActor(this));

    for (id in res.project_ids.vals()) {
      let _res = switch (project_manager.clear_project_session(id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(cleared)) {
          cleared;
        };
      };
    };

    for (id in res.slot_ids.vals()) {
      timers_manager.delete_timer_by_number(id);
    };

    return #ok();
  };

  /// TAG: Admin
  public shared (msg) func purge_expired_sessions() : async Types.Response<()> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    return shareable_canister_manager.purge_expired_sessions(Principal.fromActor(this));
  };

  /*
   *
   * END ADMIN METHODS
   *
   */

  /*
   *
   * START ACTIVITY METHODS
   *
   */

  /// TAG: Admin
  public shared (msg) func delete_all_logs() {
    if (not access_control.is_authorized(msg.caller)) return;
    let response = activity_manager.clear_all_logs();
    stable_project_activity_logs := activity_manager.project_activity;
    return response;
  };

  /*
   *
   * END ACTIVITY METHODS
   *
   */

  /*
   *
   * START PROJECT CREATION METHODS
   *
   */

  // Step 1, create project and get project id
  // Creates a new project (freemium and)
  // TODO: Add validation for subscriptoin for paid projects
  public shared (msg) func create_project(payload : Types.CreateProjectPayload) : async Types.Response<Types.CreateProjectResponse> {
    if (classes.initialized != true) initialize_class_references();
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    return await project_manager.create_project(msg.caller, payload);
  };

  // Step 2 (freemium projects) -> request a session
  // Step 2 (paid projects) -> deploy a canister
  // Create a canister for freemium
  public shared (msg) func deployAssetCanister(project_id : Nat) : async Types.Result {
    if (classes.initialized != true) initialize_class_references();
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    // Ensure caller is owner of project
    let is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let result : Types.DeployAssetCanisterResponse = switch (await project_manager.deploy_asset_canister(project_id, Principal.fromActor(this))) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    // Set up clean up timer for freemium canisters
    if (result.project.plan == #freemium) {
      switch (result.slot) {
        case (null) return #err(Errors.UnexpectedError("setting cleanup timer"));
        case (?val) {
          _set_cleanup_timer(val.duration / 1_000, val.id, ?result.canister_id);
        };
      };
    };
    return #ok(Principal.toText(result.canister_id));
  };

  // Step 3: Upload assets to project's canister
  // Upload files to project's asset canister
  public shared (msg) func upload_assets_to_project(
    payload : Types.StoreAssetInCanisterPayload
  ) : async Types.Response<Bool> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    // Ensure caller is owner of project
    let is_authorized = switch (project_manager.validate_project_access(msg.caller, payload.project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return await project_manager.upload_assets_to_project(msg.caller, payload);
  };

  public shared (msg) func clear_project_assets(project_id : Types.ProjectId) : async Types.Response<()> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    // Ensure caller is owner of project
    let is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    if (not is_authorized) return #err(Errors.Unauthorized());
    return await project_manager.clear_project_assets(msg.caller, project_id);
  };

  /*
   * END PROJECT CREATION METHODS
   *
   */

  /*
   * START FREEMIUM METHODS
   *
   */

  public shared (msg) func end_freemium_session(slot_id : Nat) : async Types.Response<?Nat> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    let response = shareable_canister_manager.end_freemium_session(slot_id, msg.caller, Principal.fromActor(this));

    timers_manager.delete_timer_by_number(slot_id); // Clear the timer and pop from stable array of timer ids
    response;
  };

  /*
   *
   * END FREEMIUM METHODS
   *
   */

  /*
   *
   * START ACTIVITY LOG METHODS
   *
   */

  public shared query (msg) func get_project_activity_logs(project_id : Types.ProjectId) : async Types.Response<[Types.ActivityLog]> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    let is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return activity_manager.get_project_activity(project_id);
  };

  /*
   *
   * START WORKFLOW METHODS
   *
   */

  public shared query (msg) func getWorkflowRunHistory(project_id : Nat) : async Types.Response<[Types.WorkflowRunDetails]> {
    let is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return #ok(workflow_manager.get_workflow_history(project_id));
  };

  /*
   *
   * END WORKFLOW METHODS
   *
   */

  /*
   *
   * START CANISTER METHODS
   *
   */

  public shared (msg) func getCanisterStatus(project_id : Nat) : async Types.Response<IC.canister_status_result> {
    let is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(res)) { res };
    };

    return await canisters.get_canister_status(project_id);

  };

  /*
   *
   * END CANISTER METHODS
   *
   */

  /*
   *
   * START ECDSA METHODS
   *
   */
  // TODO: Change response type to use Types.Response
  public shared (msg) func public_key() : async {
    #Ok : { public_key_hex : Text };
    #Err : Text;
  } {
    if (Utility.is_anonymous(msg.caller)) return #Err(Errors.Unauthorized());
    let caller = Principal.toBlob(msg.caller);
    try {

      let { public_key } = await IC.ecdsa_public_key({
        canister_id = null;
        derivation_path = [caller];
        key_id = { curve = #secp256k1; name = "key_1" };
      });
      #Ok({ public_key_hex = Hex.encode(Blob.toArray(public_key)) });
    } catch (err) {
      #Err(Error.message(err));
    };
  };

  public shared (msg) func sign(message : Text) : async {
    #Ok : { signature_hex : Text };
    #Err : Text;
  } {
    if (Utility.is_anonymous(msg.caller)) return #Err(Errors.Unauthorized());
    let caller = Principal.toBlob(msg.caller);
    try {
      // Include caller in the message
      let message_hash : Blob = Blob.fromArray(SHA256.sha256(Blob.toArray(Text.encodeUtf8(message))));
      ExperimentalCycles.add(30_000_000_000);
      let { signature } = await IC.sign_with_ecdsa({
        message_hash;
        derivation_path = [caller];
        key_id = { curve = #secp256k1; name = "key_1" };
      });

      #Ok({ signature_hex = Hex.encode(Blob.toArray(signature)) });
    } catch (err) {
      #Err(Error.message(err));
    };
  };

  /*
   * END ECDSA METHODS
   *
   */

  /*
   * START ACCESS CONTROL METHODS
   *
   */
  /** Access Control */
  /// TAG: Admin
  public shared (msg) func grant_role(principal : Principal, role : Types.Role) : async Types.Response<Text> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    let response = access_control.add_role(principal, role, msg.caller);
    return response;
  };

  /// TAG: Admin
  public shared (msg) func revoke_role(principal : Principal) : async Types.Response<Text> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    let response = access_control.remove_role(principal, msg.caller);
    return response;
  };

  /// TAG: Admin
  public shared query (msg) func check_role(principal : Principal) : async Types.Response<Types.Role> {
    // if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    return access_control.check_role(principal);
  };

  /*
   * END ACCESS CONTROL METHODS
   *
   */

  /*
   * START ACCESS CONTROL METHODS
   *
   */

  /*
   * END SHAREABLE CANISTERS METHODS
   *
   */

  /*
   * START SUBSCRIPTION METHODS
   *
   */

  /** Subscription */
  // Create a subscription for the caller
  public shared (msg) func create_subscription(tier_id : Nat) : async Types.Response<Types.Subscription> {
    if (classes.initialized != true) initialize_class_references();
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());
    return await subscription_manager.create_subscription(msg.caller, tier_id);
  };

  public shared query func get_tiers() : async [Types.Tier] {
    if (classes.initialized != true) initialize_class_references();
    return subscription_manager.tiers_list;
  };

  // Get the caller's subscription
  public shared query (msg) func get_subscription() : async Types.Response<Types.Subscription> {
    if (classes.initialized != true) initialize_class_references();
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    let sub = subscription_manager.get_subscription(msg.caller);
    return sub;
  };

  /*
   * END SUBSCRIPTION METHODS
   *
   */

  /*
   * START ASSET CANISTER METHODS
   *
   */

  /** Asset Canister */
  // Function to upload the asset canister WASM
  public shared (msg) func uploadAssetCanisterWasm(wasm : [Nat8]) : async Types.Result {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());

    canisters.set_asset_canister_wasm(wasm);
    asset_canister_wasm := ?wasm;
    return #ok("Asset canister WASM uploaded successfully");
  };

  // TODO: Implement paging for data retrieval
  // Helper function to get all deployed asset canisters
  public shared query (msg) func getDeployedCanisters() : async Types.Response<[Principal]> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    // return #ok(Iter.toArray(stable_deployed_canisters.keys()));
    return #ok(Iter.toArray(Map.keys(stable_deployed_canisters)));
  };

  public shared query func getWasmModule() : async [Nat8] {
    let wasm_module = switch (asset_canister_wasm) {
      case null { [] };
      case (?wasm) { wasm };
    };
    return wasm_module;
  };

  /// TAG: Admin
  public shared (msg) func getAssetList(canister_id : Principal) : async Types.Response<Types.ListResponse> {
    if (not (await canisters.is_controller(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());

    return await canisters.get_asset_list(canister_id);
  };

  public shared (msg) func getCanisterAsset(canister_id : Principal, asset_key : Text) : async Types.Response<?Types.AssetCanisterAsset> {
    if (not (await canisters.is_controller(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());

    return await canisters.get_canister_asset(canister_id, asset_key);
  };

  /*
   * END ASSET CANISTERS METHODS
   *
   */

  /*
   * START DEPOSIT METHODS
   *
   */
  /// TODO: Use Types.Response return type
  public shared query func get_deposit_account_id(canisterPrincipal : Principal, caller : Principal) : async Blob {
    let accountIdentifier = Account.accountIdentifier(canisterPrincipal, Account.principalToSubaccount(caller));
    return accountIdentifier;
  };

  /// TAG: Admin
  public shared query (msg) func get_all_subscriptions() : async Types.Response<[(Principal, Types.Subscription)]> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return #ok(subscription_manager.get_all_subscriptions());
  };

  // Get pending deposits for the caller
  public shared (msg) func getMyPendingDeposits() : async Types.Tokens {
    if (Utility.is_anonymous(msg.caller)) return { e8s = 0 };
    return await getPendingDeposits(msg.caller);
  };

  // Get pending deposits for the specified caller
  private func getPendingDeposits(caller : Principal) : async Types.Tokens {
    // Calculate target subaccount
    let source_account = Account.accountIdentifier(Principal.fromActor(this), Account.principalToSubaccount(caller));

    // Check ledger for value
    let balance = await Ledger.account_balance({
      account = source_account;
    });

    return balance;
  };

  // Returns the caller's available credits in book
  public shared query (msg) func getMyCredits() : async Nat {
    return book.fetchUserIcpBalance(msg.caller, ledger);
  };

  /*
   * END DEPOSIT METHODS
   *
   */

  /*
   * START DEPLOYMENT METHODS
   *
   */

  public shared query (msg) func getCanisterDeployments(project_id : Nat) : async Types.Response<?Types.CanisterDeployment> {
    let is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };
    return canisters.get_canister_deployments(project_id);
  };

  public shared (msg) func getControllers(canister_id : Principal) : async Types.Response<[Principal]> {
    // Only owner or admins
    if (not (await canisters.is_controller(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return await canisters.get_controllers(canister_id);
  };

  /**********
  * Write Methods
  **********/

  // After user transfers ICP to the target subaccount
  public shared (msg) func depositIcp() : async Types.Response<Nat> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    // Get amount of ICP in the caller's subaccount
    let balance = await getPendingDeposits(msg.caller);

    // Transfer to default subaccount of this canister
    let result = await deposit(msg.caller, Nat64.toNat(balance.e8s));
    switch result {
      case (#ok(available)) {
        return #ok(available);
      };
      case (#err(err)) {
        return #err(err);
      };
    };
  };

  public shared (msg) func admin_withdraw_treasury() : async Types.Response<Nat> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    let balance_e8s : Nat = switch (await admin_get_treasury_balance()) {
      case (#err(err)) { return #err(err) };
      case (#ok(val)) { val };
    };

    let treasury_principal : Principal = switch (TREASURY_ACCOUNT) {
      case (null) { return #err(Errors.TreasuryNotSet()) };
      case (?val) { val };
    };

    let treasury_account : Types.AccountIdentifier = switch (get_treasury_account()) {
      case (#err(err)) { return #err(err) };
      case (#ok(val)) { val };
    };

    // Transfer from treasury subaccount to default subaccount of this canister
    let icp_receipt = if ((balance_e8s) > icp_fee) {
      await Ledger.transfer({
        memo : Nat64 = 0;
        from_subaccount = ?Account.principalToSubaccount(treasury_principal);
        to = Account.accountIdentifier(treasury_principal, Account.defaultSubaccount());
        amount = { e8s = Nat64.fromNat(balance_e8s - icp_fee) };
        fee = { e8s = Nat64.fromNat(icp_fee) };
        created_at_time = ?{
          timestamp_nanos = Nat64.fromNat(Int.abs(Utility.get_time_now(#nanoseconds)));
        };
      });

    } else {
      return #err(Errors.InsufficientFunds());
    };

    switch icp_receipt {
      case (#Err _) {
        return #err(Errors.TransferFailed());
      };
      case (#Ok _) {
        let amount_transferred = {
          e8s : Nat = balance_e8s - icp_fee;
        };

        // Update internal bookkeeping
        let new_balance = _removeCredit(treasury_principal, ledger, amount_transferred.e8s);
        return #ok(balance_e8s);
      };
    };
  };

  // Transfers a user's ICP deposit from their respective subaccount to the default subaccount of this canister
  private func deposit(from : Principal, balance : Nat) : async Types.Response<Nat> {
    let treasury_principal : Principal = switch (TREASURY_ACCOUNT) {
      case (null) { return #err(Errors.TreasuryNotSet()) };
      case (?val) { val };
    };
    let subAcc = Account.principalToSubaccount(from);
    let destination_deposit_identifier : Types.AccountIdentifier = Account.accountIdentifier(Principal.fromActor(this), Account.principalToSubaccount(treasury_principal));

    // Transfer to default subaccount of this canister
    let icp_receipt = if ((balance) > icp_fee) {
      await Ledger.transfer({
        memo : Nat64 = 0;
        from_subaccount = ?subAcc;
        to = destination_deposit_identifier;
        amount = { e8s = Nat64.fromNat(balance - icp_fee) };
        fee = { e8s = Nat64.fromNat(icp_fee) };
        created_at_time = ?{
          timestamp_nanos = Nat64.fromNat(Int.abs(Utility.get_time_now(#nanoseconds)));
        };
      });

    } else {
      return #err(Errors.InsufficientFunds());
    };

    switch icp_receipt {
      case (#err _) {
        return #err(Errors.TransferFailed());
      };
      case _ {};
    };
    let available = { e8s : Nat = balance - icp_fee };

    // Keep track of deposited ICP
    _addCredit(from, ledger, available.e8s);

    return #ok(available.e8s);
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
        return newBalance;
      };
      case (null) {
        return 0;
      };
    };

  };

  public shared (msg) func addController(canister_id : Principal, new_controller : Principal) : async Types.Result {
    if (not (await canisters.is_controller(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return await canisters.add_controller(canister_id, new_controller);
  };

  public shared (msg) func removeController(canister_id : Principal, controller_to_remove : Principal) : async (Types.Result) {
    // Check if the caller is a controller or admin
    if (not (await canisters.is_controller(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return await canisters.remove_controller(canister_id, controller_to_remove);
  };

  // If amount is not passed, user's credit balance will be used
  // If caller is not specificed, msg.caller will be used
  public shared (msg) func getCyclesToAdd(amount_in_e8s : ?Int, caller_principal : ?Principal) : async Types.Response<Nat> {
    if (Utility.is_anonymous(msg.caller)) return #ok(0);

    return await canisters.get_cycles_to_add(amount_in_e8s, msg.caller, transform);
  };

  // Returns the amount of cycles expected when converting amount in e8s
  public shared (msg) func estimateCyclesToAdd(amount_in_e8s : Int) : async Types.Response<Nat> {
    if (Utility.is_anonymous(msg.caller)) return #ok(0);
    return await canisters.calculate_cycles_to_add(amount_in_e8s, transform);
  };

  public shared (msg) func get_icp_last_price() : async Types.TokenPrice {
    return price_feed.icp_last_price;
  };

  // Used by users for estimating and adding cycles matching amount in icp
  public shared (msg) func addCycles(project_id : Nat, amount_in_e8s : Nat) : async Types.Response<Nat> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    return await canisters.add_cycles(project_id, amount_in_e8s, msg.caller, transform);
  };

  /** Handle canister upgrades */
  system func preupgrade() {};
  system func postupgrade() {
    init<system>(); // Bootstrap canister
    _recover_timers<system>(); // Recreate timers for active slot sessions
    _recover_domain_registration_timers<system>(); // Recreate timers for active register domain jobs
  };

  private func _recover_domain_registration_timers<system>() : () {
    for ((key, timer_data) in Map.entries(domain_registration_timers)) {
      schedule_register_domain(timer_data.project_id, timer_data.canister_id, timer_data.domain, key, 5 * 60, timer_data.domain_registration_id);
    };
  };

  private func _recover_timers<system>() : () {
    for ((slot_id, timer_id) in Map.entries(timers)) {
      let slot : Types.ShareableCanister = switch (shareable_canister_manager.get_canister_by_slot(slot_id)) {
        case (#err(_msg)) {
          return;
        };
        case (#ok(_slot)) {
          _slot;
        };
      };
      let now = Int.abs(Utility.get_time_now(#milliseconds));
      let remaining_duration_s : Nat = if (now <= slot.start_timestamp + slot.duration and slot.start_timestamp != 0) {
        (slot.start_timestamp + slot.duration - now) / 1_000;
      } else {
        0;
      };

      // Only recover valid non-expired session. Force end if less than 50s is left before expiry
      if (remaining_duration_s > 50) {
        Debug.print("Duration remaining greater than 50 sec" # Nat.toText(remaining_duration_s));

        _set_cleanup_timer<system>(remaining_duration_s, slot_id, slot.canister_id);
      } else {
        // Clean up timer immediately
        let dur = if (remaining_duration_s < 30) remaining_duration_s + 30 else remaining_duration_s;
        Debug.print("Duration remaining less than 50 sec" # Nat.toText(dur));
        _set_cleanup_timer<system>(dur, slot_id, slot.canister_id);
      };
    };
  };

  private func _set_cleanup_timer<system>(duration : Nat, slot_id : Nat, canister_id : ?Principal) : () {
    let timer_id = Timer.setTimer<system>(
      #seconds duration,
      func() : async () {
        switch (await shareable_canister_manager.cleanup_session(slot_id, canister_id, Principal.fromActor(this))) {
          case (#err(err)) {};
          case (#ok(val)) {};
        };
      },
    );

    Map.add(timers, Nat.compare, slot_id, timer_id);
  };

  /** End Actor */

  /*
   *
   * END ADMIN METHODS
   *
   */

  /*
   *
   * START HTTP METHODS
   *
   */
  public query func transform(input : Types.TransformationInput) : async Types.TransformationOutput {
    Outcall.transform(input);
  };

  public shared ({ caller }) func edit_ic_domains(canister_id : Principal, new_ic_domains : Types.StaticFile) : async Types.Response<()> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(caller)) return #err(Errors.Unauthorized());

    return await domain.edit_ic_domains(canister_id, new_ic_domains);
  };

  /*
   *
   * START DNS RECORD METHODS
   *
   */

  // // List DNS records for a zone
  public shared (msg) func listDnsRecords(zone_id : Text) : async Types.Response<[Types.DnsRecord]> {
    if (classes.initialized != true) initialize_class_references();
    return await domain.list_dns_records(zone_id, transform);
  };

  public shared (msg) func admin_set_clouflare_config(email : Text, a : Text, zone_id : Text) : async Types.Response<()> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    CLOUDFLARE_EMAIL := ?email;
    CLOUDFLARE_API_KEY := ?a;
    CLOUDFLARE_ZONE_ID := ?zone_id;
    return #ok(cloudflare.set_config(email, a, zone_id));
  };

  public shared (msg) func set_cloudflare_credentials(email : Text, api_key : Text) : async Types.Response<()> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    CLOUDFLARE_EMAIL := ?email;
    CLOUDFLARE_API_KEY := ?api_key;
    return cloudflare.set_cloudflare_credentials(email, api_key);
  };

  public shared (msg) func set_cloudflare_zone_id(zone_id : Text) : async Types.Response<()> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    CLOUDFLARE_ZONE_ID := ?zone_id;
    return #ok(cloudflare.set_zone_id(zone_id));
  };

  public query (msg) func get_cloudflare_credentials() : async Types.Response<{ email : ?Text; api_key : ?Text }> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return cloudflare.get_cloudflare_credentials();
  };

  public query (msg) func get_records_for_canister(canister_id : Principal) : async Types.Response<[Types.CreateRecordResponse]> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return domain.get_records_for_canister(canister_id);
  };

  public query (msg) func get_records() : async Types.Response<[(Types.DnsRecordId, Types.CreateRecordResponse)]> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return #ok(domain.get_all_records());
  };

  public shared (msg) func delete_records() : async Types.Response<()> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return #ok(domain.delete_records());
  };

  public shared (msg) func delete_canister_records_map() : async Types.Response<()> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return #ok(domain.delete_canister_to_records_map());
  };

  // // Create a new DNS record
  public shared (msg) func create_dns_record(payload : Types.CreateDnsRecordPayload) : async Types.Response<Types.DnsRecord> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return await domain.create_dns_record(payload, transform);
  };

  // Retrieve project populated addons with their associated resource
  public shared (msg) func get_my_addons(project_id : Types.ProjectId) : async Types.Response<Types.MyAddons> {
    if (classes.initialized != true) initialize_class_references();
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return subscription_manager.get_my_addons_by_project(project_id);
  };

  public shared (msg) func is_available_subdomain(project_id : Types.ProjectId, subdomain : Text, addon_id : Types.AddOnId) : async Bool {
    if (classes.initialized != true) initialize_class_references();
    let is_available = switch (domain.is_available_subdomain(project_id, subdomain, addon_id)) {
      case (#err(err)) return false;
      case (#ok(val)) val;
    };

    return is_available;
  };

  public shared (msg) func setup_custom_domain_by_project(project_id : Types.ProjectId, subdomain_name : Text, add_on_id : Types.AddOnId) : async Types.Response<Types.DomainRegistration> {
    if (classes.initialized != true) initialize_class_references();
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    let result : Types.DomainRegistrationResult = switch (await domain.setup_custom_domain_by_project(project_id, subdomain_name, add_on_id, transform)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    schedule_register_domain(?project.id, result.canister_id, result.domain_registration.ic_registration.domain, subdomain_name, domain.cooldown_ic_registration, result.resource_id);
    return #ok(result.domain_registration);
  };

  private func schedule_register_domain<system>(project_id : ?Types.ProjectId, canister_id : Principal, domain_name : Text, subdomain_name : Text, duration_seconds : Nat, domain_registration_id : Nat) : () {
    if (classes.initialized != true) initialize_class_references();
    let timer_id = Timer.setTimer<system>(
      #seconds duration_seconds,
      func<system>() : async () {
        Debug.print("[schedule_register_domain] triggered register domain job for domain: " # subdomain_name # ".");
        let register_domain_request_id = switch (await domain.register_domain_ic(canister_id, subdomain_name # ".worldcloud.app", transform)) {
          case (#err(err)) {
            await handle_schedule_domain_error(err, project_id, canister_id, domain_registration_id, domain_name, subdomain_name, duration_seconds);
            return;
          };
          case (#ok(val)) {
            Debug.print("[schedule_register_domain] Successfully triggered register domain: " # val);
            // _delete_domain_registration_timer(subdomain_name);
            timers_manager.delete_domain_registration_timer(subdomain_name);
            let url = subdomain_name # "." #domain_name;

            let slot : ?Types.ShareableCanister = switch (shareable_canister_manager.get_slot_by_canister(canister_id)) {
              // Handle updating url for paid project
              case (#err(err)) {
                // Get project id to update url
                let _project_id = switch (project_id) {
                  case (null) return ();
                  case (?id) id;
                };

                // Update domain registration with new url
                let _res = domain.update_registration_status(domain_registration_id, #complete, Utility.get_domain_registration_error(#none));
                let updated_project : ?Types.Project = switch (project_manager.set_project_url(_project_id, url)) {
                  case (#err(err)) null;
                  case (#ok(_updated_project)) ?_updated_project;
                };
                null;
              };
              // Handle updating url for freemium canister by admin
              case (#ok(freemium_slot)) {
                let _res = domain.update_registration_status_freemium(domain_registration_id, #complete, Utility.get_domain_registration_error(#none));

                // handle freemium registration
                let updated_slot : Types.ShareableCanister = switch (shareable_canister_manager.set_canister_url(freemium_slot.id, url)) {
                  case (#err(err)) freemium_slot;
                  case (#ok(_updated_slot)) _updated_slot;
                };

                ?updated_slot;
              };
            };
            val;
          };
        };
      },
    );

    Debug.print("Scheduled register domain job for domain: " # subdomain_name # ". Triggering in " # Nat.toText(duration_seconds) # " seconds.");
    let timer_data : Types.DomainRegistrationTimer = switch (Map.get(domain_registration_timers, Text.compare, subdomain_name)) {
      case (null) {
        let timer_data : Types.DomainRegistrationTimer = {
          domain_registration_id = domain_registration_id;
          project_id = project_id;
          timer_id = timer_id;
          domain = domain_name;
          subdomain = subdomain_name;
          canister_id = canister_id;
          max_retries = 10;
          current_retries = 0;
          created_at = Int.abs(Utility.get_time_now(#milliseconds));
        };
      };
      case (?val) {
        val;
      };
    };

    // Delete timer and reset domain registration status when max retries is exceeded
    if (timer_data.current_retries + 1 > timer_data.max_retries) {
      timers_manager.delete_domain_registration_timer(subdomain_name);
      // _delete_domain_registration_timer(subdomain_name);
      Debug.print("Register domain exceeded max retries. Stopping attempt and reverting domain registration status...");
      let _res = domain.update_registration_status(domain_registration_id, #inactive, Utility.get_domain_registration_error(#ic_registration_error));
    } else {
      // Increment
      let new_timer_data : Types.DomainRegistrationTimer = {
        timer_data with current_retries = timer_data.current_retries + 1;
      };

      Debug.print("Scheduled job");

      // Update timer data
      Map.add(domain_registration_timers, Text.compare, subdomain_name, new_timer_data);
    };

  };

  private func handle_schedule_domain_error(err : Text, project_id : ?Types.ProjectId, canister_id : Principal, domain_registration_id : Types.DomainRegistrationId, domain_name : Text, subdomain_name : Text, duration_seconds : Nat) : async () {
    Debug.print("[schedule_register_domain] Error registering domain with IC: " # err);

    let target_timer_data = switch (Map.get(domain_registration_timers, Text.compare, subdomain_name)) {
      case (null) {
        return;
      };
      case (?val) val;
    };
    // Handle error with missing ic-domains file
    let error_type : Types.DomainRegistrationErrorKey = if (Text.contains(err, #text "failed to retrieve known domains from canister")) {
      Debug.print("[schedule_register_domain] Canister is missing ic-domains file with content.");

      let ic_domains_file : Types.StaticFile = {
        path = "/.well-known/ic-domains";
        content = Text.encodeUtf8(subdomain_name # "." # domain_name);
        content_type = "application/octet-stream";
        content_encoding = null;
        is_chunked = false;
        chunk_id = 0;
        batch_id = 0;
        is_last_chunk = true;
      };

      let add_ic_domains_res = await domain.edit_ic_domains(canister_id, ic_domains_file);
      #ic_failed_to_retrieve_known_domains;

    } else if (Text.contains(err, #text "missing DNS CNAME record")) {
      // let _res = domain.update_registration_status(domain_registration_id, #inactive, Utility.get_domain_registration_error(#ic_missing_dns_cname_record));
      #ic_missing_dns_cname_record;
    } else if (Text.contains(err, #text "existing DNS TXT challenge record")) {
      // let _res = domain.update_registration_status(domain_registration_id, #inactive, Utility.get_domain_registration_error(#ic_existing_dns_txt_challenge_record));
      #ic_existing_dns_txt_challenge_record;
    } else if (Text.contains(err, #text "missing DNS TXT record")) {
      // let _res = domain.update_registration_status(domain_registration_id, #inactive, Utility.get_domain_registration_error(#ic_missing_dns_txt_record));
      #ic_missing_dns_txt_record;
    } else if (Text.contains(err, #text "invalid DNS TXT record")) {
      // let _res = domain.update_registration_status(domain_registration_id, #inactive, Utility.get_domain_registration_error(#ic_invalid_dns_txt_record));
      #ic_invalid_dns_txt_record;
    } else if (Text.contains(err, #text "more than one DNS TXT record")) {
      // let _res = domain.update_registration_status(domain_registration_id, #inactive, Utility.get_domain_registration_error(#ic_more_than_one_dns_txt_record));
      #ic_more_than_one_dns_txt_record;
    } else if (Text.contains(err, #text "rate limit exceeded for apex domain")) {
      // let _res = domain.update_registration_status(domain_registration_id, #inactive, Utility.get_domain_registration_error(#ic_rate_limit_exceeded));
      #ic_rate_limit_exceeded;
    } else {
      // _delete_domain_registration_timer(subdomain_name);
      timers_manager.delete_domain_registration_timer(subdomain_name);

      // Schedule another registration later with backoff
      schedule_register_domain(project_id, canister_id, domain_name, subdomain_name, duration_seconds * 2, domain_registration_id);
      Debug.print("Scheduled new timer. Triggering in " # Nat.toText(duration_seconds) # " seconds");
      return;
    };

    // Handle freemium registration error
    if (project_id == null) {
      let _res = domain.update_registration_status_freemium(domain_registration_id, #inactive, Utility.get_domain_registration_error(error_type));
    } else {
      // Handle paid plan registration error
      let _res = domain.update_registration_status(domain_registration_id, #inactive, Utility.get_domain_registration_error(error_type));
    };

    Timer.cancelTimer(target_timer_data.timer_id);
    // _delete_domain_registration_timer(subdomain_name);A
    timers_manager.delete_domain_registration_timer(subdomain_name);
  };

  /// Get project canister's domain registration
  public shared (msg) func get_domain_registrations_by_canister(project_id : Types.ProjectId) : async Types.Response<[Types.DomainRegistration]> {
    if (classes.initialized != true) initialize_class_references();
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    let canister_id : Principal = switch (project.canister_id) {
      case (null) return #ok([]);
      case (?val) val;
    };

    return domain.get_domain_registrations_by_canister(canister_id);
  };

  public shared (msg) func get_domain_registration_status(registration_id : Text) : async Types.Response<Bool> {
    if (classes.initialized != true) initialize_class_references();
    return await domain.get_ic_domain_registration_request_id(registration_id, transform);
  };

  public shared query (msg) func get_domain_registrations(project_id : Types.ProjectId) : async Types.Response<[Types.DomainRegistration]> {
    if (classes.initialized != true) initialize_class_references();
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    if (project.plan != #paid) return #err(Errors.PremiumFeature());
    let canister_id : Principal = switch (project.canister_id) {
      case (null) return #err(Errors.NotFoundCanister());
      case (?val) val;
    };

    return domain.get_domain_registrations_by_canister(canister_id);
  };

  public shared (msg) func delete_domain_registration(project_id : Types.ProjectId, addon_id : Types.AddOnId) : async Types.Response<Bool> {
    if (classes.initialized != true) initialize_class_references();
    let _is_authorized = switch (project_manager.validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return domain.delete_domain_registration(project_id, addon_id);
  };

  public shared (msg) func register_domain(subdomain_name : Text, canister_id : Principal) : async Types.Response<Types.IcDomainRegistrationId> {
    if (classes.initialized != true) initialize_class_references();
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let register_domain_request_id = switch (await domain.register_domain_ic(canister_id, subdomain_name # ".worldcloud.app", transform)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    return #ok(register_domain_request_id);
  };

  // /*
  //  *
  //  * END DNS RECORD METHODS
  //  *
  //  */

};
