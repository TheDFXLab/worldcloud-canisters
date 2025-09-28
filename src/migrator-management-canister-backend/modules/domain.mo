import Types "../types";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Map "mo:core/Map";
import Cloudflare "cloudflare";
import Errors "errors";
import Outcall "outcall";
import Parsing "../utils/Parsing";
import Utility "../utils/Utility";
import Access "access";

module {
  public class Domain(
    records_map_init : Types.CloudflareRecordsMap,
    canister_to_records_init : Types.CanisterToRecordMap,
    canister_to_domain_registration_init : Types.CanisterToDomainRegistration,
    domain_registration_init : Types.DomainRegistrationMap,
    subdomains_init : Types.SubdomainsMap,
    freemium_registration_init : Types.FreemiumDomainRegistrationMap,
    canister_to_freemium_domain_registration_init : Types.CanisterToDomainRegistration,
  ) {
    // Class References
    public var class_references : ?Types.ClassesInterface = null;
    // public var project_manager : ?Types.ProjectInterface = null;
    // public var subscription_manager : ?Types.SubscriptionInterface = null;
    // public var cloudflare_manager : ?Types.Cloudflare = null;
    // public var index_counter_manager : ?Types.IndexCounterInterface = null;

    public var records : Types.CloudflareRecordsMap = records_map_init;
    public var canister_to_records : Types.CanisterToRecordMap = canister_to_records_init;
    public var canister_to_domain_registration : Types.CanisterToDomainRegistration = canister_to_domain_registration_init;
    public var canister_to_freemium_domain_registration : Types.CanisterToDomainRegistration = canister_to_freemium_domain_registration_init;
    public var domain_registration : Types.DomainRegistrationMap = domain_registration_init;
    public var used_subdomains : Types.SubdomainsMap = subdomains_init;
    public var freemium_domain_registration : Types.FreemiumDomainRegistrationMap = freemium_registration_init;
    public var initialized = false;
    public var cooldown_ic_registration = 1 * 60;

    public func init(
      classes_reference_init : Types.ClassesInterface
    ) {
      class_references := ?classes_reference_init;
    };

    // List DNS records for a zone
    public func list_dns_records(zone_id : Text, transform : Types.Transform) : async Types.Response<[Types.DnsRecord]> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _cloudflare_manager = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare manager"));
        case (?val) val;
      };
      return await _cloudflare_manager.list_dns_records(zone_id, transform);
    };

    public func get_all_records() : [(Types.DnsRecordId, Types.CreateRecordResponse)] {
      return Iter.toArray(Map.entries(records));
    };

    public func get_all_registrations() : [(Types.DomainRegistrationId, Types.DomainRegistration)] {
      return Iter.toArray(Map.entries(domain_registration));
    };

    public func get_domain_registration_by_id(registration_id : Types.DomainRegistrationId) : ?Types.DomainRegistration {
      Map.get(domain_registration, Nat.compare, registration_id);
    };

    public func delete_records() : () {
      records := Map.empty<Types.DnsRecordId, Types.CreateRecordResponse>();
    };

    public func delete_canister_to_records_map() : () {
      canister_to_records := Map.empty<Principal, [Types.DnsRecordId]>();
    };

    public func is_available_subdomain(project_id : Types.ProjectId, subdomain_name : Text, addon_id : Types.AddOnId) : Types.Response<Bool> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager = switch (_classes.subscription_manager) {
        case (null) return #ok(false);
        case (?val) val;
      };

      let _project_manager = switch (_classes.project_manager) {
        case (null) return #ok(false);
        case (?val) val;
      };

      // Check if subdomain is occupied
      switch (Map.get(used_subdomains, Text.compare, subdomain_name)) {
        // No mapping for subdomain, its available
        case (null) return #ok(true);
        // Canister id associated with subdomain
        case (?canister_id) {
          let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };

          let project_canister_id : Principal = switch (project.canister_id) {
            case (null) return #ok(false);
            case (?val) val;
          };

          if (project_canister_id == canister_id) {
            return #ok(true);
          } else return #ok(false);
        };
        case (_) {

          let addon : Types.AddOnService = switch (_subscription_manager.get_add_on_by_id(project_id, addon_id)) {
            case (#err(err)) return #ok(false);
            case (#ok(val)) val;
          };

          let resource_id : Nat = switch (addon.attached_resource_id) {
            case (null) return #ok(false);
            case (?val) val;
          };

          let domain_registration = switch (get_domain_registration_by_id(resource_id)) {
            case (null) return #ok(false);
            case (?val) val;
          };

          if (domain_registration.ic_registration.subdomain == subdomain_name) return #ok(true);
          return #ok(false);
        };
      };
    };

    private func get_subdomain_record(subdomain_name : Text) : ?Principal {
      Debug.print("Subdomain: checking " # subdomain_name);
      Map.get(used_subdomains, Text.compare, subdomain_name);
    };

    public func get_records_for_canister(canister_id : Principal) : Types.Response<[Types.CreateRecordResponse]> {
      let record_ids : [Types.DnsRecordId] = switch (Map.get(canister_to_records, Principal.compare, canister_id)) {
        case (null) return #ok([]);
        case (?val) val;
      };

      var _records : [Types.CreateRecordResponse] = [];
      for (id in Iter.range(0, record_ids.size() -1)) {
        let r : Types.CreateRecordResponse = switch (Map.get(records, Text.compare, record_ids[id])) {
          case (null) {
            return #err(Errors.NotFound("Record with id" # record_ids[id]));
          };
          case (?val) val;
        };
        _records := Array.append(_records, [r]);
      };

      return #ok(_records);
    };

    public func get_freemium_domain_registration_by_id(registration_id : Types.DomainRegistrationId) : ?Types.FreemiumDomainRegistration {
      Map.get(freemium_domain_registration, Nat.compare, registration_id);
    };

    public func get_domain_registration_ids_by_canister(canister_id : Principal) : [Types.DomainRegistrationId] {
      switch (Map.get(canister_to_domain_registration, Principal.compare, canister_id)) {
        case (null) return [];
        case (?val) return val;
      };
    };

    public func get_freemium_domain_registration_ids_by_canister(canister_id : Principal) : [Types.DomainRegistrationId] {
      switch (Map.get(canister_to_freemium_domain_registration, Principal.compare, canister_id)) {
        case (null) return [];
        case (?val) return val;
      };
    };

    public func get_freemium_domain_registration_by_canister(canister_id : Principal) : Types.Response<[Types.FreemiumDomainRegistration]> {
      let registration_ids : [Types.DomainRegistrationId] = switch (Map.get(canister_to_freemium_domain_registration, Principal.compare, canister_id)) {
        case (null) return #ok([]);
        case (?val) val;
      };

      Debug.print("finding regs");

      var registrations : [Types.FreemiumDomainRegistration] = [];
      for (id in registration_ids.vals()) {
        Debug.print("reg for id" # debug_show (id));

        let reg : Types.FreemiumDomainRegistration = switch (get_freemium_domain_registration_by_id(id)) {
          case (null) return #err(Errors.NotFound("Freemium domain registration with id " # Nat.toText(id)));
          case (?val) val;
        };
        registrations := Array.append(registrations, [reg]);
      };

      return #ok(registrations);
    };

    public func get_freemium_domain_registrations() : [(Types.DomainRegistrationId, Types.FreemiumDomainRegistration)] {
      return Iter.toArray(Map.entries(freemium_domain_registration));
    };

    public func get_freemium_domain_registrations_paginated(payload : Types.PaginationPayload) : [(Types.DomainRegistrationId, Types.FreemiumDomainRegistration)] {
      let all_entries = Iter.toArray(Map.entries(freemium_domain_registration));
      let paginated_entries = Utility.paginate(all_entries, payload);
      return paginated_entries;
    };

    public func get_domain_registrations_paginated(payload : Types.PaginationPayload) : [(Types.DomainRegistrationId, Types.DomainRegistration)] {
      let all_entries = Iter.toArray(Map.entries(domain_registration));
      let paginated_entries = Utility.paginate(all_entries, payload);
      return paginated_entries;
    };

    public func get_domain_registrations_by_canister(canister_id : Principal) : Types.Response<[Types.DomainRegistration]> {
      let registration_ids : [Types.DomainRegistrationId] = switch (Map.get(canister_to_domain_registration, Principal.compare, canister_id)) {
        case (null) return #ok([]);
        case (?val) val;
      };

      var registrations : [Types.DomainRegistration] = [];
      for (id in registration_ids.vals()) {
        let reg : Types.DomainRegistration = switch (get_domain_registration_by_id(id)) {
          case (null) return #err(Errors.NotFound("Domain registration with id " # Nat.toText(id)));
          case (?val) val;
        };

        let new_array : [Types.DomainRegistration] = Array.append(registrations, [reg]);
        registrations := new_array;
      };

      return #ok(registrations);
    };

    // Usedto initializethe domain registration object when an add-on is purchased
    public func initialize_domain_registration(canister_id : Principal, associated_add_on_id : Nat) : Types.Response<Types.DomainRegistration> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _index_counter = switch (_classes.index_counter_manager) {
        case (null) return #err(Errors.NotFoundClass("Index counter manager"));
        case (?val) val;
      };

      // Get existing registrations list for id calculation
      let existing_registrations : [Types.DomainRegistration] = switch (get_domain_registrations_by_canister(canister_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Get next index for domain registration
      let next_index = _index_counter.get_index(#domain_registration_id);

      let empty_registration : Types.DomainRegistration = {
        id = next_index;
        canister_id;
        add_on_id = associated_add_on_id;
        txt_domain_record_id = "";
        cname_challenge_record_id = "";
        cname_domain_record_id = "";
        ic_registration = {
          request_id = "";
          is_apex = false;
          domain = "";
          subdomain = "";
          status = #inactive;
        };
        error = Utility.get_domain_registration_error(#none);
      };

      let existing_registration_ids : [Types.DomainRegistrationId] = get_domain_registration_ids_by_canister(canister_id);

      let new_registration_ids : [Types.DomainRegistrationId] = Array.append(existing_registration_ids, [next_index]);
      Map.add(canister_to_domain_registration, Principal.compare, canister_id, new_registration_ids);
      Map.add(domain_registration, Nat.compare, next_index, empty_registration);
      let _next_index = _index_counter.increment_index(#domain_registration_id);

      let next_index_ = _index_counter.get_index(#domain_registration_id);

      return #ok(empty_registration);
    };
    // Create a new DNS record
    public func create_dns_record(payload : Types.CreateDnsRecordPayload, transform : Types.Transform) : async Types.Response<Types.DnsRecord> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let cloudflare = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare manager"));
        case (?val) val;
      };
      return await cloudflare.create_dns_record(payload, transform);
    };

    // Create dns records with cloudflare batch api
    // Update domain registration
    // Updates domain registration for canister
    // Saves records in subdomain records map
    public func create_dns_records_for_canister(
      associated_add_on_id : Types.AddOnId,
      project_id : Types.ProjectId,
      payload : Types.CreateCanisterDNSRecordsPayload,
      transform : Types.Transform,
      existing_registration : Types.DomainRegistration,
    ) : async Types.Response<Types.DomainRegistration> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare manager"));
        case (?val) val;
      };
      let _cloudflare_manager : Types.Cloudflare = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare"));
        case (?val) val;
      };

      let updated_domain_registration : Types.DomainRegistration = switch (await build_domain_registration_records(payload, transform)) {
        case (#err(err)) {
          let _updated_registration : Types.DomainRegistration = switch (
            // Handle cloudflare error
            await handle_batch_create_records_error(
              err,
              existing_registration,
              payload.domain_name,
              payload.subdomain_name,
              associated_add_on_id,
              transform,
            ),
          ) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };
          _updated_registration;
        };

        case (#ok(val)) {
          // let created_records = switch (val.create_record_response) {
          // case (#err(err)) return #err(err);
          // case (#ok(val)) val;
          // };

          // Saves dns records in map and for canister
          let add_records_res : Types.AddDnsRecordsForCanisterResponse = switch (
            await add_records_for_canister(
              payload.canister_id,
              val.create_record_response,
              val.txt_payload.name,
              val.cname_challenge_payload.name,
              val.cname_domain_payload.name,
              payload.domain_name,
              payload.subdomain_name,
              existing_registration,
              associated_add_on_id,
            )
          ) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };

          // Return updated domain registration
          add_records_res.updated_domain_registration;
        };
      };

      // Apply domain registration update
      update_domain_registration(updated_domain_registration.id, updated_domain_registration);

      // Get existing add ons for project
      let _new_addons : [Types.AddOnService] = switch (handle_update_project_addons(project_id, associated_add_on_id, updated_domain_registration.id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      return #ok(updated_domain_registration);
    };

    private func build_domain_registration_records(payload : Types.CreateCanisterDNSRecordsPayload, transform : Types.Transform) : async Types.Response<Types.BuildDomainRegistrationRequest> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _cloudflare_manager : Types.Cloudflare = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare"));
        case (?val) val;
      };

      Debug.print("building...");

      // Create records for payload
      let txt_payload : Types.DnsRecordPayload = {
        name = "_canister-id." # payload.subdomain_name;
        type_ = "TXT";
        comment = ?Principal.toText(payload.user_principal);
        content = ?Principal.toText(payload.canister_id);
        target = null;
        ttl = ?60;
        proxied = ?false;
      };

      let target_challenge = "_acme-challenge." # payload.subdomain_name # "." # payload.domain_name # ".icp2.io";
      let cname_challenge_payload : Types.DnsRecordPayload = {
        name = "_acme-challenge." # payload.subdomain_name;
        type_ = "CNAME";
        target = ?target_challenge;
        proxied = ?false;
        comment = ?("challenge:" # Principal.toText(payload.user_principal));
        content = null;
        ttl = ?60;
      };
      let target_domain = payload.subdomain_name # "." # payload.domain_name # ".icp1.io";
      let cname_domain_payload : Types.DnsRecordPayload = {
        name = payload.subdomain_name;
        type_ = "CNAME";
        target = ?target_domain;
        proxied = ?false;
        comment = ?("domain:" # Principal.toText(payload.user_principal));
        content = null;
        ttl = ?60;
      };

      // Create payload struct
      let create_payload : Types.CanisterRecordsPayload = {
        zone_id = _cloudflare_manager.get_zone_id();
        txt_payload = txt_payload;
        cname_challenge = cname_challenge_payload;
        cname_domain = cname_domain_payload;
      };

      Debug.print("Calling cloudflare api");

      // Batch create records with cloudflare
      let create_records_response = switch (await _cloudflare_manager.batch_create_records(create_payload, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      Debug.print("Response is: ");
      return #ok({
        create_record_response = create_records_response;
        txt_payload;
        cname_challenge_payload;
        cname_domain_payload;
      });
    };

    /// Retrieve available domain registration slot
    private func find_available_domain_registration_id(canister_id : Principal) : Types.Response<Nat> {
      // Get existing registrations list for id calculation
      let existing_registrations : [Types.DomainRegistration] = switch (get_domain_registrations_by_canister(canister_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Ensure an unused domain registration slot is retrieved
      let available_id : Nat = switch (Array.find(existing_registrations, func(reg : Types.DomainRegistration) : Bool { reg.ic_registration.status == #inactive })) {
        case (null) return #err(Errors.AddOnRequired());
        case (?val) val.id;
      };

      return #ok(available_id);

    };

    /// Adds the new records to map
    /// Adds the new records ids to canister map
    /// Adds record ids in subdomain map
    private func add_records_for_canister(
      canister_id : Principal,
      records_to_add : [Types.CreateRecordResponse],
      txt_record_name : Text,
      cname_challenge_record_name : Text,
      cname_domain_record_name : Text,
      domain_name : Text,
      subdomain_name : Text,
      existing_registration : Types.DomainRegistration,
      associated_add_on_id : Types.AddOnId,
    ) : async Types.Response<Types.AddDnsRecordsForCanisterResponse> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _cloudflare_manager : Types.Cloudflare = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare"));
        case (?val) val;
      };

      // Get records ids
      let record_ids : [Text] = Array.map(records_to_add, func(r : Types.CreateRecordResponse) : Text { r.id });

      // Assign ids to canister
      // TODO check if this is needed
      Map.add(canister_to_records, Principal.compare, canister_id, record_ids);

      // Parse records ids from created dns response
      let records_response = switch (
        resolve_record_ids(
          records_to_add,
          canister_id,
          txt_record_name,
          cname_challenge_record_name,
          cname_domain_record_name,
          domain_name,
          subdomain_name,
        )
      ) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Updated domain registration
      let updated_canister_domain_registration : Types.DomainRegistration = {
        id = existing_registration.id;
        canister_id;
        add_on_id = associated_add_on_id;
        txt_domain_record_id = records_response.txt_domain_record_id;
        cname_challenge_record_id = records_response.cname_challenge_record_id;
        cname_domain_record_id = records_response.cname_domain_record_id;
        ic_registration = {
          request_id = existing_registration.ic_registration.request_id;
          is_apex = false;
          domain = domain_name;
          subdomain = subdomain_name;
          status = #pending;
        };
        error = Utility.get_domain_registration_error(#none);
      };

      // Save references to dns record ids for subdomain name
      _cloudflare_manager.set_subdomain_records(
        subdomain_name,
        updated_canister_domain_registration.txt_domain_record_id,
        updated_canister_domain_registration.cname_challenge_record_id,
        updated_canister_domain_registration.cname_domain_record_id,
        canister_id,
      );

      return #ok({
        updated_domain_registration = updated_canister_domain_registration;
        txt_domain_record_id = records_response.txt_domain_record_id;
        cname_domain_record_id = records_response.cname_domain_record_id;
        cname_challenge_record_id = records_response.cname_challenge_record_id;
      });
    };

    private func add_records_for_freemium_canister(
      canister_id : Principal,
      records_to_add : [Types.CreateRecordResponse],
      txt_record_name : Text,
      cname_challenge_record_name : Text,
      cname_domain_record_name : Text,
      domain_name : Text,
      subdomain_name : Text,
      existing_registration : Types.FreemiumDomainRegistration,
    ) : async Types.Response<Types.AddDnsRecordsForFreemiumCanisterResponse> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _cloudflare_manager : Types.Cloudflare = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare"));
        case (?val) val;
      };

      // Get records ids
      let record_ids : [Text] = Array.map(records_to_add, func(r : Types.CreateRecordResponse) : Text { r.id });

      // Assign ids to canister
      // TODO check if this is needed
      // Map.add(canister_to_records, Principal.compare, canister_id, record_ids);

      // Parse records ids from created dns response
      let records_response = switch (
        resolve_record_ids(
          records_to_add,
          canister_id,
          txt_record_name,
          cname_challenge_record_name,
          cname_domain_record_name,
          domain_name,
          subdomain_name,
        )
      ) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Updated domain registration
      let updated_canister_domain_registration : Types.FreemiumDomainRegistration = {
        id = existing_registration.id;
        canister_id;
        txt_domain_record_id = records_response.txt_domain_record_id;
        cname_challenge_record_id = records_response.cname_challenge_record_id;
        cname_domain_record_id = records_response.cname_domain_record_id;
        ic_registration = {
          request_id = existing_registration.ic_registration.request_id;
          is_apex = false;
          domain = domain_name;
          subdomain = subdomain_name;
          status = #pending;
        };
        error = Utility.get_domain_registration_error(#none);
      };

      // Save references to dns record ids for subdomain name
      _cloudflare_manager.set_subdomain_records(
        subdomain_name,
        updated_canister_domain_registration.txt_domain_record_id,
        updated_canister_domain_registration.cname_challenge_record_id,
        updated_canister_domain_registration.cname_domain_record_id,
        canister_id,
      );

      return #ok({
        updated_domain_registration = updated_canister_domain_registration;
        txt_domain_record_id = records_response.txt_domain_record_id;
        cname_domain_record_id = records_response.cname_domain_record_id;
        cname_challenge_record_id = records_response.cname_challenge_record_id;
      });
    };

    private func resolve_record_ids(
      records_to_add : [Types.CreateRecordResponse],
      canister_id : Principal,
      txt_record_name : Text,
      cname_challenge_record_name : Text,
      cname_domain_record_name : Text,
      domain_name : Text,
      subdomain_name : Text,
    ) : Types.Response<Types.DomainRegistrationRecords> {
      var txt_record_id_opt : ?Text = null;
      var cname_challenge_record_id_opt : ?Text = null;
      var cname_domain_record_id_opt : ?Text = null;

      // Add records to map
      for (index in Iter.range(0, records_to_add.size() -1)) {
        var _rec : Types.CreateRecordResponse = records_to_add[index];

        if (_rec.name == txt_record_name # "." # domain_name) {
          txt_record_id_opt := ?_rec.id;
        } else if (_rec.name == cname_challenge_record_name # "." # domain_name) {
          cname_challenge_record_id_opt := ?_rec.id;
        } else if (_rec.name == cname_domain_record_name # "." # domain_name) {
          cname_domain_record_id_opt := ?_rec.id;
        };

        Map.add(records, Text.compare, records_to_add[index].id, records_to_add[index]);
      };

      // Ensure records are not null
      let txt_domain_record_id = switch (txt_record_id_opt) {
        case (null) { return #err(Errors.NotFound("TXT dns record id")) };
        case (?val) { val };
      };

      let cname_domain_record_id = switch (cname_domain_record_id_opt) {
        case (null) {
          return #err(Errors.NotFound("CNAME domain dns record id"));
        };
        case (?val) { val };
      };
      let cname_challenge_record_id = switch (cname_challenge_record_id_opt) {
        case (null) {
          return #err(Errors.NotFound("CNAME challenge dns record id"));
        };
        case (?val) { val };
      };

      return #ok({
        canister_id;
        txt_domain_record_id;
        cname_domain_record_id;
        cname_challenge_record_id;
      });
    };

    public func edit_ic_domains(canister_id : Principal, new_ic_domains : Types.StaticFile) : async Types.Response<()> {
      let asset_canister : Types.AssetCanister = actor (Principal.toText(canister_id));
      await asset_canister.store({
        key = new_ic_domains.path;
        content_type = new_ic_domains.content_type;
        content_encoding = "identity";
        content = new_ic_domains.content;
        sha256 = null;
        headers = [];
      });

      return #ok();
    };

    // handler for updating freemium domain registration status
    public func update_registration_status_freemium(registration_id : Nat, new_status : Types.IcDomainRegistrationStatus, error : Types.DomainRegistrationError) : Types.Response<Types.FreemiumDomainRegistration> {
      let target : Types.FreemiumDomainRegistration = switch (Map.get(freemium_domain_registration, Nat.compare, registration_id)) {
        case (null) return #err(Errors.NotFound("freemium domain registration"));
        case (?val) val;
      };

      let new_registration : Types.FreemiumDomainRegistration = {
        target with ic_registration = {
          request_id = target.ic_registration.request_id;
          is_apex = target.ic_registration.is_apex;
          domain = target.ic_registration.domain;
          subdomain = target.ic_registration.subdomain;
          status = new_status;
        }
      };

      let updated_registration : Types.FreemiumDomainRegistration = {
        new_registration with error = error;
      };

      Map.add(freemium_domain_registration, Nat.compare, registration_id, updated_registration);

      return #ok(new_registration);
    };

    // handler for updating paid plan domain registration status
    public func update_registration_status(registration_id : Nat, new_status : Types.IcDomainRegistrationStatus, error : Types.DomainRegistrationError) : Types.Response<Types.DomainRegistration> {
      let target : Types.DomainRegistration = switch (Map.get(domain_registration, Nat.compare, registration_id)) {
        case (null) return #err(Errors.NotFound("domain registration"));
        case (?val) val;
      };

      let new_registration : Types.DomainRegistration = {
        target with ic_registration = {
          request_id = target.ic_registration.request_id;
          is_apex = target.ic_registration.is_apex;
          domain = target.ic_registration.domain;
          subdomain = target.ic_registration.subdomain;
          status = new_status;
        }
      };

      let updated_registration : Types.DomainRegistration = {
        new_registration with error = error;
      };

      Map.add(domain_registration, Nat.compare, registration_id, updated_registration);

      return #ok(new_registration);
    };

    private func update_freemium_domain_registration(domain_registration_id : Types.DomainRegistrationId, new_domain_registration : Types.FreemiumDomainRegistration) : () {
      Map.add(freemium_domain_registration, Nat.compare, domain_registration_id, new_domain_registration);
      Map.add(canister_to_freemium_domain_registration, Principal.compare, new_domain_registration.canister_id, [domain_registration_id]);
      Map.add(used_subdomains, Text.compare, new_domain_registration.ic_registration.subdomain, new_domain_registration.canister_id);
    };

    private func _delete_freemium_domain_registration(domain_registration_id : Types.DomainRegistrationId, canister_id : Principal) : () {
      ignore Map.delete(freemium_domain_registration, Nat.compare, domain_registration_id);
      ignore Map.delete(canister_to_freemium_domain_registration, Principal.compare, canister_id);
      // TODO: Add delete for subdomain name
    };

    private func update_domain_registration(domain_registration_id : Types.DomainRegistrationId, new_domain_registration : Types.DomainRegistration) : () {
      Map.add(domain_registration, Nat.compare, domain_registration_id, new_domain_registration);
    };

    public func get_ic_domain_registration_request_id(id : Text, transform : Types.Transform) : async Types.Response<Bool> {
      let url = "https://icp0.io/registrations/" #id;
      let request_headers : [Types.HttpHeader] = [
        { name = "Content-Type"; value = "application/json" },
      ];

      let res = switch (await Outcall.make_http_request(#get, url, request_headers, null, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };
      return #ok(true);
    };

    public func register_domain_ic(canister_id : Principal, domain : Text, transform : Types.Transform) : async Types.Response<Text> {
      let url = "https://icp0.io/registrations";
      let request_headers : [Types.HttpHeader] = [
        { name = "Content-Type"; value = "application/json" },
      ];

      let body_json = "{\"name\": \"" # domain # "\"}";

      let res = switch (await Outcall.make_http_request(#post, url, request_headers, ?Text.encodeUtf8(body_json), transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (res.response.status != 200) {
        return #err(res.body);
      };

      let response : Types.RegisterDomainSuccessResponse = switch (Parsing.parse_register_ic_domain_response(res.body)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      return #ok(response.id);
    };

    public func setup_custom_domain_by_project(
      project_id : Types.ProjectId,
      subdomain_name : Text,
      add_on_id : Types.AddOnId,
      transform : Types.Transform,
    ) : async Types.Response<Types.DomainRegistrationResult> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _project_manager : Types.ProjectInterface = switch (_classes.project_manager) {
        case (null) return #err(Errors.NotFound("Project manager class reference"));
        case (?val) val;
      };

      let _subscription_manager : Types.SubscriptionInterface = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFound("Subscription manager class reference"));
        case (?val) val;
      };

      let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (project.plan == #freemium) return #err(Errors.PremiumFeature());
      let canister_id : Principal = switch (project.canister_id) {
        case (null) return #err(Errors.PremiumFeature());
        case (?val) val;
      };

      // Setup ic-domains file
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
      let create_ic_domains = switch (await edit_ic_domains(canister_id, ic_domains_file)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      let is_available_name = switch (is_available_subdomain(project_id, subdomain_name, add_on_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (is_available_name != true) {
        return #err(Errors.NameTaken(subdomain_name));
      };

      // // Get project
      // let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
      //   case (#err(err)) return #err(err);
      //   case (#ok(val)) val;
      // };

      // Prevent freemium project access
      // if (project.plan == #freemium) return #err(Errors.PremiumFeature());

      // Validate canister id
      // let canister_id : Principal = switch (project.canister_id) {
      //   case (null) return #err(Errors.NotFoundCanister());
      //   case (?val) val;
      // };

      // Get target addon
      let add_on : Types.AddOnService = switch (_subscription_manager.get_add_on_by_id(project_id, add_on_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Prevent use of other add ons for registering domain
      if (add_on.type_ != #register_subdomain) return #err(Errors.UnsupportedAction("Add-on type"));

      // Handle setting up custom domain
      let res = switch (await _setup_custom_domain_for_canister(project_id, canister_id, subdomain_name, add_on, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Mark domain name as used by the canister
      Map.add(used_subdomains, Text.compare, subdomain_name, canister_id);

      let resource_id : Nat = switch (res.addon.attached_resource_id) {
        // case (null) return #err(Errors.NotAttachedResourceId());
        case (null) {
          // Attempt to refresh attached resource id in case it was created recently
          let refreshed_resouce_id : Types.DomainRegistrationId = switch (_subscription_manager.get_add_on_by_id(project_id, add_on_id)) {
            case (#err(err)) return #err(err);
            case (#ok(val)) {
              let id : Types.DomainRegistrationId = switch (val.attached_resource_id) {
                case (null) return #err(Errors.NotFound("Domain registration"));
                case (?id_val) id_val;
              };
              id;
            };
          };

          let domain_registration = switch (initialize_domain_registration(canister_id, refreshed_resouce_id)) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };

          let updated_addon_response = switch (_subscription_manager.update_addon_resource_id(res.addon.id, domain_registration.id)) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };
          domain_registration.id;
        };
        case (?val) val;
      };

      return #ok({
        resource_id;
        domain_registration = res.domain_registration;
        canister_id = res.canister_id;
        addon = res.addon;
      });
    };

    public func setup_freemium_canister_subdomain(
      canister_id : Principal,
      domain_name : Text,
      subdomain_name : Text,
      backend_canister : Principal,
      transform : Types.Transform,
    ) : async Types.Response<Types.FreemiumDomainRegistration> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _cloudflare_manager = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare manager"));
        case (?val) val;
      };

      Debug.print("Checkong domai nae");

      let is_available = switch (get_subdomain_record(subdomain_name)) {
        case (null) true;
        case (?val) {
          let result = if (canister_id == val) true else false;

          result;
        };
      };

      Debug.print("is available?");

      if (is_available == false) return #err(Errors.NameTaken(subdomain_name));
      Debug.print("is available");

      let payload : Types.CreateCanisterDNSRecordsPayload = {
        canister_id;
        user_principal = backend_canister;
        domain_name = "worldcloud.app";
        subdomain_name = subdomain_name;
      };

      Debug.print("getting rgi");

      let existing_registration : Types.FreemiumDomainRegistration = switch (get_freemium_domain_registration_by_canister(canister_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) {
          Debug.print("Creating freemium regi");

          let target_registration = if (val.size() == 0) {
            let registration : Types.FreemiumDomainRegistration = switch (create_freemium_domain_registration(domain_name, subdomain_name, canister_id, "", "", "")) {
              case (#err(err)) return #err(err);
              case (#ok(val)) val;
            };
            Debug.print("Created reg");

            registration;
          } else {
            val[0];
          };

          target_registration;
        };
      };

      Debug.print("Created regggg");

      // };

      // Build payload and create dns records in batch with cloudflare
      let updated_domain_registration : Types.FreemiumDomainRegistration = switch (await build_domain_registration_records(payload, transform)) {
        case (#err(err)) {
          Debug.print("Error with cloudflare(((((((())))))))");
          let _updated_registration : Types.FreemiumDomainRegistration = switch (
            // Handle cloudflare error
            await handle_freemium_batch_create_records_error(
              err,
              existing_registration,
              payload.domain_name,
              payload.subdomain_name,
              transform,
            ),
          ) {
            case (#err(err)) return #err(err);
            case (#ok(reg)) reg;
          };

          update_freemium_domain_registration(_updated_registration.id, _updated_registration);
          _updated_registration;
        };
        case (#ok(val)) {
          // let created_records = switch (val.create_record_response) {
          //   case (#err(err)) return #err(err);
          //   case (#ok(val)) val;
          // };

          let add_records_res : Types.AddDnsRecordsForFreemiumCanisterResponse = switch (
            await add_records_for_freemium_canister(
              payload.canister_id,
              val.create_record_response,
              val.txt_payload.name,
              val.cname_challenge_payload.name,
              val.cname_domain_payload.name,
              payload.domain_name,
              payload.subdomain_name,
              existing_registration,
            )
          ) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };

          // Return updated domain registration
          add_records_res.updated_domain_registration;

        };
      };

      // // Create the new domain registration record
      // let _domain_registration : Types.FreemiumDomainRegistration = switch (create_result.create_record_response) {
      //   case (#err(err)) return #err(err);
      //   case (#ok(val)) {

      //     // // Get the registration record ids to store them in new registration
      //     // let parsed_record_ids : Types.DomainRegistrationRecords = switch (
      //     //   resolve_record_ids(
      //     //     val,
      //     //     canister_id,
      //     //     create_result.txt_payload.name,
      //     //     create_result.cname_challenge_payload.name,
      //     //     create_result.cname_domain_payload.name,
      //     //     domain_name,
      //     //     subdomain_name,
      //     //   )
      //     // ) {
      //     //   case (#err(err)) return #err(err);
      //     //   case (#ok(val)) val;
      //     // };

      //     // Create the registration
      //     let registration : Types.FreemiumDomainRegistration = switch (
      //       create_freemium_domain_registration(
      //         domain_name,
      //         subdomain_name,
      //         canister_id,
      //         parsed_record_ids.txt_domain_record_id,
      //         parsed_record_ids.cname_challenge_record_id,
      //         parsed_record_ids.cname_domain_record_id,
      //       )
      //     ) {
      //       case (#err(err)) return #err(err);
      //       case (#ok(val)) val;
      //     };

      //     registration;
      //   };
      // };

      update_freemium_domain_registration(updated_domain_registration.id, updated_domain_registration);
      return #ok(updated_domain_registration);
    };

    private func create_freemium_domain_registration(
      domain_name : Text,
      subdomain_name : Text,
      canister_id : Principal,
      txt_domain_record_id : Text,
      cname_challenge_record_id : Text,
      cname_domain_record_id : Text,
    ) : Types.Response<Types.FreemiumDomainRegistration> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _index_counter = switch (_classes.index_counter_manager) {
        case (null) return #err(Errors.NotFoundClass("Index counter manager"));
        case (?val) val;
      };

      Debug.print("gettin next index..");

      let registration_id : Types.DomainRegistrationId = _index_counter.get_index(#freemium_domain_registration_id);
      Debug.print("got next index  " # Nat.toText(registration_id));

      let registration : Types.FreemiumDomainRegistration = {
        id = registration_id;
        canister_id;
        txt_domain_record_id;
        cname_challenge_record_id;
        cname_domain_record_id;
        ic_registration = {
          request_id = "";
          is_apex = false;
          domain = domain_name;
          subdomain = subdomain_name;
          status = #inactive;
        };
        error = Utility.get_domain_registration_error(#none);
      };

      update_freemium_domain_registration(registration_id, registration);
      _index_counter.increment_index(#freemium_domain_registration_id);
      return #ok(registration);
    };

    private func create_domain_registration(
      domain_name : Text,
      subdomain_name : Text,
      canister_id : Principal,
      txt_domain_record_id : Text,
      cname_domain_record_id : Text,
      cname_challenge_record_id : Text,
      add_on_id : Types.AddOnId,
    ) : Types.Response<Types.DomainRegistration> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _index_counter = switch (_classes.index_counter_manager) {
        case (null) return #err(Errors.NotFoundClass("Index counter manager"));
        case (?val) val;
      };
      let registration_id : Types.DomainRegistrationId = _index_counter.get_index(#domain_registration_id);

      let domain_registration : Types.DomainRegistration = {
        id = registration_id;
        add_on_id;
        canister_id;
        txt_domain_record_id;
        cname_domain_record_id;
        cname_challenge_record_id;
        ic_registration = {
          request_id = "";
          domain = domain_name;
          subdomain = subdomain_name;
          is_apex = false;
          status = #inactive;
        };
        error = Utility.get_domain_registration_error(#none);
      };

      _index_counter.increment_index(#domain_registration_id);
      update_domain_registration(registration_id, domain_registration);
      Map.add(used_subdomains, Text.compare, subdomain_name, canister_id);
      return #ok(domain_registration);
    };

    // Setup custom domain handler
    public func _setup_custom_domain_for_canister(
      project_id : Types.ProjectId,
      canister_id : Principal,
      subdomain_name : Text,
      add_on : Types.AddOnService,
      transform : Types.Transform,
    ) : async Types.Response<Types.SetupDomainResult> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager : Types.SubscriptionInterface = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFound("Subscription manager class reference"));
        case (?val) val;
      };

      // TODO handle custom dns
      let domain_name = "worldcloud.app";
      let payload : Types.CreateCanisterDNSRecordsPayload = {
        domain_name = domain_name;
        subdomain_name = subdomain_name;
        user_principal = canister_id;
        canister_id = canister_id;
      };

      // TODO: Add handler for different types of resources based on addon.type_
      // Get target resource id, creates a new resource if not found
      let resource_id : Nat = switch (add_on.attached_resource_id) {
        // If no attached resource id, create it
        case (null) {
          // Initialize and attach resource id to addon
          let new_registration_id : Types.DomainRegistrationId = switch (handle_attach_resource_id(canister_id, add_on.id)) {
            case (#err(err)) return #err(err);
            case (#ok(val)) val;
          };

          new_registration_id;
        };
        case (?val) val;
      };

      // Get target registration
      let existing_registration : Types.DomainRegistration = switch (Map.get(domain_registration, Nat.compare, resource_id)) {
        case (null) return #err(Errors.NotFound("Domain registration for add-on id:" # Nat.toText(add_on.id)));
        case (?val) val;
      };

      // Create TXT and CNAME records for linking canister to custom subdomain
      let registration : Types.DomainRegistration = switch (
        await create_dns_records_for_canister(
          add_on.id,
          project_id,
          payload,
          transform,
          existing_registration,
        )
      ) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Get refreshed addon
      let updated_addon : Types.AddOnService = switch (_subscription_manager.get_add_on_by_id(project_id, add_on.id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      return #ok({
        domain_registration = registration;
        canister_id = canister_id;
        addon = updated_addon;
      });
    };

    private func handle_batch_create_records_error(
      err : Text,
      existing_registration : Types.DomainRegistration,
      domain_name : Text,
      subdomain_name : Text,
      associated_add_on_id : Types.AddOnId,
      transform : Types.Transform,
    ) : async Types.Response<Types.DomainRegistration> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _cloudflare_manager = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare manager"));
        case (?val) val;
      };

      // Handle batch create records error
      let _updated = if (Text.contains(err, #text "already exists")) {
        // Get record ids if they exist
        let records = switch (_cloudflare_manager.get_subdomain_records_by_name(subdomain_name)) {
          // In case record ids are not found, return empty strings
          case (#err(err)) {
            Debug.print("Eror with getting subdomain records bu name");
            let domain_records : Types.DomainRegistrationRecords = switch (await _cloudflare_manager.find_dns_record_ids(subdomain_name, domain_name, existing_registration.canister_id, transform)) {
              case (#err(err)) {
                if (Text.contains(err, #text("not found"))) return #err(Errors.DomainRecordsExist());
                return #err(err);
              };
              case (#ok(val)) val;
            };

            Debug.print("FOund domain recordssss: " # debug_show (domain_records));
            // TODO: Handle this error case to get the record ids from cloudflare and set them
            let record_ids : Types.DomainRegistrationRecords = {
              canister_id = existing_registration.canister_id;
              txt_domain_record_id = domain_records.txt_domain_record_id;
              cname_challenge_record_id = domain_records.cname_challenge_record_id;
              cname_domain_record_id = domain_records.cname_domain_record_id;
            };
            record_ids;
          };
          case (#ok(val)) {
            Debug.print("Foudn sundomain records" # debug_show (val));

            val;
          };

        };

        // Ensure the same canister id is using the domain records
        if (records.canister_id != existing_registration.canister_id) {
          // Update domain registration
          let updated : Types.DomainRegistration = {
            id = existing_registration.id;
            canister_id = existing_registration.canister_id;
            add_on_id = associated_add_on_id;
            txt_domain_record_id = "";
            cname_challenge_record_id = "";
            cname_domain_record_id = "";
            ic_registration = {
              request_id = existing_registration.ic_registration.request_id;
              is_apex = false;
              domain = domain_name;
              subdomain = subdomain_name;
              status = #failed;
            };
            error = Utility.get_domain_registration_error(#cloudflare_exist_records);
          };
          // Return updated registration
          updated;
        } else {
          // Update domain registration
          let updated : Types.DomainRegistration = {
            id = existing_registration.id;
            canister_id = existing_registration.canister_id;
            add_on_id = associated_add_on_id;
            txt_domain_record_id = records.txt_domain_record_id;
            cname_challenge_record_id = records.cname_challenge_record_id;
            cname_domain_record_id = records.cname_domain_record_id;
            ic_registration = {
              request_id = existing_registration.ic_registration.request_id;
              is_apex = false;
              domain = domain_name;
              subdomain = subdomain_name;
              status = #pending;
            };
            error = Utility.get_domain_registration_error(#none);
          };
          // Return updated registration
          updated;
        };

      } else {
        // Different cloudflare error
        // TODO: Handle errors
        return #err(err);
      };

      return #ok(_updated);
    };

    private func handle_freemium_batch_create_records_error(
      err : Text,
      existing_registration : Types.FreemiumDomainRegistration,
      domain_name : Text,
      subdomain_name : Text,
      transform : Types.Transform,
    ) : async Types.Response<Types.FreemiumDomainRegistration> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _cloudflare_manager = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare manager"));
        case (?val) val;
      };

      Debug.print("**********handling error cloudflare..");
      // Handle batch create records error
      let _updated = if (Text.contains(err, #text "already exists")) {
        Debug.print("COntains alread exist");
        // Get record ids if they exist
        let records = switch (_cloudflare_manager.get_subdomain_records_by_name(subdomain_name)) {
          // In case record ids are not found, return empty strings
          case (#err(err)) {
            Debug.print("Eror with getting subdomain records bu name");
            let domain_records : Types.DomainRegistrationRecords = switch (await _cloudflare_manager.find_dns_record_ids(subdomain_name, domain_name, existing_registration.canister_id, transform)) {
              case (#err(err)) {
                if (Text.contains(err, #text("not found"))) return #err(Errors.DomainRecordsExist());
                return #err(err);
              };
              case (#ok(val)) { val };
            };

            // TODO: Handle this error case to get the record ids from cloudflare and set them
            let record_ids : Types.DomainRegistrationRecords = {
              canister_id = existing_registration.canister_id;
              txt_domain_record_id = domain_records.txt_domain_record_id;
              cname_challenge_record_id = domain_records.cname_challenge_record_id;
              cname_domain_record_id = domain_records.cname_domain_record_id;
            };
            record_ids;
          };
          case (#ok(val)) {
            val;
          };
        };
        Debug.print("FOund domain recordssss: " # debug_show (records));

        // Ensure the same canister id is using the domain records
        if (records.canister_id != existing_registration.canister_id) {
          // Update domain registration
          let updated : Types.FreemiumDomainRegistration = {
            id = existing_registration.id;
            canister_id = existing_registration.canister_id;
            txt_domain_record_id = "";
            cname_challenge_record_id = "";
            cname_domain_record_id = "";
            ic_registration = {
              request_id = existing_registration.ic_registration.request_id;
              is_apex = false;
              domain = domain_name;
              subdomain = subdomain_name;
              status = #failed;
            };
            error = Utility.get_domain_registration_error(#cloudflare_exist_records);
          };
          // Return updated registration
          updated;
        } else {
          // Update domain registration
          let updated : Types.FreemiumDomainRegistration = {
            id = existing_registration.id;
            canister_id = existing_registration.canister_id;
            txt_domain_record_id = records.txt_domain_record_id;
            cname_challenge_record_id = records.cname_challenge_record_id;
            cname_domain_record_id = records.cname_domain_record_id;
            ic_registration = {
              request_id = existing_registration.ic_registration.request_id;
              is_apex = false;
              domain = domain_name;
              subdomain = subdomain_name;
              status = #pending;
            };
            error = Utility.get_domain_registration_error(#none);
          };
          // Return updated registration
          updated;
        };

      } else {
        // Different cloudflare error
        // TODO: Handle errors

        return #err(err);
      };

      return #ok(_updated);
    };

    private func handle_update_project_addons(project_id : Types.ProjectId, associated_add_on_id : Types.AddOnId, domain_registration_id : Types.DomainRegistrationId) : Types.Response<[Types.AddOnService]> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager : Types.SubscriptionInterface = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFound("Subscription manager class reference"));
        case (?val) val;
      };
      // Get existing add ons for project
      let existing_add_on : Types.AddOnService = switch (_subscription_manager.get_add_on_by_id(project_id, associated_add_on_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Update add on details
      let updated_add_on : Types.AddOnService = {
        existing_add_on with initialized = true;
        attached_resource_id = ?domain_registration_id;
        updated_on = Int.abs(Utility.get_time_now(#milliseconds));
      };

      // Apply update in storage for project addons
      let new_addons : [Types.AddOnService] = switch (_subscription_manager.update_add_on(project_id, updated_add_on)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };
      return #ok(new_addons);
    };

    private func handle_attach_resource_id(canister_id : Principal, add_on_id : Types.AddOnId) : Types.Response<Types.DomainRegistrationId> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager : Types.SubscriptionInterface = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFound("Subscription manager class reference"));
        case (?val) val;
      };

      let new_registration : Types.DomainRegistration = switch (initialize_domain_registration(canister_id, add_on_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // TODO: Get txt and cname records from map of records
      let updated_registration : Types.DomainRegistration = {
        id = new_registration.id;
        canister_id;
        add_on_id = add_on_id;
        txt_domain_record_id = "";
        cname_challenge_record_id = "";
        cname_domain_record_id = "";
        ic_registration = new_registration.ic_registration;
        error = "";
      };

      ignore update_domain_registration(new_registration.id, updated_registration);

      switch (_subscription_manager.update_addon_resource_id(add_on_id, new_registration.id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      return #ok(new_registration.id);
    };

    public func delete_domain_registration(project_id : Types.ProjectId, addon_id : Types.AddOnId) : Types.Response<Bool> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _subscription_manager = switch (_classes.subscription_manager) {
        case (null) return #err(Errors.NotFoundClass("Subscription manager"));
        case (?val) val;
      };

      let _project_manager = switch (_classes.project_manager) {
        case (null) return #err(Errors.NotFoundClass("Project manager"));
        case (?val) val;
      };

      let project : Types.Project = switch (_project_manager.get_project_by_id(project_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (project.plan == #freemium) return #err(Errors.PremiumFeature());

      let canister_id : Principal = switch (project.canister_id) {
        case (null) return #err(Errors.NotFoundCanister());
        case (?val) val;
      };

      let addon : Types.AddOnService = switch (_subscription_manager.get_add_on_by_id(project_id, addon_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (addon.type_ != #register_domain and addon.type_ != #register_subdomain) return #err(Errors.UnsupportedAction("Deleting non-domain resource"));
      Debug.print("deleting...");
      let resource_id : Nat = switch (addon.attached_resource_id) {
        case (null) return #err(Errors.NotAttachedResourceId());
        case (?val) val;
      };

      Debug.print("continue deleting...");

      // Delete subdomain name and domain registration references
      switch (_delete_domain_registration(resource_id, canister_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      let updated_addon : Types.AddOnService = {
        id = addon.id;
        attached_resource_id = null;
        variant_id = addon.variant_id;
        status = addon.status;
        initialized = false;
        type_ = addon.type_;
        created_on = addon.created_on;
        updated_on = Int.abs(Utility.get_time_now(#milliseconds));
        expires_at = addon.expires_at;
      };

      let _new_addons : [Types.AddOnService] = switch (_subscription_manager.update_add_on(project_id, updated_addon)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      return #ok(true);
    };

    public func admin_delete_domain_registration(domain_registration_id : Types.DomainRegistrationId, type_ : Types.ProjectPlan) : Types.Response<()> {
      if (type_ == #freemium) {
        let registration : Types.FreemiumDomainRegistration = switch (get_freemium_domain_registration_by_id(domain_registration_id)) {
          case (null) return #err(Errors.NotFound("Freemium domain registration"));
          case (?val) val;
        };

        let res = _delete_freemium_domain_registration(domain_registration_id, registration.canister_id);
      } else {
        let registration : Types.DomainRegistration = switch (get_domain_registration_by_id(domain_registration_id)) {
          case (null) return #err(Errors.NotFound("Domain registration"));
          case (?val) val;
        };
        let res = _delete_domain_registration(domain_registration_id, registration.canister_id);
      };

      return #ok();
    };

    private func _delete_domain_registration(domain_registration_id : Types.DomainRegistrationId, canister_id : Principal) : Types.Response<()> {
      let _classes = switch (class_references) {
        case (null) return #err(Errors.NotFoundClass(""));
        case (?val) val;
      };

      let _cloudflare_manager = switch (_classes.cloudflare_manager) {
        case (null) return #err(Errors.NotFoundClass("Cloudflare manager"));
        case (?val) val;
      };

      // Delete subdomain name from used names mapping
      let _registration : ?Types.DomainRegistration = switch (get_domain_registration_by_id(domain_registration_id)) {
        case (null) null;
        case (?val) {
          _cloudflare_manager.delete_subdomain_records(val.ic_registration.subdomain);

          ignore Map.delete(used_subdomains, Text.compare, val.ic_registration.subdomain);
          ?val;
        };
      };

      // Get canister registration ids
      let existing_registration_ids : [Types.DomainRegistrationId] = get_domain_registration_ids_by_canister(canister_id);

      // Set new array of ids
      if (existing_registration_ids.size() != 0) {
        // Filter out target id
        let new_domain_registration_ids : [Types.DomainRegistrationId] = Array.filter(existing_registration_ids, func(id : Types.DomainRegistrationId) : Bool { id != domain_registration_id });

        // Update canister to ids mapping
        Map.add(canister_to_domain_registration, Principal.compare, canister_id, new_domain_registration_ids);
      };

      // Delete registration from mapping
      ignore Map.delete(domain_registration, Nat.compare, domain_registration_id);
      return #ok();
    };

    // public func update_domain(request_id : Text, transform : Types.Transform) : async Types.Response<()> {
    //   let url = "https://icp0.io/registrations/" # request_id;
    //   let request_headers : [Types.HttpHeader] = [
    //     { name = "Content-Type"; value = "application/json" },
    //   ];

    //   let res = switch (await Outcall.make_http_request(#put, url, request_headers, null, transform)) {
    //     case (#err(err)) return #err(err);
    //     case (#ok(val)) val;
    //   };

    //   if (res.response.status != 200) {
    //     Debug.print("[update_domain] Encountered error: " # res.body);
    //     return #err(res.body);
    //   };

    //   return #ok();
    // };

    // public func delete_domain(request_id : Text, transform : Types.Transform) : async Types.Response<()> {
    //   let url = "https://icp0.io/registrations/" # request_id;
    //   let request_headers : [Types.HttpHeader] = [
    //     { name = "Content-Type"; value = "application/json" },
    //   ];

    //   let res = switch (await Outcall.make_http_request(#delete, url, request_headers, null, transform)) {
    //     case (#err(err)) return #err(err);
    //     case (#ok(val)) val;
    //   };

    //   if (res.response.status != 200) {
    //     Debug.print("[update_domain] Encountered error: " # res.body);
    //     return #err(res.body);
    //   };

    //   return #ok();
    // }
    // Update an existing DNS record
    // public func update_dns_record(zone_id : Text, record_id : Text, record : Types.DnsRecord, cloudflare : Types.Cloudflare) : async Types.Response<Types.DnsRecord> {
    //   return await cloudflare.update_dns_record(zone_id, record_id, record);
    // };

    // Delete a DNS record
    // public func delete_dns_record(zone_id : Text, record_id : Text, cloudflare : Types.Cloudflare) : async Types.Response<Bool> {
    //   return await cloudflare.delete_dns_record(zone_id, record_id);
    // };

    // // Get a specific DNS record
    // public func get_dns_record(zone_id : Text, record_id : Text, cloudflare : Types.Cloudflare) : async Types.Response<Types.DnsRecord> {
    //   return await cloudflare.get_dns_record(zone_id, record_id);
    // };

    // // Get DNS zones (domains)
    // public func get_dns_zones(cloudflare : Types.Cloudflare) : async Types.Response<[Types.DnsZone]> {
    //   return await cloudflare.get_dns_zones();
    // };

    /*
   *
   * END DNS RECORD METHODS
   *
   */

    // Cloudflare API Configuration Methods
    // public func set_cloudflare_credentials(email : Text, api_key : Text, cloudflare : Types.Cloudflare) : Types.Response<()> {
    //   return cloudflare.set_cloudflare_credentials(email, api_key);
    // };

    // public func get_cloudflare_credentials(cloudflare : Types.Cloudflare) : Types.Response<{ email : ?Text; api_key : ?Text }> {
    //   return cloudflare.get_cloudflare_credentials();
    // };

    /** End Module*/
  };
};
