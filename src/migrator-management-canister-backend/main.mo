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
import IC "ic:aaaaa-aa";

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
  private stable var active_global_timers : [Text] = [];

  private stable var stable_deployed_canisters : Types.DeployedCanistersMap = Map.empty<Principal, Bool>();
  private stable var stable_quotas : Types.QuotasMap = Map.empty<Principal, Types.Quota>();
  private stable var stable_system_timers : Types.TimersMap = Map.empty<Nat, Nat>();
  private stable var stable_quota_timer_id : Nat = 0;
  private stable var TREASURY_ACCOUNT : ?Principal = null;
  private stable var canister_to_records_map : Types.CanisterToRecordMap = Map.empty<Principal, [Types.DnsRecordId]>();
  private stable var cloudflare_records_map : Types.CloudflareRecordsMap = Map.empty<Types.DnsRecordId, Types.CreateRecordResponse>();
  private stable var domain_registration : Types.DomainRegistrationMap = Map.empty<Types.DomainRegistrationId, Types.DomainRegistration>();
  private stable var canister_to_domain_registration : Types.CanisterToDomainRegistration = Map.empty<Principal, [Types.DomainRegistration]>();

  private transient var subscription_services : Types.SubscriptionServices = Map.empty<Types.ProjectId, [Types.AddOnService]>();

  private transient var QUOTA_CLEAR_DURATION_SECONDS : Nat = 24 * 60 * 60;
  private transient var QUOTA_CLEAR_DURATION_SECONDS_DEV : Nat = 3 * 60;

  private transient var icp_last_price : Types.TokenPrice = {
    value = 0.0;
    last_updated_seconds = 0;
  };

  // Cloudflare API Configuration
  private stable var CLOUDFLARE_API_BASE_URL : Text = "https://api.cloudflare.com/client/v4";
  private stable var CLOUDFLARE_EMAIL : ?Text = null;
  private stable var CLOUDFLARE_API_KEY : ?Text = null;
  private stable var CLOUDFLARE_ZONE_ID : ?Text = null;

  /** Classes Instances */
  private transient var book : Book.Book = Book.Book(stable_book);
  private transient let project_manager = ProjectManager.ProjectManager(stable_projects, stable_user_to_projects, stable_next_project_id);
  private transient let access_control = AccessControl.AccessControl(deployMsg.caller, stable_role_map);
  private transient let signatures = HashMap.HashMap<Principal, Blob>(0, Principal.equal, Principal.hash);
  private transient let shareable_canister_manager = CanisterShareable.ShareableCanisterManager(stable_slots, stable_user_to_slot, stable_used_slots, stable_usage_logs, stable_next_slot_id, stable_quotas);
  private transient let workflow_manager = WorkflowManager.WorkflowManager(stable_workflow_run_history);
  private transient let activity_manager = ActivityManager.ActivityManager(stable_project_activity_logs);
  private transient let subscription_manager = SubscriptionManager.SubscriptionManager(book, ledger, _subscriptions, TREASURY_ACCOUNT, subscription_services);
  private transient let canisters = Canisters.Canisters(stable_canister_table, stable_user_canisters, stable_deployed_canisters);
  private transient let cloudflare = Cloudflare.Cloudflare(CLOUDFLARE_API_BASE_URL, CLOUDFLARE_EMAIL, CLOUDFLARE_API_KEY, CLOUDFLARE_ZONE_ID);
  private transient let domain = Domain.Domain(cloudflare_records_map, canister_to_records_map, canister_to_domain_registration, domain_registration);

  /** Transient Storage */
  private transient var chunks = HashMap.HashMap<Text, Blob>(0, Text.equal, Text.hash);
  private transient var pending_cycles : HashMap.HashMap<Principal, Nat> = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
  private transient var assets = HashMap.HashMap<Types.AssetId, Types.Asset>(0, Text.equal, Text.hash); //Store asset metadata
  private transient var is_run = false;
  private transient var secs_since_midnight = 0;
  private transient var secs_till_midnight = 0;
  private transient var next_secs_since_midnight = 0;
  private transient var next_secs_till_midnight = 0;
  private transient var next_trigger_at = 0;
  private transient var is_run_recurring = false;
  private transient var is_init = false;

  public shared (msg) func isInitialized() : async Types.InitializedResponse {
    return {
      is_init = is_init;
      is_run = is_run;
      is_run_recurring = is_run_recurring;
      secs_since_midnight = secs_since_midnight;
      secs_till_midnight = secs_till_midnight;
      next_secs_since_midnight = next_secs_since_midnight;
      next_secs_till_midnight = next_secs_till_midnight;
      next_trigger_at = next_trigger_at;
    };
  };

  /** Initialization*/
  private func init<system>() {
    Debug.print("Initializing backend canister....");
    access_control.init();
    init_quota_timer<system>();
  };

  private func init_quota_timer<system>() {
    let clear_duration = QUOTA_CLEAR_DURATION_SECONDS;
    // let clear_duration = QUOTA_CLEAR_DURATION_SECONDS;
    let id : Nat = Map.size(stable_system_timers);
    let schedule : Types.QuotaSchedulerSeconds = Utility.get_quota_scheduler_seconds(clear_duration);
    let now : Nat = Int.abs(Utility.get_time_now(#seconds));
    Debug.print("RUNNING....");
    // Set the next quota reset utc time
    shareable_canister_manager.next_quota_reset_s := now + schedule.seconds_until_next_midnight;

    is_init := true;
    secs_since_midnight := schedule.seconds_since_midnight;
    secs_till_midnight := schedule.seconds_until_next_midnight;
    next_trigger_at := schedule.seconds_until_next_midnight + now;

    // Set initial timer to run at next midnight
    let initial_timer_id = Timer.setTimer<system>(
      #seconds(schedule.seconds_until_next_midnight),
      func() : async () {
        Debug.print("Resetting quotas for the first timee.");
        // Reset quotas
        shareable_canister_manager.reset_quotas();
        shareable_canister_manager.next_quota_reset_s := Int.abs(Utility.get_time_now(#seconds)) + clear_duration;
        is_run := true;
        next_secs_till_midnight := clear_duration;
        next_trigger_at := shareable_canister_manager.next_quota_reset_s;

        Debug.print("Setting up recurring timer..");
        // Set up recurring timer for every 24 hours after this
        let recurring_timer_id = Timer.recurringTimer<system>(
          #seconds(clear_duration), // 24 hours in seconds
          func() : async () {
            Debug.print("Running recurring timer");
            let target_time = Int.abs(Utility.get_time_now(#seconds)) + clear_duration;
            shareable_canister_manager.reset_quotas();

            shareable_canister_manager.next_quota_reset_s := target_time;
            is_run_recurring := true;
            next_secs_till_midnight := clear_duration;
            next_trigger_at := target_time;
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
    return subscription_manager.addons_list;
  };

  /// Retrieve purchased add-ons for a project
  public shared query (msg) func get_add_ons_by_project(project_id : Types.ProjectId) : async Types.Response<[Types.AddOnService]> {
    let _is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };
    return #ok(subscription_manager.get_add_ons_by_project(project_id));
  };

  /// Check if project has the specified add on activated
  public shared query (msg) func has_add_on_by_project(project_id : Types.ProjectId, add_on_id : Types.AddOnId) : async Types.Response<Bool> {
    let _is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let result : Types.HasAddonResult = subscription_manager.has_add_on(project_id, add_on_id);
    return #ok(result.has_add_on);
  };

  public shared (msg) func subscribe_add_on(project_id : Types.ProjectId, add_on_id : Types.AddOnId) : async Types.Response<[Types.AddOnService]> {
    let _is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    return subscription_manager.subscribe_add_on(msg.caller, project_id, add_on_id, project_manager, domain);
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

  private func get_available_slot_id(caller : Principal, project_id : Nat) : async Types.Response<Nat> {
    // Find available slots
    let available_slot_ids : [Nat] = shareable_canister_manager.get_available_slots();
    // Create new canister and slot if no available shared canisters
    if (available_slot_ids.size() == 0) {

      let new_canister_id : Principal = switch (await _deploy_asset_canister(Principal.fromActor(this), true)) {
        case (#err(_errMsg)) { return #err(_errMsg) };
        case (#ok(id)) { id };
      };

      let slot_id = switch (
        shareable_canister_manager.create_slot(
          Principal.fromActor(this),
          caller,
          new_canister_id,
          ?project_id,
          shareable_canister_manager.MIN_CYCLES_INIT,
        )
      ) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(id)) { id };
      };

      stable_slots := shareable_canister_manager.slots;
      stable_next_slot_id := shareable_canister_manager.next_slot_id;

      return #ok(slot_id);
    } else {
      return #ok(available_slot_ids[0]);
    };
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

  public shared (msg) func admin_get_domain_registration_id_by_domain(domain_name : Text) : async Types.Response<Types.DomainRegistrationId> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let id = switch (await domain.register_domain(domain_name, transform)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };
    return #ok(id);
  };

  public shared (msg) func admin_cancel_domain_registration_timer(subdomain_name : Text) : async Types.Response<Bool> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    let key : Text = subdomain_name;
    let timer_id : Nat = switch (Map.get(global_timers, Text.compare, key)) {
      case (null) return #err(Errors.NotFound("global timer id for key " # key));
      case (?val) val;
    };

    Timer.cancelTimer(timer_id);
    ignore Map.delete(global_timers, Text.compare, key);
    return #ok(true);
  };

  public shared query (msg) func admin_get_domain_registrations() : async Types.Response<[(Types.DomainRegistrationId, Types.DomainRegistration)]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return #ok(domain.get_all_registrations());
  };

  public shared query (msg) func admin_get_dns_records() : async Types.Response<[(Types.DnsRecordId, Types.CreateRecordResponse)]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return #ok(domain.get_all_records());
  };

  public shared query (msg) func admin_get_canister_domain_registrations(canister_id : Principal) : async Types.Response<[Types.DomainRegistration]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return domain.get_domain_registrations(canister_id);
  };

  public shared query (msg) func admin_get_global_timers() : async [(Text, Nat)] {
    if (not access_control.is_authorized(msg.caller)) {
      return [];
    };
    return Iter.toArray(Map.entries(global_timers));
  };

  public shared (msg) func admin_setup_custom_domain(canister_id : Principal, subdomain_name : Text) : async Types.Response<Types.DomainRegistration> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return await setup_custom_domain(canister_id, subdomain_name);
  };

  public shared query (msg) func admin_get_treasury_principal() : async Types.Response<Principal> {
    let principal : Principal = switch (TREASURY_ACCOUNT) {
      case (null) { return #err(Errors.TreasuryNotSet()) };
      case (?val) { val };
    };
    return #ok(principal);
  };

  public shared (msg) func admin_set_treasury(principal : Principal) : async Types.Response<()> {
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
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    return shareable_canister_manager.set_all_slot_duration(new_duration_ms);
  };

  /// TAG: Admin
  public shared (msg) func admin_delete_usage_logs() : async () {
    if (not access_control.is_authorized(msg.caller)) return;
    shareable_canister_manager.admin_clear_usage_logs();
    // stable_usage_logs := shareable_canister_manager.usage_logs; // Update stable storage
    return;
  };

  /// TAG: Admin
  public shared (msg) func update_slot(slot_id : Nat, updated_slot : Types.ShareableCanister) : async Types.Response<Types.ShareableCanister> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    let response = shareable_canister_manager.update_slot(slot_id, updated_slot);
    // stable_slots := shareable_canister_manager.slots; // update stable storage
    return response;
  };

  /// TAG: Admin
  public shared (msg) func delete_projects() : async Bool {
    if (not access_control.is_authorized(msg.caller)) return false;

    let is_dropped = project_manager.drop_projects();
    if (not is_dropped) return false;

    // Update stable storage
    // stable_projects := project_manager.projects;
    // stable_user_to_projects := project_manager.user_to_projects;
    stable_next_project_id := project_manager.next_project_id;
    return true;
  };

  /// TAG: Admin
  public shared (msg) func delete_workflow_run_history() : async () {
    if (not access_control.is_authorized(msg.caller)) return;
    let response = workflow_manager.delete_run_history_all();
    // stable_workflow_run_history := workflow_manager.workflow_run_history; // update stable storage
    return response;
  };

  /// Deletes a project's workflow run history
  public shared (msg) func delete_workflow_run_history_by_user(project_id : Types.ProjectId) : async Types.Response<()> {
    let _is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let response = workflow_manager.delete_run_history(project_id);
    // stable_workflow_run_history := workflow_manager.workflow_run_history; // update stable storage
    return #ok(response);

  };

  public shared (msg) func delete_project(project_id : Nat) : async Types.Response<Bool> {
    // Ensure access to project owner only
    let _is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Cache canister in unused array for paid projects
    if (project.plan == #paid) {
      let _canister_id : ?Principal = switch (project.canister_id) {
        case (null) {
          null;
        };
        case (?id) {
          // Update subscription canister records
          switch (await subscription_manager.update_sub_delete_project(msg.caller, id)) {
            case (#err(errMsg)) {
              return #err(errMsg);
            };
            case (#ok()) {};
          };

          // stable_subscriptions := subscription_manager.subscriptions; // update stable storage

          // Clear asset canister files
          let res = await _clear_asset_canister(id);
          ?id;
        };
      };
    } else if (project.plan == #freemium) {
      // Check if project is freemium and has an active premium session
      let active_session = switch (project_manager.is_freemium_session_active(project_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(active)) { active };
      };

      // Clear active session
      if (active_session) {
        let slot : ?Types.ShareableCanister = switch (shareable_canister_manager.get_canister_by_user(msg.caller)) {
          case (#err(err)) {
            null;
          };
          case (#ok(null)) {
            null;
          };
          case (#ok(?s)) {
            _delete_timer(s.id); // Delete session expiry timer
            let project_id : ?Nat = switch (_end_freemium_session(s.id, s.user)) {
              // End session gracefully
              case (#err(errMsg)) {
                null;
              };
              case (#ok(id)) {
                id;
              };
            };
            ?s;
          };
        };
      };
    };

    // Clear workflow run history
    workflow_manager.delete_run_history(project_id);

    // Clear project activity logs
    let _cleared_activity_res = activity_manager.clear_project_activity_logs(project_id);

    // Delete project and user association
    let _dropped_project = switch (project_manager.drop_project(msg.caller, project_id)) {
      case (#err(_errMsg)) { return #err(_errMsg) };
      case (#ok(is_dropped)) { is_dropped };
    };

    return #ok(true);
  };

  /// TAG: Admin
  public shared (msg) func reset_project_slot(project_id : Nat) : async Types.Response<Bool> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    return clear_project_session(?project_id);
  };

  /// TAG: Admin
  public shared (msg) func reset_slots() : async Types.Response<()> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());
    Debug.print("Is authroized...");
    let res : Types.ResetSlotsResult = shareable_canister_manager.reset_slots(Principal.fromActor(this));

    for (id in res.project_ids.vals()) {
      let _res = switch (clear_project_session(id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(cleared)) {
          cleared;
        };
      };
    };

    for (id in res.slot_ids.vals()) {
      _delete_timer(id);
    };

    return #ok();
  };

  /// TAG: Admin
  public shared (msg) func purge_expired_sessions() : async Types.Response<()> {
    if (not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());

    let slots : [Types.ShareableCanister] = shareable_canister_manager.get_slots(null, null);
    var failed : [Nat] = [];
    // for ((slot_id, slot_entry) in shareable_canister_manager.slots.entries()) {
    for ((slot_id, slot_entry) in Map.entries(shareable_canister_manager.slots)) {
      let is_expired = switch (shareable_canister_manager.is_expired_session(slot_id)) {
        case (#err(errMsg)) { return #err(errMsg) };
        case (#ok(is_e)) { is_e };
      };

      // Handle expired slots
      if (is_expired) {
        let project_id : ?Nat = switch (_end_freemium_session(slot_id, slot_entry.user)) {
          case (#err(msg)) {
            let _new_array = Array.append(failed, [slot_id]);
            null;
          };
          case (#ok(id)) {
            _delete_timer(slot_id);
            id;
          };
        };
      };
    };

    if (failed.size() > 0) {
      return #err(Errors.FailedToPurge(failed.size()));
    };

    return #ok();
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
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    let subscription : Types.Subscription = switch (subscription_manager.get_subscription(msg.caller)) {
      case (#err(err)) {
        if (err == "Subscription not found" and payload.plan == #freemium) return #err(Errors.FreemiumSubscriptionRequired());
        if (err == "Subscription not found" and payload.plan == #paid) return #err(Errors.SubscriptionRequired());
        return #err(err);
      };
      case (#ok(val)) { val };
    };

    let project_id : Nat = project_manager.create_project(
      msg.caller,
      payload,
    );

    // Update the stable variable
    stable_next_project_id := project_manager.next_project_id;

    let is_created_log = switch (activity_manager.create_project_activity(project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(result)) { result };
    };

    return #ok({
      project_id = project_id;
      is_freemium = switch (payload.plan) {
        case (#freemium) { true };
        case (#paid) { false };
      };
    });
  };

  // Step 2 (freemium projects) -> request a session
  // Step 2 (paid projects) -> deploy a canister
  // Create a canister for freemium
  public shared (msg) func deployAssetCanister(project_id : Nat) : async Types.Result {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    if (project.plan == #freemium) {
      // Get freemium session - allocates slot to project user
      let _project : Types.Project = switch (await _request_freemium_session(project_id, msg.caller)) {
        case (#err(_errMsg)) { return #err(_errMsg) };
        case (#ok(project)) { project };
      };

      // Get updated slot
      let slot = switch (shareable_canister_manager.get_canister_by_user(msg.caller)) {
        case (#err(err)) { return #err(err) };
        case (#ok(null)) { return #err(Errors.NotFoundSlot()) };
        case (#ok(?val)) { val };
      };

      // Create timer for clearing freemium session
      _set_cleanup_timer(slot.duration / 1_000, slot.id, _project.canister_id);

      // Record data in activity
      let _updated = switch (activity_manager.update_project_activity(project_id, "Runner", "Session started. Using freemium runner.")) {
        case (#err(_msg)) {
          false;
        };
        case (#ok(is_updated)) { is_updated };
      };

      // Return canister id for updated project
      return #ok(
        Principal.toText(
          switch (_project.canister_id) {
            case (null) { return #err(Errors.NotFoundCanister()) };
            case (?id) { id };
          }
        )
      );
    } else if (project.plan == #paid) {
      // Handle Paid plan type
      let canister_id : Principal = switch (project.canister_id) {
        case (null) {
          let canister_id : Principal = switch (await _deploy_asset_canister(msg.caller, false)) {
            case (#err(_errMsg)) { return #err(_errMsg) };
            case (#ok(id)) { id };
          };

          let updated_project : Types.Project = {
            user = msg.caller;
            id = project.id;
            canister_id = ?canister_id;
            name = project.name;
            description = project.description;
            tags = project.tags;
            plan = project.plan;
            date_created = project.date_created;
            date_updated = Utility.get_time_now(#milliseconds);
          };
          project_manager.put_project(project_id, updated_project);

          let updated = activity_manager.update_project_activity(project_id, "Runner", "Attached premium runner.");
          canister_id;
        };
        case (?id) { return #err(Errors.AlreadyCreated()) };
      };

      return #ok(Principal.toText(canister_id));
    };

    return #err(Errors.FailedDeployCanister());
  };

  // Step 3: Upload assets to project's canister
  // Upload files to project's asset canister
  public shared (msg) func upload_assets_to_project(
    payload : Types.StoreAssetInCanisterPayload
  ) : async Types.Response<Bool> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(payload.project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Get canister id
    let canister_id : Principal = switch (project.canister_id) {
      case (null) {
        return #err(Errors.NoCanisterInProject());
      };
      case (?id) {
        id;
      };
    };

    if (project.plan == #freemium) {
      let slot : ?Types.ShareableCanister = switch (shareable_canister_manager.get_canister_by_user(msg.caller)) {
        case (#err(err)) { return #err(err) };
        case (#ok(val)) { val };
      };

      let is_user = switch (slot) {
        case (null) { return #err(Errors.NotFoundSlot()) };
        case (?_slot) {
          if (not (msg.caller == _slot.user)) {
            return #err(Errors.Unauthorized());
          };
          true;
        };
      };

    } else if (project.plan == #paid) {
      if (not (await _isController(canister_id, msg.caller))) {
        return #err(Errors.Unauthorized());
      };
    };

    // TODO: pass caller as parameter
    let res = await storeInAssetCanister(msg.caller, payload.project_id, payload.files, payload.workflow_run_details);

    // Update logs for completion of all batches
    if (payload.current_batch == payload.total_batch_count) {
      let _updated_logs = activity_manager.update_project_activity(payload.project_id, "Assets", "Assets upload complete.");
    } else if (payload.current_batch == 1) {
      let _updated_logs = activity_manager.update_project_activity(payload.project_id, "Assets", "Uploading assets to runner.");
    };

    return res;
  };

  public shared (msg) func clear_project_assets(project_id : Types.ProjectId) : async Types.Response<()> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    // Ensure caller is owner of project
    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    if (not is_authorized) return #err(Errors.Unauthorized());

    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Ensure caller is project owner
    if (not (project.user == msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let canister_id : Principal = switch (project.canister_id) {
      case (null) { return #err(Errors.NotFoundCanister()) };
      case (?id) { id };
    };

    let _cleared = switch (await _clear_asset_canister(canister_id)) {
      case (#err(err)) { return #err(err) };
      case (#ok()) { true };
    };

    return #ok();
  };

  /*
   * END PROJECT CREATION METHODS
   *
   */

  /*
   * START FREEMIUM METHODS
   *
   */

  // Entrypoint for deploying a free canister
  private func _request_freemium_session(project_id : Nat, caller : Principal) : async Types.Response<Types.Project> {
    if (Utility.is_anonymous(caller)) return #err(Errors.Unauthorized());

    let quota : Types.Quota = shareable_canister_manager.get_quota(caller);

    if (quota.consumed >= quota.total) return #err(Errors.QuotaReached(quota.total));
    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Ensure freemium project type
    if (not (project.plan == #freemium)) {
      return #err(Errors.NotFreemiumType());
    };

    // Find available slots
    let slot_id : Nat = switch (await get_available_slot_id(caller, project_id)) {
      case (#err(_errMsg)) { return #err(_errMsg) };
      case (#ok(id)) { id };
    };

    // Request a session - updates slot with new project session
    let slot : Types.ShareableCanister = switch (await shareable_canister_manager.request_session(caller, project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(null)) { return #err(Errors.NotFoundSlot()) };
      case (#ok(?_slot)) { _slot };
    };

    stable_next_slot_id := shareable_canister_manager.next_slot_id; // update stable storage

    // Get canister id for validating canister cycles balance
    let canister_id : Principal = switch (slot.canister_id) {
      case (null) { return #err(Errors.NotFoundCanister()) };
      case (?id) { id };
    };

    // Ensure canister has minimum required cycles balance
    let cycles_balance = switch (await validate_canister_cycles(canister_id)) {
      case (#err(err)) { return #err(err) };
      case (#ok(balance)) { balance };
    };

    // Update project record with new session
    let updated_project : Types.Project = {
      user = caller;
      id = project.id;
      canister_id = slot.canister_id;
      name = project.name;
      description = project.description;
      tags = project.tags;
      plan = project.plan;
      date_created = project.date_created;
      date_updated = Utility.get_time_now(#milliseconds);
    };
    project_manager.put_project(project_id, updated_project);

    return #ok(updated_project);
  };

  public shared (msg) func end_freemium_session(slot_id : Nat) : async Types.Response<?Nat> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    // Ensure caller is user of slot
    let _user_slot_id : Nat = switch (shareable_canister_manager.get_slot_id_by_user(msg.caller)) {
      case (#ok(null)) { return #err(Errors.NotFoundSlot()) };
      case (#err(err)) { return #err(err) };
      case (#ok(?val)) {
        if (not (val == slot_id)) return #err(Errors.Unauthorized());
        val;
      };
    };
    let response = _end_freemium_session(slot_id, msg.caller);

    _delete_timer(slot_id); // Clear the timer and pop from stable array of timer ids
    response;
  };

  private func _end_freemium_session(slot_id : Nat, slot_user : Principal) : Types.Response<?Nat> {
    let slot : Types.ShareableCanister = switch (shareable_canister_manager.get_canister_by_slot(slot_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(_slot)) { _slot };
    };
    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let cycles = 0;

    if (slot.user != slot_user) return #err(Errors.Unauthorized());

    // Ensure updating the correct project
    let is_cleared = switch (clear_project_session(slot.project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(cleared)) { cleared };
    };

    let response = shareable_canister_manager.terminate_session(slot_id, cycles, Principal.fromActor(this));
    response;
  };

  private func clear_project_session(project_id : ?Nat) : Types.Response<Bool> {
    // Ensure updating the correct project
    let _project_id : ?Nat = switch (project_id) {
      case (null) { null };
      case (?id) {
        let project : Types.Project = switch (project_manager.get_project_by_id(id)) {
          case (#err(errMsg)) { return #err(errMsg) };
          case (#ok(_project)) { _project };
        };

        // Updated project object
        let updated_project : Types.Project = {
          user = project.user;
          id = project.id;
          canister_id = null;
          name = project.name;
          description = project.description;
          tags = project.tags;
          plan = project.plan;
          date_created = project.date_created;
          date_updated = Utility.get_time_now(#milliseconds);
        };

        // Update project activity
        let _update_activity = activity_manager.update_project_activity(project.id, "Runner", "Freemium session ended.");

        // Apply update
        project_manager.put_project(id, updated_project);
        ?id;
      };
    };
    return #ok(true);
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

    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
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
    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
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
    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(res)) { res };
    };

    let canister_id = switch (_get_canister_id_by_project(project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(id)) { id };
    };

    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });

    return #ok(current_settings);
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
      // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

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
      // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

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
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());
    return await subscription_manager.create_subscription(msg.caller, tier_id);
  };

  public shared query func get_tiers() : async [Types.Tier] {
    return subscription_manager.tiers_list;
  };

  // Get the caller's subscription
  public shared query (msg) func get_subscription() : async Types.Response<Types.Subscription> {
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
    if (not (await _isController(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());

    try {
      let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
      let response = await asset_canister.list({});

      return #ok({
        count = response.size();
        assets = response;
      });
    } catch (error) {
      return #ok({
        count = 0;
        assets = [];
      });
    };
  };

  public shared (msg) func getCanisterAsset(canister_id : Principal, asset_key : Text) : async Types.Response<?Types.AssetCanisterAsset> {
    if (not (await _isController(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) return #err(Errors.Unauthorized());

    return await get_canister_asset(canister_id, asset_key);
  };

  private func get_canister_asset(canister_id : Principal, asset_key : Text) : async Types.Response<?Types.AssetCanisterAsset> {
    try {
      let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
      let asset = await asset_canister.get({
        key = asset_key;
        accept_encodings = ["identity", "gzip", "compress"];
      });
      return #ok(?asset);

    } catch (e) {
      // return #err(Error.message(e));
      return #ok(null);
    };
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
    let is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(authorized)) { authorized };
    };

    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    let canister_id : Principal = switch (project.canister_id) {
      case (null) { return #err(Errors.NotFoundSlot()) };
      case (?id) { id };
    };

    let deployment : Types.CanisterDeployment = switch (canisters.get_deployment_by_canister(canister_id)) {
      case null {
        return #ok(null);
      };
      case (?dep) { dep };
    };
    return #ok(?deployment);
  };

  /// Validates access to a project to either admins, or to owner of a project
  private func _validate_project_access(user : Principal, project_id : Nat) : Types.Response<Bool> {
    // Reject anonymous users
    if (Utility.is_anonymous(user)) return #err(Errors.Unauthorized());

    // Allow admin access
    let is_authorized = access_control.is_authorized(user);
    if (is_authorized) {
      return #ok(true);
    };

    // Ensure users access their own projects
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Ensure user access to own project
    if (not (project.user == user)) {
      return #err(Errors.Unauthorized());
    };

    return #ok(true);
  };

  private func _get_canister_id_by_project(project_id : Nat) : Types.Response<Principal> {
    // Get project
    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(errMsg)) { return #err(errMsg) };
      case (#ok(_project)) { _project };
    };

    // Reject if canister id is null
    switch (project.canister_id) {
      case (null) { return #err(Errors.InactiveSession()) };
      case (?id) { return #ok(id) };
    };
  };

  public shared (msg) func getControllers(canister_id : Principal) : async Types.Response<[Principal]> {
    // Only owner or admins
    if (not (await _isController(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });
    let current_controllers = current_settings.settings.controllers;
    return #ok(current_controllers);
  };

  private func _isController(canister_id : Principal, caller : Principal) : async Bool {
    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });
    let current_controllers = current_settings.settings.controllers;
    let matches = Array.filter(current_controllers, func(p : Principal) : Bool { p == caller });
    return matches.size() > 0;
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
    if (not (await _isController(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return await _addController(canister_id, new_controller);
  };

  private func _addController(canister_id : Principal, new_controller : Principal) : async Types.Result {
    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });
    let current_controllers = current_settings.settings.controllers;
    let updated_controllers = Array.append(current_controllers, [new_controller]);
    let _canister_settings = await IC.update_settings({
      canister_id;
      settings = {
        controllers = ?updated_controllers;
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
        log_visibility = ?current_settings.settings.log_visibility;
        reserved_cycles_limit = ?current_settings.settings.reserved_cycles_limit;
        wasm_memory_limit = ?current_settings.settings.wasm_memory_limit;
        wasm_memory_threshold = ?current_settings.settings.wasm_memory_threshold;
      };
      sender_canister_version = null;
    });
    return #ok("Added permission for controller");
  };

  public shared (msg) func removeController(canister_id : Principal, controller_to_remove : Principal) : async (Types.Result) {
    // Check if the caller is a controller or admin
    if (not (await _isController(canister_id, msg.caller)) and not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let current_settings = await IC.canister_status({
      canister_id = canister_id;
    });
    let current_controllers : [Principal] = current_settings.settings.controllers;
    let updated_controllers = Array.filter(current_controllers, func(p : Principal) : Bool { p != controller_to_remove });

    let _canister_settings = await IC.update_settings({
      canister_id;
      settings = {
        controllers = ?updated_controllers;
        compute_allocation = null;
        memory_allocation = null;
        freezing_threshold = null;
        reserved_cycles_limit = ?current_settings.settings.reserved_cycles_limit;
        log_visibility = ?current_settings.settings.log_visibility;
        wasm_memory_limit = ?current_settings.settings.wasm_memory_limit;
        wasm_memory_threshold = ?current_settings.settings.wasm_memory_threshold;
      };
      sender_canister_version = null;
    });

    return #ok("Removed permission for controller");
  };

  // If amount is not passed, user's credit balance will be used
  // If caller is not specificed, msg.caller will be used
  public shared (msg) func getCyclesToAdd(amount_in_e8s : ?Int, caller_principal : ?Principal) : async Types.Response<Nat> {
    if (Utility.is_anonymous(msg.caller)) return #ok(0);

    let _caller = switch (caller_principal) {
      case null { msg.caller };
      case (?caller) { caller };
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
        await calculateCyclesToAdd(amount);
      };
      case (null) await calculateCyclesToAdd(user_credits);
    };
    return cyclesToAdd;
  };

  // Returns the amount of cycles expected when converting amount in e8s
  public shared (msg) func estimateCyclesToAdd(amount_in_e8s : Int) : async Types.Response<Nat> {
    if (Utility.is_anonymous(msg.caller)) return #ok(0);
    return await calculateCyclesToAdd(amount_in_e8s);
  };

  public shared (msg) func get_icp_last_price() : async Types.TokenPrice {
    return icp_last_price;
  };

  private func update_icp_price() : async Types.Response<Types.TokenPrice> {
    let now : Nat = Int.abs(Utility.get_time_now(#seconds));
    if (now < icp_last_price.last_updated_seconds) {
      icp_last_price := { value = 0.0; last_updated_seconds = 0 };
    };

    // Return current price stored in memory
    if (now - icp_last_price.last_updated_seconds < REFRESH_PRICE_INTERVAL_SECONDS and icp_last_price.value != 0.0 and icp_last_price.last_updated_seconds != 0) {
      Debug.print("Return price as is...");

      return #ok(icp_last_price);
    } else {
      Debug.print("Updating price because its stale...");
      // Update token price
      let usd_price : Float = switch (await get_icp_price()) {
        case (#err(err)) { return #err(err) };
        case (#ok(val)) { val };
      };

      icp_last_price := {
        value = usd_price;
        last_updated_seconds = Int.abs(Utility.get_time_now(#seconds));
      };
      Debug.print("Updated price: " # debug_show (icp_last_price));
    };

    return #ok(icp_last_price);
  };

  // TODO: Implement price api
  // Calculates the amount of cycles equivalent to amount in e8s based on xdr price
  private func calculateCyclesToAdd(amountInE8s : Int) : async Types.Response<Nat> {
    let icp_amount = Float.fromInt(amountInE8s) / Float.fromInt(E8S_PER_ICP);
    let token_price : Types.TokenPrice = switch (await update_icp_price()) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    Debug.print("ICP amount to excahnge: " # Float.toText(icp_amount));
    if (token_price.value == 0) return #err(Errors.PriceFeedError());
    Debug.print("TOKEN PRICE RECORD: " # debug_show (token_price));
    let usd_value : Float = icp_amount * token_price.value;
    Debug.print("USD Value: " # Float.toText(usd_value));
    let t_cycles : Float = usd_value / XDR_PRICE;
    Debug.print("T cycles to add: " # Float.toText(t_cycles));
    let cyclesToAdd = Int.abs(Float.toInt(Float.floor(t_cycles * CYCLES_PER_XDR)));
    Debug.print("Cycles to add: " # Nat.toText(cyclesToAdd));
    return #ok(cyclesToAdd);
  };

  // Used by users for estimating and adding cycles matching amount in icp
  public shared (msg) func addCycles(project_id : Nat, amount_in_e8s : Nat) : async Types.Response<Nat> {
    if (Utility.is_anonymous(msg.caller)) return #err(Errors.Unauthorized());

    let project : Types.Project = switch (project_manager.get_project_by_id(project_id)) {
      case (#err(err)) { return #err(err) };
      case (#ok(val)) { val };
    };

    if (project.plan == #freemium) { return #err(Errors.NotAllowedOperation()) };

    let canister_id : Principal = switch (project.canister_id) {
      case (null) { return #err(Errors.NotFoundCanister()) };
      case (?val) { val };
    };

    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let claimable = book.fetchUserIcpBalance(msg.caller, ledger);

    // Estimate cycles for given amount and add cycles
    let cyclesAdded = switch (await getCyclesToAdd(?amount_in_e8s, ?msg.caller)) {
      case (#err(err)) {
        return #err(err);
      };
      case (#ok(cycles)) {
        let cycles_added = await _add_cycles(canister_id, cycles);
        cycles_added;
      };
    };

    let _remaining = _removeCredit(msg.caller, ledger, claimable);
    return #ok(cyclesAdded);
  };

  // Internal method for adding cycles from amount in cycles
  private func _add_cycles(canister_id : Principal, amount_in_cycles : Nat) : async Nat {
    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    ExperimentalCycles.add(amount_in_cycles);
    await IC.deposit_cycles({ canister_id });

    return amount_in_cycles;
  };

  // Function to deploy new asset canister
  private func _deploy_asset_canister(user : Principal, is_freemium : Bool) : async Types.Response<Principal> {
    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

    // Only create a canister if freemium
    if (is_freemium) {
      let tier_id : Nat = switch (subscription_manager.get_tier_id_freemium()) {
        case (#err(msg)) { return #err(msg) };
        case (#ok(val)) { val };
      };

      let canister_id = switch (await _create_canister(tier_id, user, true)) {
        case (#err(_errMsg)) { return #err(_errMsg) };
        case (#ok(id)) { id };
      };
      return #ok(canister_id);

    } else {

      // Create canister and update user subscription
      // Validate user subscription limits
      let user_subscription_res = subscription_manager.get_subscription(user);
      switch (user_subscription_res) {
        case (#err(error)) {
          return #err(error);
        };
        case (#ok(subscription)) {
          let is_valid_subscription = await subscription_manager.validate_subscription(user);
          if (is_valid_subscription != true) {
            return #err(Errors.SubscriptionLimitReached());
          };

          try {
            let canister_id = switch (await _create_canister(subscription.tier_id, user, false)) {
              case (#err(_errMsg)) { return #err(_errMsg) };
              case (#ok(id)) { id };
            };
            return #ok(canister_id);
          } catch (error) {
            return #err(Error.message(error));
          };
        };
      };
    }

  };

  private func _convert_e8s_to_cycles(e8s : Nat64, max_slots : Nat) : async Types.Response<Nat> {
    let deposit_per_canister = Nat64.toNat(e8s) / max_slots;
    await calculateCyclesToAdd(deposit_per_canister);
  };

  private func _get_cycles_for_canister_init(tier_id : Nat, is_freemium : Bool) : async Types.Response<Int> {
    switch (is_freemium) {
      case (true) {
        return #ok(shareable_canister_manager.MIN_CYCLES_INIT);
      };
      case (false) {
        let min_deposit = subscription_manager.tiers_list[tier_id].min_deposit;
        let cyclesForCanister = await _convert_e8s_to_cycles(min_deposit.e8s, subscription_manager.tiers_list[tier_id].slots);
        return cyclesForCanister;
      };
    };
  };

  private func _create_canister(tier_id : Nat, controller : Principal, is_freemium : Bool) : async Types.Response<Principal> {
    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let wasm_module = switch (asset_canister_wasm) {
      case null { return #err(Errors.NotFoundWasm()) };
      case (?wasm) { wasm };
    };

    let controllers = switch (is_freemium) {
      case (false) {
        [Principal.fromActor(this), controller];
      };
      case (true) {
        [Principal.fromActor(this)];
      };
    };

    // Get cycles to add to fresh canister
    let cyclesForCanister : Int = switch (await _get_cycles_for_canister_init(tier_id, is_freemium)) {
      case (#err(err)) { return #err(err) };
      case (#ok(val)) { val };
    };

    // Ensure cycles amount is enough
    if (cyclesForCanister == 0) {
      return #err(Errors.InsufficientCycleAmount(Int.abs(cyclesForCanister), shareable_canister_manager.MIN_CYCLES_INIT_E8S));
    };

    ExperimentalCycles.add(Int.abs(cyclesForCanister));

    // Set controller
    let settings : IC.canister_settings = {
      controllers = ?controllers;
      compute_allocation = null;
      memory_allocation = null;
      freezing_threshold = null;
      reserved_cycles_limit = null;
      log_visibility = null;
      wasm_memory_limit = null;
      wasm_memory_threshold = null;
    };

    // Create new canister
    let create_result = await IC.create_canister({
      settings = ?settings;
      sender_canister_version = null;
    });

    let new_canister_id = create_result.canister_id;

    // Construct install code arguments
    let install_code_args : IC.install_code_args = {
      mode = #install;
      canister_id = new_canister_id;
      wasm_module = Blob.fromArray(wasm_module);
      arg = to_candid (());
      sender_canister_version = null;
    };

    // Install the asset canister code
    await IC.install_code(install_code_args);

    // After successful deployment, add to tracking
    Map.add(stable_deployed_canisters, Principal.compare, new_canister_id, true);

    await canisters.add_canister_deployment(controller, new_canister_id, is_freemium);

    // Count canister usage in user subscription
    let _pushCanisterId = await subscription_manager.push_canister_id(controller, new_canister_id); // Update subscription

    return #ok(new_canister_id);
  };

  private func _is_allowed_store_assets(canister_id : Principal, caller : Principal) : async Types.Response<Bool> {
    if (access_control.is_authorized(caller)) {
      return #ok(true);
    } else if (await _isController(canister_id, caller)) {
      return #ok(true);
    } else {
      // TODO: CHeck
      let slot : ?Types.ShareableCanister = switch (shareable_canister_manager.get_canister_by_user(caller)) {
        case (#err(msg)) { return #err(msg) };
        case (#ok(val)) { val };
      };

      switch (slot) {
        case (null) { return #ok(false) };
        case (?_slot) { return #ok(_slot.user == caller) };
      };
    };
    return #ok(false);
  };

  // TODO: Add counter for size
  /**
  * Store files in asset canister
  * @param canister_id - The ID of the asset canister to store the files in
  * @param files - The files to store in the asset canister
  * @returns A result indicating the success or failure of the operation
*/
  // TODO: Make private
  // TODO: Reject calls with canister_id being a shareable canister
  private func storeInAssetCanister(
    caller : Principal,
    project_id : Nat,
    files : [Types.StaticFile],
    workflow_run_details : ?Types.WorkflowRunDetails,
  ) : async Types.Response<Bool> {
    let canister_id = switch (_get_canister_id_by_project(project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(id)) { id };
    };

    // Ensure user can store assets
    let _is_allowed = switch (await _is_allowed_store_assets(canister_id, caller)) {
      case (#err(err)) { return #err(err) };
      case (#ok(val)) {
        if (not (val)) {
          return #err(Errors.Unauthorized());
        };
        val;
      };
    };

    let is_authorized = switch (_validate_project_access(caller, project_id)) {
      case (#err(_msg)) { return #err(_msg) };
      case (#ok(res)) { res };
    };

    canisters.update_deployment_status(canister_id, #installing); // Update canister deployment status to installing
    // stable_canister_table := canisters.canister_table; // Update stable storage

    let is_uploaded = switch (await canisters.handle_upload_file(canister_id, files, workflow_run_details)) {
      case (#err(err)) { return #err(err) };
      case (#ok(val)) {
        val;
      };
    };

    switch (workflow_run_details) {
      case null {
        var time = Utility.get_time_now(#milliseconds);
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
        let _updateHistory = await workflow_manager.update_workflow_run(project_id, workflow_details);
      };
      case (?workflow_run_details) {
        let _updateHistory = await workflow_manager.update_workflow_run(project_id, workflow_run_details);
      };
    };

    let _addControllerRespons = await _addController(canister_id, caller);
    return #ok(true);
  };

  private func validate_canister_cycles(canister_id : Principal) : async Types.Response<Nat> {
    // let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
    let cycles_balance : Nat = switch (await IC.canister_status({ canister_id = canister_id })) {
      case (val) {
        // Canister low on cycles
        let current_balance : Nat = if (val.cycles < shareable_canister_manager.MIN_CYCLES_INIT_E8S) {
          // Top up canister to maintain min required cycles on init
          let amount_added = await _add_cycles(canister_id, shareable_canister_manager.MIN_CYCLES_INIT_E8S);
          amount_added;
        } else {
          // Return current cycles balance
          val.cycles;
        };
        current_balance;
      };
    };
    return #ok(cycles_balance);
  };

  /** Handle canister upgrades */
  system func preupgrade() {};
  system func postupgrade() {
    init<system>(); // Bootstrap canister
    _recover_timers<system>(); // Recreate timers for active slot sessions
    _recover_global_timers<system>(); // Recreate timers for active register domain jobs
  };

  private func _recover_global_timers<system>() : () {
    for ((key, timer_id) in Map.entries(global_timers)) {
      schedule_register_domain(key, 5 * 60);
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
        _set_cleanup_timer<system>(remaining_duration_s, slot_id, slot.canister_id);
      } else {
        let _project_id = _end_freemium_session(slot_id, slot.user);
        _delete_timer(slot_id);
      };
    };
  };

  private func _get_timer_id(slot_id : Nat) : Types.Response<?Nat> {
    // switch (timers.get(slot_id)) {
    switch (Map.get(timers, Nat.compare, slot_id)) {
      case (null) { return #ok(null) };
      case (val) { #ok(val) };
    };

  };

  // Delete slot id to timer id reference from `timers` mapping
  // Pop out slot id from array of slot ids with active timers
  private func _delete_timer(slot_id : Nat) {
    // let _res = switch (timers.get(slot_id)) {
    let _res = switch (Map.get(timers, Nat.compare, slot_id)) {
      case (null) {
        0;
      };
      case (?_timer_id) {
        ignore Map.delete(timers, Nat.compare, slot_id); // Use slot_id as key, not timer_id
        0;
      };
    };

    let new_active_slot_timers : [Nat] = Array.filter(stable_slot_id_active_timer, func(slot : Nat) : Bool { slot != slot_id });

    stable_slot_id_active_timer := new_active_slot_timers;
  };

  private func _set_cleanup_timer<system>(duration : Nat, slot_id : Nat, canister_id : ?Principal) : () {
    let timer_id = Timer.setTimer<system>(
      #seconds duration,
      func() : async () {
        await cleanup_session(slot_id, canister_id);
      },
    );

    Map.add(timers, Nat.compare, slot_id, timer_id);
  };

  private func _clear_asset_canister(canister_id : Principal) : async Types.Response<()> {
    if (canister_id == Principal.fromActor(this)) {
      return #err(Errors.NotAllowedOperation());
    };
    let canister : Types.AssetCanister = actor (Principal.toText(canister_id));

    let deployment_status : Types.CanisterDeployment = switch (canisters.get_deployment_by_canister(canister_id)) {
      case (null) {
        let status = {
          canister_id = canister_id;
          status = #uninitialized;
          size = 0;
          date_created = Utility.get_time_now(#milliseconds);
          date_updated = Utility.get_time_now(#milliseconds);
        };
        status;
      };
      case (?val) { val };
    };

    let updated_deployment : Types.CanisterDeployment = {
      canister_id = deployment_status.canister_id;
      status = #uninitialized;
      size = 0;
      date_created = deployment_status.date_created;
      date_updated = Utility.get_time_now(#milliseconds);
    };

    // Restore the ic-domains file
    let asset : ?Types.AssetCanisterAsset = switch (await get_canister_asset(canister_id, "/.well-known/ic-domains")) {
      case (#err(err)) { null };
      case (#ok(val)) { val };
    };

    canisters.put_canister_table(canister_id, updated_deployment);

    // Clear the canister assets
    await canister.clear();

    if (asset != null) {
      let asset_file : Types.AssetCanisterAsset = switch (asset) {
        case (null) {
          return #err(Errors.UnexpectedError("setting ic-domains asset file."));
        };
        case (?val) { val };
      };

      // await canister.store
      let file : Types.StaticFile = {
        path = "/.well-known/ic-domains";
        content = asset_file.content;
        content_type = asset_file.content_type;
        content_encoding = ?asset_file.content_encoding;
        is_chunked = false;
        chunk_id = 0;
        batch_id = 0;
        is_last_chunk = true;
      };

      Debug.print("Found well-known/ic-domains file: " # debug_show (file));

      let is_set = switch (await edit_ic_domains(canister_id, file)) {
        case (#err(err)) return #err(err);
        case (#ok()) return #ok();
      };

    } else {
      Debug.print("Not found well-known/ic-domains file.");
    };
    return #ok();
  };

  private func cleanup_session(slot_id : Nat, canister_id : ?Principal) : async () {
    // This code runs after the specified duration
    // Clear asset canister files
    let _is_deleted = switch (canister_id) {
      case (null) { true };
      case (?val) {
        let is_cleared = switch (await _clear_asset_canister(val)) {
          case (#err(err)) {
            false;
          };
          case (#ok(_val)) {
            true;
          };
        };
        is_cleared;
      };
    };

    switch (shareable_canister_manager.get_canister_by_slot(slot_id)) {
      case (#err(err)) {};
      case (#ok(val)) {
        let res = _end_freemium_session(slot_id, val.user);
        switch (res) {
          case (#err(error)) {};
          case (#ok(?project_id)) {
            _delete_timer(slot_id);
          };
          case (#ok(null)) {
            _delete_timer(slot_id);
          };
        };
      };
    };

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

  // public query func transform({
  //   context : Blob;
  //   response : Types.HttpRequestResult;
  // }) : async Types.HttpRequestResult {
  //   {
  //     response with headers = []; // not intersted in the headers
  //   };
  // };

  // private func make_http_request(method : Types.HttpMethodArgs, url : Text, request_headers : [Types.HttpHeader]) : async Types.Response<Types.HttpResponse> {
  //   let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

  //   // Prepare HTTP req
  //   let http_request : Types.HttpRequestArgs = {
  //     url = url;
  //     max_response_bytes = null;
  //     headers = request_headers;
  //     body = null;
  //     method = #get;
  //     transform = ?{
  //       function = transform;
  //       context = Blob.fromArray([]);
  //     };
  //   };

  //   let http_response : Types.HttpRequestResult = await (with cycles = 230_949_972_000) IC.http_request(http_request);

  //   // Check if the HTTP request was successful
  //   if (http_response.status != 200) {
  //     return #err("HTTP request failed with status: " # Nat.toText(http_response.status));
  //   };

  //   // Check if we have a response body
  //   if (http_response.body.size() == 0) {
  //     return #err("Empty response body received");
  //   };

  //   let decoded_text : Text = switch (Text.decodeUtf8(http_response.body)) {
  //     case (null) { return #err("Failed to decode response body as UTF-8") };
  //     case (?y) {
  //       if (Text.size(y) == 0) {
  //         return #err("Empty decoded text");
  //       };
  //       y;
  //     };
  //   };

  //   return #ok({ response = http_response; body = decoded_text });
  // };

  // // private func make_http_post_request(url : Text, extraHeaders : [Types.HttpHeader], body : Text) : async Text {
  // //   let headers = Array.append(
  // //     extraHeaders,
  // //     [
  // //       { name = "User-Agent"; value = "caffeine.ai" },
  // //       { name = "Idempotency-Key"; value = "Time-" # Int.toText(Time.now()) },
  // //     ],
  // //   );
  // //   let requestBody = Text.encodeUtf8(body);

  // //   let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

  // //   let httpRequest : Types.HttpRequestArgs = {
  // //     url = url;
  // //     max_response_bytes = null;
  // //     headers;
  // //     body = ?requestBody;
  // //     method = #post;
  // //     transform = ?{
  // //       function = transform;
  // //       context = Blob.fromArray([]);
  // //     };
  // //     is_replicated = ?false;
  // //   };
  // //   let httpResponse = await (with cycles = 230_949_972_000) IC.http_request(httpRequest);
  // //   switch (Text.decodeUtf8(httpResponse.body)) {
  // //     case (null) { Debug.trap("empty HTTP response") };
  // //     case (?decodedResponse) { decodedResponse };
  // //   };
  // // };

  public shared ({ caller }) func edit_ic_domains(canister_id : Principal, new_ic_domains : Types.StaticFile) : async Types.Response<()> {
    if (not access_control.is_authorized(caller)) return #err(Errors.Unauthorized());

    return await domain.edit_ic_domains(canister_id, new_ic_domains);
  };

  /// Fetches the current ICP price from Coinbase API
  /// Returns the most recent candle data including timestamp, open, high, low, close, and volume
  /// The data represents 1-minute intervals from the Coinbase exchange
  public func get_icp_price() : async Types.Response<Float> {
    // Construct url
    let ONE_MINUTE : Nat64 = 60;
    let end_timestamp : Nat64 = Nat64.fromNat(Int.abs(Utility.get_time_now(#seconds)));
    let start_timestamp : Nat64 = end_timestamp - ONE_MINUTE - ONE_MINUTE;
    let host : Text = "api.exchange.coinbase.com";
    let url = "https://" # host # "/products/ICP-USD/candles?start=" # Nat64.toText(start_timestamp) # "&end=" # Nat64.toText(end_timestamp) # "&granularity=" # Nat64.toText(ONE_MINUTE);

    // Prepare headers
    let request_headers = [
      { name = "User-Agent"; value = "price-feed" },
    ];

    // Await response
    let res : Types.HttpResponse = switch (await Outcall.make_http_request(#get, url, request_headers, null, transform)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    Debug.print("HTTP Status: " # Nat.toText(res.response.status));
    Debug.print("Response Headers: " # debug_show (res.response.headers));
    Debug.print("Response Body Size: " # Nat.toText(res.response.body.size()));
    Debug.print("Decoded Text Length: " # Nat.toText(Text.size(res.body)));

    // Parse Candle data
    let candle_data : Types.CandleData = switch (Parsing.parse_coinbase_price_response(res.body)) {
      case (#err(err)) { return #err(err) };
      case (#ok(val)) { val };
    };
    Debug.print("ICP PRICE RESPONSE:" # debug_show (candle_data));

    // Return the open price
    #ok(candle_data.open);
  };

  /*
   *
   * START DNS RECORD METHODS
   *
   */

  // // List DNS records for a zone
  public shared (msg) func listDnsRecords(zone_id : Text) : async Types.Response<[Types.DnsRecord]> {
    return await domain.list_dns_records(zone_id, transform, cloudflare);
  };

  public shared (msg) func set_cloudflare_credentials(email : Text, api_key : Text) : async Types.Response<()> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    CLOUDFLARE_EMAIL := ?email;
    CLOUDFLARE_API_KEY := ?api_key;
    return cloudflare.set_cloudflare_credentials(email, api_key);
  };

  public shared (msg) func set_cloudflare_zone_id(zone_id : Text) : async Types.Response<()> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    CLOUDFLARE_ZONE_ID := ?zone_id;
    return #ok(cloudflare.set_zone_id(zone_id));
  };

  public query (msg) func get_cloudflare_credentials() : async Types.Response<{ email : ?Text; api_key : ?Text }> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return cloudflare.get_cloudflare_credentials();
  };

  public query (msg) func get_records_for_canister(canister_id : Principal) : async Types.Response<[Types.CreateRecordResponse]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return domain.get_records_for_canister(canister_id);
  };

  public query (msg) func get_records() : async Types.Response<[(Types.DnsRecordId, Types.CreateRecordResponse)]> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return #ok(domain.get_all_records());
  };

  public shared (msg) func delete_records() : async Types.Response<()> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return #ok(domain.delete_records());
  };

  public shared (msg) func delete_canister_records_map() : async Types.Response<()> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return #ok(domain.delete_canister_to_records_map());
  };

  // // Create a new DNS record
  public shared (msg) func create_dns_record(payload : Types.CreateDnsRecordPayload) : async Types.Response<Types.DnsRecord> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    return await domain.create_dns_record(payload, transform, cloudflare);
  };

  public shared (msg) func create_dns_records_for_canister(payload : Types.CreateCanisterDNSRecordsPayload) : async Types.Response<Types.DomainRegistration> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };
    return await domain.create_dns_records_for_canister(cloudflare.get_zone_id(), payload, transform, cloudflare);
  };

  public shared (msg) func setup_custom_domain(canister_id : Principal, subdomain_name : Text) : async Types.Response<Types.DomainRegistration> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let payload : Types.CreateCanisterDNSRecordsPayload = {
      domain_name = "worldcloud.app";
      subdomain_name = subdomain_name;
      user_principal = Principal.fromActor(this);
      canister_id = canister_id;
    };

    // Create TXT and CNAME records for linking canister to custom subdomain
    let res : Types.DomainRegistration = switch (await domain.create_dns_records_for_canister(cloudflare.get_zone_id(), payload, transform, cloudflare)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    schedule_register_domain(subdomain_name, 3 * 60);

    return #ok(res);
  };

  private func _delete_global_timer(id : Text) {
    // let _res = switch (timers.get(slot_id)) {
    let _res = switch (Map.get(global_timers, Text.compare, id)) {
      case (null) {
        0;
      };
      case (?_timer_id) {
        ignore Map.delete(global_timers, Text.compare, id);
        0;
      };
    };

    let new_active_global_timers : [Text] = Array.filter(active_global_timers, func(_id : Text) : Bool { _id != id });

    active_global_timers := new_active_global_timers;
  };

  private func schedule_register_domain<system>(subdomain_name : Text, duration_seconds : Nat) : () {
    let timer_id = Timer.setTimer<system>(
      #seconds duration_seconds,
      func<system>() : async () {
        Debug.print("[schedule_register_domain] triggered register domain job for domain: " # subdomain_name # ".");
        let register_domain_request_id = switch (await domain.register_domain(subdomain_name # ".worldcloud.app", transform)) {
          case (#err(err)) {
            Debug.print("[schedule_register_domain] Error registering domain with IC: " # err);
            // Delete reference for current timer
            _delete_global_timer(subdomain_name);

            // Schedule another registration later
            schedule_register_domain(subdomain_name, duration_seconds);
            Debug.print("Scheduled new timer. Triggering in " # Nat.toText(duration_seconds) # " seconds");
            return;
          };
          case (#ok(val)) {
            Debug.print("[schedule_register_domain] Successfully triggered register domain: " # val);
            _delete_global_timer(subdomain_name);
            val;
          };
        };
      },
    );

    Debug.print("Scheduled register domain job for domain: " # subdomain_name # ". Triggering in " # Nat.toText(duration_seconds) # " seconds.");
    Map.add(global_timers, Text.compare, "domain-ic-registration--" # subdomain_name, timer_id);
    return;
  };

  /// Get project canister's domain registration
  public shared (msg) func get_domain_registrations_by_canister(project_id : Types.ProjectId) : async Types.Response<[Types.DomainRegistration]> {
    let _is_authorized = switch (_validate_project_access(msg.caller, project_id)) {
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

    return domain.get_domain_registrations(canister_id);
  };

  public shared (msg) func get_domain_registration_status(registration_id : Text) : async Types.Response<Bool> {
    return await domain.get_domain_registration_by_id(registration_id, transform);
  };

  public shared (msg) func register_domain(subdomain_name : Text) : async Types.Response<Types.DomainRegistrationId> {
    if (not access_control.is_authorized(msg.caller)) {
      return #err(Errors.Unauthorized());
    };

    let register_domain_request_id = switch (await domain.register_domain(subdomain_name # ".worldcloud.app", transform)) {
      case (#err(err)) return #err(err);
      case (#ok(val)) val;
    };

    return #ok(register_domain_request_id);
  }

  // // Update an existing DNS record
  // public shared (msg) func update_dns_record(zone_id : Text, record_id : Text, record : Types.DnsRecord) : async Types.Response<Types.DnsRecord> {
  //   if (not access_control.is_authorized(msg.caller)) {
  //     return #err(Errors.Unauthorized());
  //   };

  //   return await Domain.update_dns_record(zone_id, record_id, record, cloudflare);
  // };

  // // Delete a DNS record
  // public shared (msg) func delete_dns_record(zone_id : Text, record_id : Text) : async Types.Response<Bool> {
  //   if (not access_control.is_authorized(msg.caller)) {
  //     return #err(Errors.Unauthorized());
  //   };

  //   return await Domain.delete_dns_record(zone_id, record_id, cloudflare);
  // };

  // // Get a specific DNS record
  // public shared (msg) func get_dns_record(zone_id : Text, record_id : Text) : async Types.Response<Types.DnsRecord> {
  //   if (not access_control.is_authorized(msg.caller)) {
  //     return #err(Errors.Unauthorized());
  //   };

  //   return await Domain.get_dns_record(zone_id, record_id, cloudflare);
  // };

  // // Get DNS zones (domains)
  // public shared (msg) func getDnsZones() : async Types.Response<[Types.DnsZone]> {
  //   if (not access_control.is_authorized(msg.caller)) {
  //     return #err(Errors.Unauthorized());
  //   };

  //   return await Domain.get_dns_zones(cloudflare);
  // };

  // /*
  //  *
  //  * END DNS RECORD METHODS
  //  *
  //  */

};
