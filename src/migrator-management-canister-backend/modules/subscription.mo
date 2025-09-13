import Types "../types";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Book "../book";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Int "mo:base/Int";
import Errors "../modules/errors";
import Utility "../utils/Utility";
import Map "mo:core/Map";
import { tiers; addons } "addons";

module {
  public class SubscriptionManager(
    book : Book.Book,
    ledger : Principal,
    subscriptionsInit : Map.Map<Principal, Types.Subscription>,
    treasury_account_init : ?Principal,
    project_to_addons_map_init : Types.ProjectAddonsMap,
    add_ons_map_init : Types.AddonsMap,
  ) {
    // class references
    private var domain_manager : ?Types.DomainInterface = null;
    private var project_manager : ?Types.ProjectInterface = null;
    public var index_counter_manager : ?Types.IndexCounterInterface = null;

    public var initialized = false;

    // Variables
    private var icp_fee : Nat = 10_000;
    public var treasury : ?Principal = treasury_account_init; // Receiver of payments
    public var subscriptions = subscriptionsInit;
    public var add_ons_map = add_ons_map_init;
    public var project_addons = project_to_addons_map_init;
    public var DNS_ADD_ON_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    public var tiers_list : Types.TiersList = tiers;
    public var addons_list : [Types.AddOnVariant] = addons;

    public func init(
      domain_manager_init : Types.DomainInterface,
      project_manager_init : Types.ProjectInterface,
      index_counter_init : Types.IndexCounterInterface,
    ) {
      domain_manager := ?domain_manager_init;
      project_manager := ?project_manager_init;
      index_counter_manager := ?index_counter_init;

      initialized := true;
    };

    public func set_treasury(new_treasury : Principal) : () {
      treasury := ?new_treasury;
    };

    public func get_treasury() : ?Principal {
      return treasury;
    };

    public func get_tier(tier_id : Nat) : Types.Response<Types.Tier> {
      if (tier_id >= tiers_list.size()) return #err(Errors.InvalidInput("Tier id does not exist"));
      return #ok(tiers_list[tier_id]);
    };

    public func get_tier_id_freemium() : Types.Response<Nat> {
      var i = 0;
      let n = tiers_list.size();
      // Use a while loop for early exit
      while (i < n) {
        if (tiers_list[i].name == "Freemium") {
          return #ok(tiers_list[i].id);
        };
        i += 1;
      };
      // If not found, throw error
      return #err(Errors.NotFoundTier());
    };

    // TODO: Admin function
    public func get_all_subscriptions() : [(Principal, Types.Subscription)] {
      return Iter.toArray(Map.entries(subscriptions));
    };

    public func get_subscription(caller : Principal) : Types.Response<Types.Subscription> {
      //   switch (subscriptions.get(caller)) {
      switch (Map.get(subscriptions, Principal.compare, caller)) {
        case (null) { return #err(Errors.SubscriptionNotFound()) };
        case (?sub) { return #ok(sub) };
      };
    };

    private func _get_subscription(caller : Principal) : ?Types.Subscription {
      //   switch (subscriptions.get(caller)) {
      switch (Map.get(subscriptions, Principal.compare, caller)) {
        case (null) { return null };
        case (?sub) { return ?sub };
      };
    };

    public func get_add_ons_by_project(project_id : Nat) : [Types.AddOnService] {
      let add_on_ids : [Types.AddOnId] = switch (Map.get(project_addons, Nat.compare, project_id)) {
        case (null) [];
        case (?val) val;
      };

      var add_ons : [Types.AddOnService] = [];
      for (id in add_on_ids.vals()) {
        let _addon : ?Types.AddOnService = switch (Map.get(add_ons_map, Nat.compare, id)) {
          case (null) { null };
          case (?val) {
            let _new_array : [Types.AddOnService] = Array.append(add_ons, [val]);
            add_ons := _new_array;
            ?val;
          };
        };
      };

      return add_ons;
    };

    public func get_add_on_by_id(project_id : Types.ProjectId, add_on_id : Types.AddOnId) : Types.Response<Types.AddOnService> {
      let add_ons : [Types.AddOnService] = get_add_ons_by_project(project_id);
      let add_on : Types.AddOnService = switch (Array.find(add_ons, func(addon : Types.AddOnService) : Bool { add_on_id == addon.id })) {
        case (null) return #err(Errors.NotFound("add-on with id " # Nat.toText(add_on_id)));
        case (?val) val;
      };

      return #ok(add_on);
    };

    public func get_my_addons_by_project(project_id : Types.ProjectId) : Types.Response<Types.MyAddons> {
      let _domain_manager : Types.DomainInterface = switch (domain_manager) {
        case (null) return #err(Errors.NotFoundClass("Domain manager"));
        case (?val) val;
      };

      let addons : [Types.AddOnService] = get_add_ons_by_project(project_id);
      var domain_addons : [Types.MyAddon<Types.DomainRegistration>] = [];
      for (addon in addons.vals()) {
        let _resource_id = switch (addon.type_) {
          // Handle domain resources
          case (#register_subdomain or #register_domain) {
            let resource_id : Nat = switch (addon.attached_resource_id) {
              case (null) return #err(Errors.NotAttachedResourceId());
              case (?val) val;
            };
            let resource : ?Types.DomainRegistration = switch (_domain_manager.get_domain_registration_by_id(resource_id)) {
              case (null) {
                null;
              };
              case (val) val;
            };

            let _resource = switch (resource) {
              case (null) {
                return #err(Errors.NotFound("Domain registration with id " # Nat.toText(resource_id)));
              };
              case (?val) { val };
            };

            let my_addon : Types.MyAddon<Types.DomainRegistration> = {
              addon = addon;
              resource = _resource;
            };

            let new_array_domain_reg : [Types.MyAddon<Types.DomainRegistration>] = Array.append(domain_addons, [my_addon]);
            domain_addons := new_array_domain_reg;
            _resource.id;
          };

          case (_) {
            Debug.print("Unsupported addon type: " # debug_show (addon.type_));
            return #err(Errors.UnsupportedAction("Addon type " # debug_show (addon.type_)));
          };
        };
      };

      let my_addons : Types.MyAddons = {
        domain_addons = domain_addons;
      };

      return #ok(my_addons);
    };

    public func find_add_on_variant(add_on_id : Types.AddOnId) : ?Types.AddOnVariant {
      return Array.find(addons, func(addon : Types.AddOnVariant) : Bool { addon.id == add_on_id });
    };

    public func find_add_on_by_id(project_id : Types.ProjectId, id : Types.AddOnId) : ?Types.AddOnService {
      let add_ons : [Types.AddOnService] = get_add_ons_by_project(project_id);

      if (add_ons.size() == 0) return null;

      let match : Types.AddOnService = switch (Array.find(add_ons, func(a : Types.AddOnService) : Bool { a.id == id })) {
        case (null) return null;
        case (?val) val;
      };
      return ?match;
    };

    public func has_add_on(project_id : Types.ProjectId, add_on_id : Types.AddOnId) : Types.HasAddonResult {
      let add_ons = get_add_ons_by_project(project_id);
      let existing_add_ons : [Types.AddOnService] = Array.filter<Types.AddOnService>(
        add_ons,
        func(add_on : Types.AddOnService) : Bool {
          return add_on.id == add_on_id;
        },
      );

      let result = {
        has_add_on = existing_add_ons.size() > 0;
        add_ons = add_ons;
      };
      return result;
    };

    private func has_enough_credits_subscription(caller : Principal, tier_id : Nat) : Types.Response<Types.EnoughCreditsResult> {
      // Get pricing list
      // let tier : Types.Tier = tiers_list[tier_id];
      let tier : Types.Tier = switch (get_tier(tier_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Get user's ICP balance
      let deposited_icp = book.fetchUserIcpBalance(caller, ledger);

      // Get total cost
      let total_cost = Nat64.toNat(tier.min_deposit.e8s + tier.price.e8s);

      // Validate user has enough ICP balance
      if (deposited_icp < total_cost) {
        return #ok({
          status = false;
          need = total_cost;
          available = deposited_icp;
        });
      };

      return #ok({ status = true; need = total_cost; available = deposited_icp });
    };

    private func has_enough_credits_add_on(caller : Principal, add_on_id : Types.AddOnId) : Types.Response<Types.EnoughCreditsResult> {
      let matching : [Types.AddOnVariant] = Array.filter(addons_list, func(addon : Types.AddOnVariant) : Bool { addon.id == add_on_id });

      if (matching.size() == 0) return #err(Errors.NotFound("add-on id"));

      let addon : Types.AddOnVariant = matching[0];

      // Get user's ICP balance
      let deposited_icp = book.fetchUserIcpBalance(caller, ledger);

      // Validate user has enough ICP balance
      if (deposited_icp < addon.price) {
        return #ok({
          status = false;
          need = addon.price;
          available = deposited_icp;
        });
      };

      return #ok({
        status = true;
        need = addon.price;
        available = deposited_icp;
      });
    };

    public func subscribe_add_on(
      caller : Principal,
      project_id : Types.ProjectId,
      addon_variant_id : Types.AddOnId,
    ) : Types.Response<[Types.AddOnService]> {

      // Validate treasury principal
      let payment_receiver : Principal = switch (treasury) {
        case (null) { return #err(Errors.TreasuryNotSet()) };
        case (?val) { val };
      };

      let _index_counter = switch (index_counter_manager) {
        case (null) return #err(Errors.NotFoundClass("Index counter"));
        case (?val) val;
      };

      let _domain_manager = switch (domain_manager) {
        case (null) return #err(Errors.NotFoundClass("Domain manager"));
        case (?val) val;
      };

      let validate_result : Types.ValidateSubscribeAddonResult = switch (validate_subscribe_addon(caller, addon_variant_id, project_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Deduct payment from caller's balance
      let _success = switch (book.process_payment(caller, payment_receiver, ledger, validate_result.has_credits_result.need)) {
        case (false) return #err(Errors.PaymentProcessingFailure());
        case (true) true;
      };

      return _create_addon(validate_result.add_on.type_, validate_result.canister_id, project_id, validate_result.add_on.id, validate_result.expiry);
    };

    private func _create_addon(
      addon_type : Types.AddOnServiceType,
      canister_id : Principal,
      project_id : Types.ProjectId,
      addon_variant_id : Nat,
      expiry_ms : Nat,
    ) : Types.Response<[Types.AddOnService]> {
      let _domain_manager = switch (domain_manager) {
        case (null) return #err(Errors.NotFoundClass("Domain manager"));
        case (?val) val;
      };

      let _index_counter = switch (index_counter_manager) {
        case (null) return #err(Errors.NotFoundClass("Index counter"));
        case (?val) val;
      };

      let now = Int.abs(Utility.get_time_now(#milliseconds));

      // Get id for new add on
      let new_add_on_id : Nat = _index_counter.get_index(#addon_id);

      // Get resource id to attach to add on
      let resource_id : Nat = switch (addon_type) {
        case (#register_subdomain) {
          let _new_domain_registration : Types.DomainRegistration = switch (_domain_manager.initialize_domain_registration(canister_id, addon_variant_id)) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };

          _new_domain_registration.id;
        };
        case (#register_domain) {
          return #err(Errors.NotAvailableService());
        };
      };

      // Create add-on for project using new id and attached resource id
      let new_add_on : Types.AddOnService = {
        id = new_add_on_id;
        attached_resource_id = ?resource_id;
        variant_id = addon_variant_id;
        initialized = false;
        status = #available;
        type_ = addon_type;
        created_on = now;
        updated_on = now;
        expires_at = ?expiry_ms;
      };

      let existing_addon_ids : [Types.AddOnId] = switch (Map.get(project_addons, Nat.compare, project_id)) {
        case (null) [];
        case (?val) val;
      };

      // Add new addon to project's add on list
      let new_add_on_ids : [Types.AddOnId] = Array.append(existing_addon_ids, [new_add_on.id]);
      let next_addons_id = _index_counter.increment_index(#addon_id);

      Map.add(project_addons, Nat.compare, project_id, new_add_on_ids);
      Map.add(add_ons_map, Nat.compare, new_add_on_id, new_add_on);

      let new_add_ons : [Types.AddOnService] = get_add_ons_by_project(project_id);
      return #ok(new_add_ons);
    };

    /// Validate subscription before creating it
    private func validate_subscribe_addon(caller : Principal, add_on_id : Types.AddOnId, project_id : Types.ProjectId) : Types.Response<Types.ValidateSubscribeAddonResult> {
      let _project_manager = switch (project_manager) {
        case (null) return #err(Errors.NotFoundClass("Project manager"));
        case (?val) val;
      };

      let _index_counter = switch (index_counter_manager) {
        case (null) return #err(Errors.NotFoundClass("Index counter"));
        case (?val) val;
      };

      // Ensure user has paid the total cost for the add on
      let has_credits_result : Types.EnoughCreditsResult = switch (has_enough_credits_add_on(caller, add_on_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Get project
      let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Prevent freemium project access
      if (project.plan == #freemium) return #err(Errors.PremiumFeature());
      let canister_id : Principal = switch (project.canister_id) {
        case (null) return #err(Errors.NotFoundCanister());
        case (?val) val;
      };

      // Ensure project doesn't have the requested add on
      let add_on_exists : Types.HasAddonResult = has_add_on(project_id, add_on_id);

      // Reject duplicate add on subscription
      if (add_on_exists.has_add_on) {
        return #err(Errors.AddOnExists(add_on_id));
      };

      // Find the requested add-on details
      let add_on : Types.AddOnVariant = switch (find_add_on_variant(add_on_id)) {
        case (null) return #err(Errors.NotFound("add-on id " # Nat.toText(add_on_id)));
        case (?val) val;
      };

      let now = Int.abs(Utility.get_time_now(#milliseconds));

      // Get expiry time for add-on
      let expiry = Utility.calculate_expiry_timestamp(add_on.expiry, add_on.expiry_duration);

      return #ok({
        expiry;
        add_on;
        project;
        has_credits_result;
        canister_id;
        now;
      });
    };

    public func update_addon_resource_id(addon_id : Types.AddOnId, new_resouce_id : Types.DomainRegistrationId) : Types.Response<()> {
      let addon : Types.AddOnService = switch (Map.get(add_ons_map, Nat.compare, addon_id)) {
        case (null) return #err(Errors.NotFound("Add-on with id " # Nat.toText(addon_id)));
        case (?val) val;
      };

      let updated_addon : Types.AddOnService = {
        addon with attached_resource_id = ?new_resouce_id;
      };

      Map.add(add_ons_map, Nat.compare, addon_id, updated_addon);
      return #ok();
    };
    public func update_add_on(project_id : Types.ProjectId, updated_addon : Types.AddOnService) : Types.Response<[Types.AddOnService]> {
      Map.add(add_ons_map, Nat.compare, updated_addon.id, updated_addon);

      let new_addons : [Types.AddOnService] = get_add_ons_by_project(project_id);
      return #ok(new_addons);
    };

    private func _create_subscription(caller : Principal, tier_id : Nat, subscription : Types.Subscription, payment_receiver : Principal) : async Types.Response<Types.Subscription> {
      // Bypass payment for freemium tier
      if (tier_id == 3) {
        Map.add(subscriptions, Principal.compare, caller, subscription);
        return #ok(subscription);
      };

      // Get pricing list
      // let tier : Types.Tier = tiers_list[tier_id];
      let tier : Types.Tier = switch (get_tier(tier_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Get user's ICP balance
      let deposited_icp = book.fetchUserIcpBalance(caller, ledger);

      // Get total cost
      let total_cost = Nat64.toNat(tier.min_deposit.e8s + tier.price.e8s);

      // Validate user has enough ICP balance
      if (deposited_icp < total_cost) {
        return #err(Errors.InsufficientFunds());
      };

      // Deduct payment from caller's balance
      let success = book.process_payment(caller, payment_receiver, ledger, total_cost);
      if (success) {
        add_subscription(caller, subscription);
        // Map.add(subscriptions, Principal.compare, caller, subscription);
        return #ok(subscription);
      } else {
        return #err(Errors.PaymentProcessingFailure());
      };
    };

    public func grant_addon(
      project_id : Types.ProjectId,
      addon_id : Types.AddOnId,
      expiry_in_ms : Nat,
    ) : async Types.Response<[Types.AddOnService]> {
      let _project_manager = switch (project_manager) {
        case (null) return #err(Errors.NotFoundClass("Project manager"));
        case (?val) val;
      };

      let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Prevent freemium project access
      if (project.plan == #freemium) return #err(Errors.PremiumFeature());
      let canister_id : Principal = switch (project.canister_id) {
        case (null) return #err(Errors.NotFoundCanister());
        case (?val) val;
      };

      // Find the requested add-on details
      let add_on : Types.AddOnVariant = switch (find_add_on_variant(addon_id)) {
        case (null) return #err(Errors.NotFound("add-on id " # Nat.toText(addon_id)));
        case (?val) val;
      };

      return _create_addon(add_on.type_, canister_id, project_id, add_on.id, expiry_in_ms);

    };

    public func grant_subscription(user_principal : Principal, tier_id : Nat) : async Types.Response<Types.Subscription> {
      // // Get pricing list
      // let tier : Types.Tier = tiers_list[tier_id];
      let tier : Types.Tier = switch (get_tier(tier_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      let subscription : Types.Subscription = switch (_get_subscription(user_principal)) {
        case (null) {
          {
            user_id = user_principal;
            tier_id = tier_id;
            max_slots = tier.slots;
            used_slots = 0;
            canisters = [];
            free_canisters = [];
            date_created = Utility.get_time_now(#milliseconds);
            date_updated = Utility.get_time_now(#milliseconds);
          };
        };
        case (?val) {
          // TODO: Handle downgrading and remove excess canisters to free
          {
            val with tier_id = tier_id;
            used_slots = val.used_slots;
            max_slots = tier.slots;
            date_updated = Utility.get_time_now(#milliseconds);
          };
        };
      };

      // Apply changes
      add_subscription(user_principal, subscription);
      return #ok(subscription);
    };

    public func create_subscription(caller : Principal, tier_id : Nat) : async Types.Response<Types.Subscription> {
      // Validate treasury principal
      let payment_receiver : Principal = switch (treasury) {
        case (null) { return #err(Errors.TreasuryNotSet()) };
        case (?val) { val };
      };

      if (tier_id >= tiers_list.size()) {
        return #err(Errors.InvalidTier());
      };

      // // Get pricing list
      // let tier : Types.Tier = tiers_list[tier_id];
      let tier : Types.Tier = switch (get_tier(tier_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Prevent duplicate subscription
      let get_subscription_response = _get_subscription(caller);
      let create_response = switch (get_subscription_response) {
        case (null) {
          let subscription : Types.Subscription = {
            user_id = caller;
            tier_id = tier_id;
            max_slots = tier.slots;
            used_slots = 0;
            canisters = [];
            free_canisters = [];
            date_created = Utility.get_time_now(#milliseconds);
            date_updated = Utility.get_time_now(#milliseconds);
          };

          // subscription;
          await _create_subscription(caller, tier_id, subscription, payment_receiver);
        };
        case (?sub) {

          // Allow upgrade/downgrade only
          if (sub.tier_id == tier_id) {
            return #err(Errors.SubscriptionAlreadyExists());
          };

          let subscription : Types.Subscription = {
            user_id = sub.user_id;
            tier_id = tier_id;
            max_slots = tier.slots;
            used_slots = sub.used_slots;
            canisters = sub.canisters;
            free_canisters = sub.free_canisters;
            date_created = Utility.get_time_now(#milliseconds);
            date_updated = Utility.get_time_now(#milliseconds);
          };

          await _create_subscription(caller, tier_id, subscription, payment_receiver);
        };
      };

      return create_response;
    };

    private func increment_used_slots(sub : Types.Subscription) : Types.Response<Types.Subscription> {
      if (not _validate_increment_slots(sub)) return #err(Errors.MaxSlotsReached());
      let updated_sub : Types.Subscription = {
        sub with used_slots = sub.used_slots + 1
      };

      return #ok(updated_sub);
    };

    public func validate_increment_slots_by_user(user : Principal) : Bool {
      let sub : Types.Subscription = switch (get_subscription(user)) {
        case (#err(_)) return false;
        case (#ok(sub)) sub;
      };

      return _validate_increment_slots(sub);
    };

    private func _validate_increment_slots(sub : Types.Subscription) : Bool {
      if (sub.used_slots + 1 > sub.max_slots) return false;
      return true;
    };

    public func push_canister_id(caller : Principal, canister_id : Principal) : async Types.Response<Bool> {
      let subscription = get_subscription(caller);
      switch (subscription) {
        case (#err(_)) { return #ok(false) };
        case (#ok(sub)) {
          let updated_sub = {
            sub with canisters = Array.append(sub.canisters, [canister_id]);
          };

          let updated_used_slots : Types.Subscription = switch (increment_used_slots(updated_sub)) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };

          //   subscriptions.put(caller, { sub with canisters = Array.append(sub.canisters, [canister_id]) });
          Map.add(subscriptions, Principal.compare, caller, updated_used_slots);
          return #ok(true);
        };
      };
    };

    // Decrements the usage count, and pushes the canister to unused array
    public func update_sub_delete_project(caller : Principal, canister_id : Principal) : async Types.Response<()> {
      let subscription : Types.Subscription = switch (get_subscription(caller)) {
        case (#err(_msg)) { return #err(_msg) };
        case (#ok(sub)) {
          sub;
        };
      };

      // Remove project canister from used array
      let updated_used_canisters : [Principal] = Array.filter(subscription.canisters, func(c : Principal) : Bool { c == canister_id });

      // Update free canisters
      let updated_free_canisters = Array.append(subscription.free_canisters, [canister_id]);

      // Decrement used slots count
      let updated_used_slot_count : Nat = switch (subscription.used_slots == 0) {
        case (true) { 0 };
        case (false) { subscription.used_slots - 1 };
      };

      // Update subscription records
      let updated_subscription : Types.Subscription = {
        user_id = subscription.user_id;
        tier_id = subscription.tier_id;
        canisters = updated_used_canisters;
        free_canisters = updated_free_canisters;
        used_slots = updated_used_slot_count;
        max_slots = subscription.max_slots;
        date_created = subscription.date_created;
        date_updated = Utility.get_time_now(#milliseconds);
      };

      //   subscriptions.put(caller, updated_subscription);
      Map.add(subscriptions, Principal.compare, caller, updated_subscription);
      return #ok();
    };

    public func validate_subscription(caller : Principal) : async Bool {
      let subscription = get_subscription(caller);
      switch (subscription) {
        case (#err(_)) { return false };
        case (#ok(sub)) {
          let tier = tiers_list[sub.tier_id];
          if (sub.canisters.size() >= tier.slots) {
            return false;
          };
          return true;
        };
      };
    };

    private func add_subscription(caller : Principal, subscription : Types.Subscription) : () {
      Map.add(subscriptions, Principal.compare, caller, subscription);
    };

  };
};
