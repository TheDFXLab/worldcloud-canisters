import Types "../types";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Map "mo:core/Map";
import Cloudflare "cloudflare";
import Errors "errors";
import Outcall "outcall";
import Parsing "../utils/Parsing";

module {
  public class Domain(
    records_map_init : Types.CloudflareRecordsMap,
    canister_to_records_init : Types.CanisterToRecordMap,
    canister_to_domain_registration_init : Types.CanisterToDomainRegistration,
    domain_registration_init : Types.DomainRegistrationMap,
  ) {
    public var records : Types.CloudflareRecordsMap = records_map_init;
    public var canister_to_records : Types.CanisterToRecordMap = canister_to_records_init;
    public var canister_to_domain_registration : Types.CanisterToDomainRegistration = canister_to_domain_registration_init;
    public var domain_registration : Types.DomainRegistrationMap = domain_registration_init;

    // List DNS records for a zone
    public func list_dns_records(zone_id : Text, transform : Types.Transform, cloudflare : Types.Cloudflare) : async Types.Response<[Types.DnsRecord]> {
      return await cloudflare.list_dns_records(zone_id, transform);
    };

    public func get_all_records() : [(Types.DnsRecordId, Types.CreateRecordResponse)] {
      return Iter.toArray(Map.entries(records));
    };

    public func get_all_registrations() : [(Types.DomainRegistrationId, Types.DomainRegistration)] {
      return Iter.toArray(Map.entries(domain_registration));
    };

    public func delete_records() : () {
      records := Map.empty<Types.DnsRecordId, Types.CreateRecordResponse>();
    };

    public func delete_canister_to_records_map() : () {
      canister_to_records := Map.empty<Principal, [Types.DnsRecordId]>();
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

    public func get_domain_registrations(canister_id : Principal) : Types.Response<[Types.DomainRegistration]> {
      let registrations = switch (Map.get(canister_to_domain_registration, Principal.compare, canister_id)) {
        case (null) return #ok([]);
        case (?val) val;
      };

      return #ok(registrations);
    };
    // Used to initialize the domain registration object when an add-on is purchased
    public func initialize_domain_registration(canister_id : Principal) : Types.Response<Types.DomainRegistration> {
      // Get existing registrations list for id calculation
      let existing_registrations : [Types.DomainRegistration] = switch (get_domain_registrations(canister_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (existing_registrations.size() != 0) return #err(Errors.AlreadyCreated());
      let empty_registration : Types.DomainRegistration = {
        id = 0;
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
      };

      Map.add(canister_to_domain_registration, Principal.compare, canister_id, [empty_registration]);
      return #ok(empty_registration);
    };
    // Create a new DNS record
    public func create_dns_record(payload : Types.CreateDnsRecordPayload, transform : Types.Transform, cloudflare : Types.Cloudflare) : async Types.Response<Types.DnsRecord> {
      return await cloudflare.create_dns_record(payload, transform);
    };

    public func create_dns_records_for_canister(zone_id : Text, payload : Types.CreateCanisterDNSRecordsPayload, transform : Types.Transform, cloudflare : Types.Cloudflare) : async Types.Response<Types.DomainRegistration> {
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

      let create_payload : Types.CanisterRecordsPayload = {
        zone_id = zone_id;
        txt_payload = txt_payload;
        cname_challenge = cname_challenge_payload;
        cname_domain = cname_domain_payload;
      };

      Debug.print("Batch creating dns records for new canister for url: " # payload.subdomain_name # payload.domain_name);
      let res : [Types.CreateRecordResponse] = switch (await cloudflare.batch_create_records(create_payload, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      Debug.print("Created dns records.");

      // Create the ic-domains file
      // let ic_domains_file : Types.StaticFile = {
      //   path = "/.well-known/ic-domains";
      //   content = Text.encodeUtf8(payload.subdomain_name # "." # payload.domain_name);
      //   content_type = "application/octet-stream";
      //   content_encoding = null;
      //   is_chunked = false;
      //   chunk_id = 0;
      //   batch_id = 0;
      //   is_last_chunk = true;
      // };

      // Debug.print("creating ic domains file....");

      // // Upload to canister
      // let _is_edited = switch (await edit_ic_domains(payload.canister_id, ic_domains_file)) {
      //   case (#err(err)) {
      //     return #err(Errors.UnexpectedError("editing ic-domains for " # Principal.toText(payload.canister_id)));
      //   };
      //   case (#ok(val)) val;
      // };

      // Debug.print("Updated ic domains file: " # debug_show (_is_edited));

      Debug.print("Adding records for dns setup for canister in storage...");
      // Saves dns records in map and for canister
      let dns_record_ids : Types.AddDnsRecordsForCanisterResponse = switch (
        await add_records_for_canister(
          payload.canister_id,
          res,
          txt_payload.name,
          cname_challenge_payload.name,
          cname_domain_payload.name,
          payload.domain_name,
        )
      ) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Get existing registrations list for id calculation
      let existing_registrations : [Types.DomainRegistration] = switch (get_domain_registrations(payload.canister_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      let canister_domain_registration : Types.DomainRegistration = {
        id = existing_registrations.size();
        txt_domain_record_id = dns_record_ids.txt_domain_record_id;
        cname_challenge_record_id = dns_record_ids.cname_challenge_record_id;
        cname_domain_record_id = dns_record_ids.cname_domain_record_id;
        ic_registration = {
          request_id = "";
          is_apex = false;
          domain = "";
          subdomain = "";
          status = #inactive;
        };
      };

      Debug.print("Registered domain successfully: " # debug_show (canister_domain_registration));

      // Map.add(domain_registration, Text.compare, register_domain_request_id, canister_domain_registration);
      return #ok(canister_domain_registration);
    };

    /// Adds the new records to map
    /// Adds the new records ids to canister map
    private func add_records_for_canister(
      canister_id : Principal,
      records_to_add : [Types.CreateRecordResponse],
      txt_record_name : Text,
      cname_challenge_record_name : Text,
      cname_domain_record_name : Text,
      domain_name : Text,
    ) : async Types.Response<Types.AddDnsRecordsForCanisterResponse> {
      let record_ids : [Text] = Array.map(records_to_add, func(r : Types.CreateRecordResponse) : Text { r.id });
      // Assign ids to canister
      Map.add(canister_to_records, Principal.compare, canister_id, record_ids);

      var txt_record_id_opt : ?Text = null;
      var cname_challenge_record_id_opt : ?Text = null;
      var cname_domain_record_id_opt : ?Text = null;
      Debug.print("TXT: " # debug_show (txt_record_name));
      Debug.print(" CNAME chall: " # debug_show (cname_challenge_record_name));
      Debug.print("CNAME dom:  " # debug_show (cname_domain_record_name));
      // Add records to map
      for (index in Iter.range(0, records_to_add.size() -1)) {
        var _rec : Types.CreateRecordResponse = records_to_add[index];
        Debug.print("Index: " # Nat.toText(index) # debug_show (_rec));

        if (_rec.name == txt_record_name # "." # domain_name) {
          txt_record_id_opt := ?_rec.id;
        } else if (_rec.name == cname_challenge_record_name # "." # domain_name) {
          cname_challenge_record_id_opt := ?_rec.id;
        } else if (_rec.name == cname_domain_record_name # "." # domain_name) {
          cname_domain_record_id_opt := ?_rec.id;
        };

        Map.add(records, Text.compare, records_to_add[index].id, records_to_add[index]);
      };
      // Debug.print("TXT, CNAME dom, CNAME chall: " # debug_show (txt_record_id_opt) # debug_show (cname_domain_record_id_opt) # debug_show (cname_challenge_record_id_opt));
      Debug.print("TXT: " # debug_show (txt_record_id_opt));
      Debug.print(" CNAME chall: " # debug_show (cname_challenge_record_id_opt));
      Debug.print("CNAME dom:  " # debug_show (cname_domain_record_id_opt));

      let txt_record_id = switch (txt_record_id_opt) {
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
        txt_domain_record_id = txt_record_id;
        cname_domain_record_id = cname_domain_record_id;
        cname_challenge_record_id = cname_challenge_record_id;
      });
    };

    public func edit_ic_domains(canister_id : Principal, new_ic_domains : Types.StaticFile) : async Types.Response<()> {
      Debug.print("Updating ic-domains file for canister " # Principal.toText(canister_id) # debug_show (new_ic_domains));
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

    private func update_domain_registration(canister_id : Principal, new_domain_registration : Types.DomainRegistration) : Types.Response<Types.DomainRegistration> {
      var existing_registrations : [Types.DomainRegistration] = switch (get_domain_registrations(canister_id)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (existing_registrations.size() == 0) return #err(Errors.NotFound("domain registration"));

      // Find the index of the matching registration
      let matching_index : ?Nat = Array.indexOf<Types.DomainRegistration>(
        new_domain_registration,
        existing_registrations,
        func(a : Types.DomainRegistration, b : Types.DomainRegistration) : Bool {
          a.id == b.id;
        },
      );

      switch (matching_index) {
        case (null) return #err(Errors.NotFound("domain registration"));
        case (?index) {
          // Create a new array with the updated element
          let new_array : [Types.DomainRegistration] = Array.tabulate<Types.DomainRegistration>(
            existing_registrations.size(),
            func(i : Nat) : Types.DomainRegistration {
              if (i == index) {
                new_domain_registration;
              } else {
                existing_registrations[i];
              };
            },
          );

          Map.add(canister_to_domain_registration, Principal.compare, canister_id, new_array);
          return #ok(new_domain_registration);
        };
      };
    };

    public func get_domain_registration_by_id(id : Text, transform : Types.Transform) : async Types.Response<Bool> {
      let url = "https://icp0.io/registrations/" #id;
      let request_headers : [Types.HttpHeader] = [
        { name = "Content-Type"; value = "application/json" },
      ];

      let res = switch (await Outcall.make_http_request(#get, url, request_headers, null, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };
      Debug.print("Got response from get reg id: " # debug_show (res));
      // let response : Types.RegisterDomainSuccessResponse = switch (Parsing.parse_register_ic_domain_response(res.body)) {
      //   case (#err(err)) return #err(err);
      //   case (#ok(val)) val;
      // };
      return #ok(true);
    };

    public func register_domain(domain : Text, transform : Types.Transform) : async Types.Response<Text> {
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
        Debug.print("[register_domain] Encountered error: " # res.body);
        return #err(res.body);
      };

      let response : Types.RegisterDomainSuccessResponse = switch (Parsing.parse_register_ic_domain_response(res.body)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      return #ok(response.id);
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
