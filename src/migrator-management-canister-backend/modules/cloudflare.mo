import Types "../types";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Errors "errors";
import Outcall "outcall";
import Parsing "../utils/Parsing";
import Utility "../utils/Utility";
import JSON "mo:json.mo/JSON";
import Blob "mo:base/Blob";
import Bool "mo:base/Bool";
import Principal "mo:base/Principal";
import Map "mo:core/Map";
module {
  public class Cloudflare(base_url_init : Text, email_init : ?Text, api_key_init : ?Text, zone_id_init : ?Text, subdomain_records_init : Types.SubdomainRecords) {
    public var CLOUDFLARE_API_BASE_URL : Text = base_url_init;
    public var CLOUDFLARE_EMAIL : ?Text = email_init;
    public var CLOUDFLARE_API_KEY : ?Text = api_key_init;
    public var CLOUDFLARE_ZONE_ID : ?Text = zone_id_init;

    public var subdomain_records : Types.SubdomainRecords = subdomain_records_init;

    private func _get_cloudflare_credentials() : Types.Response<Types.CloudflareConfig> {
      // Check if Cloudflare credentials are configured
      if (not has_cloudflare_credentials()) {
        return #err(Errors.CloudflareNotConfigured());
      };

      let api_key : Text = switch (CLOUDFLARE_API_KEY) {
        case (null) return #err(Errors.NotFoundCloudflareApiKey());
        case (?val) val;
      };
      let email : Text = switch (CLOUDFLARE_EMAIL) {
        case (null) return #err(Errors.NotFoundCloudflareEmail());
        case (?val) val;
      };
      let zone_id : Text = get_zone_id();
      return #ok({ email; api_key; zone_id });
    };

    public func get_cloudflare_credentials() : Types.Response<{ email : ?Text; api_key : ?Text }> {
      return #ok({
        email = CLOUDFLARE_EMAIL;
        api_key = CLOUDFLARE_API_KEY;
      });
    };

    public func set_zone_id(new_zone_id : Text) : () {
      CLOUDFLARE_ZONE_ID := ?new_zone_id;
    };

    public func get_zone_id() : Text {
      return switch (CLOUDFLARE_ZONE_ID) {
        case (null) "";
        case (?val) val;
      };
    };
    public func set_config(email : Text, api_key : Text, new_zone_id : Text) : () {
      CLOUDFLARE_EMAIL := ?email;
      CLOUDFLARE_API_KEY := ?api_key;
      CLOUDFLARE_ZONE_ID := ?new_zone_id;
    };
    public func set_cloudflare_credentials(email : Text, api_key : Text) : Types.Response<()> {
      CLOUDFLARE_EMAIL := ?email;
      CLOUDFLARE_API_KEY := ?api_key;
      return #ok();
    };

    /** State**/

    public func get_subdomain_records_all() : [(Text, Types.DomainRegistrationRecords)] {
      return Iter.toArray(Map.entries(subdomain_records));
    };

    public func get_subdomain_records_by_name(subdomain_name : Text) : Types.Response<Types.DomainRegistrationRecords> {
      switch (Map.get(subdomain_records, Text.compare, subdomain_name)) {
        case (null) return #err(Errors.NotFound("Domain registration records for subdomain " # subdomain_name));
        case (?val) return #ok(val);
      };
    };

    public func set_subdomain_records(subdomain_name : Text, txt_id : Text, cname_challenge_id : Text, cname_domain_id : Text, canister_id : Principal) : () {
      let records : Types.DomainRegistrationRecords = {
        canister_id = canister_id;
        txt_domain_record_id = txt_id;
        cname_challenge_record_id = cname_challenge_id;
        cname_domain_record_id = cname_domain_id;
      };
      Map.add(subdomain_records, Text.compare, subdomain_name, records);
    };

    public func delete_subdomain_records(subdomain_name : Text) : () {
      ignore Map.delete(subdomain_records, Text.compare, subdomain_name);
    };

    /** Cloudflare API */

    private func search_dns_record_id(
      subdomain_name : Text,
      domain_name : Text,
      canister_id : Principal,
      dns_records : [Types.DnsRecord],
    ) : async Types.Response<Types.DomainRegistrationRecords> {
      if (dns_records.size() == 0) return #err(Errors.EmptyPayloadArray("DNS Records search"));

      var txt_id : ?Text = null;
      var cname_domain_id : ?Text = null;
      var cname_challenge_id : ?Text = null;
      Debug.print("Searching " # Nat.toText(dns_records.size()) # " records,,,");
      for (record in dns_records.vals()) {
        let content : Text = switch (record.content) {
          case (null) return #err(Errors.NotFound("DNS record `content`"));
          case (?val) val;
        };

        Debug.print("Record content" # debug_show (content));

        // Find txt record
        if (Text.contains(content, #text(Principal.toText(canister_id)))) {
          Debug.print("TXT record found: " # debug_show (record));

          txt_id := ?record.id;
        } else if (Text.contains(content, #text(subdomain_name # "." # domain_name # ".icp1.io"))) {
          Debug.print("cname domain record found: " # debug_show (record));
          // Find cname domain record
          cname_domain_id := ?record.id;
        } else if (Text.contains(content, #text("_acme-challenge." # domain_name # ".icp2.io"))) {
          Debug.print("cname challenge record found: " # debug_show (record));
          // Find cname challenge record
          cname_challenge_id := ?record.id;
        };
      };

      let txt_domain_record_id : Text = switch (txt_id) {
        case (null) return #err(Errors.NotFoundCloudflareRecord(subdomain_name, "TXT"));
        case (?val) val;
      };
      let cname_domain_record_id : Text = switch (cname_domain_id) {
        case (null) return #err(Errors.NotFoundCloudflareRecord(subdomain_name, "CNAME Domain"));
        case (?val) val;
      };

      let cname_challenge_record_id : Text = switch (cname_challenge_id) {
        case (null) return #err(Errors.NotFoundCloudflareRecord(subdomain_name, "CNAME Challenge"));
        case (?val) val;
      };

      let domain_registration_records : Types.DomainRegistrationRecords = {
        canister_id;
        txt_domain_record_id;
        cname_challenge_record_id;
        cname_domain_record_id;
      };

      Debug.print("Found domain registration records for canister " # Principal.toText(canister_id));
      Debug.print("Domain registration records: " # debug_show (domain_registration_records));
      return #ok(domain_registration_records);
    };

    public func find_dns_record_ids(
      subdomain_name : Text,
      domain_name : Text,
      canister_id : Principal,
      transform : Types.Transform,
    ) : async Types.Response<Types.DomainRegistrationRecords> {
      let zone_id = get_zone_id();

      let match_opts_txt : Types.CloudflareMatchOpts = {
        record_type = #txt;
        name = {
          contains = "_canister-id." # subdomain_name;
          ends_with = domain_name;
          exact = "_canister-id." # subdomain_name # "." # domain_name;
          starts_with = "_canister-id." # subdomain_name;
        };
        content = {
          contains = Principal.toText(canister_id);
          ends_with = Principal.toText(canister_id);
          exact = Principal.toText(canister_id);
          starts_with = Principal.toText(canister_id);
        };
      };

      let match_opts_cname_challenge : Types.CloudflareMatchOpts = {
        record_type = #cname_challenge;
        name = {
          contains = "_acme-challenge." # subdomain_name;
          ends_with = domain_name;
          exact = "_acme-challenge." # subdomain_name # "." # domain_name;
          starts_with = "_acme-challenge." # subdomain_name;
        };
        content = {
          contains = "_acme-challenge." # subdomain_name;
          ends_with = domain_name # ".icp2.io";
          exact = "_acme-challenge." # subdomain_name # "." # domain_name # ".icp2.io";
          starts_with = "_acme-challenge." # subdomain_name;
        };
      };

      let match_opts_cname_domain : Types.CloudflareMatchOpts = {
        record_type = #cname_domain;
        name = {
          contains = subdomain_name;
          ends_with = domain_name;
          exact = subdomain_name # "." # domain_name;
          starts_with = subdomain_name;
        };
        content = {
          contains = subdomain_name # "." # domain_name;
          ends_with = domain_name # ".icp1.io";
          exact = subdomain_name # "." # domain_name # ".icp1.io";
          starts_with = subdomain_name;
        };
      };

      let match_opts : [Types.CloudflareMatchOpts] = [
        match_opts_txt,
        match_opts_cname_challenge,
        match_opts_cname_domain,
      ];

      // let matched_records : Types.DomainRegistrationRecords = switch (await list_dns_records_with_match_opts(match_opts, canister_id, transform)) {
      //   case (#err(err)) return #err(err);
      //   case (#ok(val)) val;
      // };

      // return await search_dns_record_id(subdomain_name, domain_name, canister_id, results);

      return await list_dns_records_with_match_opts(match_opts, canister_id, transform);

    };

    public func list_dns_records(zone_id : Text, transform : Types.Transform) : async Types.Response<[Types.DnsRecord]> {
      let config : Types.CloudflareConfig = switch (_get_cloudflare_credentials()) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      let host = "api.cloudflare.com";
      let url = "https://" # host # "/client/v4/zones/" # zone_id # "/dns_records";

      // Prepare headers
      let request_headers = [
        // { name = "Authorization"; value = "Bearer " # api_key },
        { name = "X-Auth-Key"; value = config.api_key },
        { name = "X-Auth-Email"; value = config.email },
      ];

      // Await response
      let res : Types.HttpResponse = switch (await Outcall.make_http_request(#get, url, request_headers, null, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      let parsed_typed : [Types.DnsRecord] = switch (Parsing.parse_cloudflare_dns_response(res.body)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      return #ok(parsed_typed);
    };

    public func create_dns_record(payload : Types.CreateDnsRecordPayload, transform : Types.Transform) : async Types.Response<Types.DnsRecord> {
      let config : Types.CloudflareConfig = switch (_get_cloudflare_credentials()) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Validate DNS record
      if (payload.name == "" or payload.type_ == "") {
        return #err(Errors.InvalidInput("DNS record name, and type are required"));
      };

      let host = "api.cloudflare.com";
      let url = "https://" # host # "/client/v4/zones/" # payload.zone_id # "/dns_records";

      // Build JSON body with only non-empty fields
      var body_fields : [Text] = [];

      // Add required fields
      body_fields := Array.append<Text>(body_fields, ["\"name\":\"" # payload.name # "\""]);
      body_fields := Array.append<Text>(body_fields, ["\"type\":\"" # payload.type_ # "\""]);
      body_fields := Array.append<Text>(body_fields, ["\"ttl\":" # Nat.toText(payload.ttl)]);
      body_fields := Array.append<Text>(body_fields, ["\"proxied\":false"]);

      // Add optional fields only if they have values
      switch (payload.content) {
        case (null) {};
        case (?content) {
          if (Text.size(content) > 0) {
            body_fields := Array.append<Text>(body_fields, ["\"content\":\"" # content # "\""]);
          };
        };
      };

      switch (payload.comment) {
        case (null) {};
        case (?comment) {
          if (Text.size(comment) > 0) {
            body_fields := Array.append<Text>(body_fields, ["\"comment\":\"" # comment # "\""]);
          };
        };
      };

      let string_body : Text = "{" # Text.join(",", Iter.fromArray(body_fields)) # "}";

      // Validate that the JSON is properly formatted
      if (Text.size(string_body) == 0) {
        return #err(Errors.InvalidInput("Generated JSON body is empty"));
      };

      // Prepare headers
      let request_headers = [
        { name = "Content-Type"; value = "application/json" },
        // { name = "Authorization"; value = "Bearer " # api_key },
        { name = "X-Auth-Key"; value = config.api_key },
        { name = "X-Auth-Email"; value = config.email },
      ];

      // Convert Text to Blob for the HTTP request body
      let body_blob : Blob = Text.encodeUtf8(string_body);

      // Await response
      let res : Types.HttpResponse = switch (await Outcall.make_http_request(#post, url, request_headers, ?body_blob, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Check if we got an error response
      if (res.response.status != 200) {
        return #err(Errors.UnexpectedError("Cloudflare API returned HTTP " # Nat.toText(res.response.status) # ": " # res.body));
      };

      let parsed_typed : Types.DnsRecord = switch (Parsing.parse_cloudflare_create_dns_response(res.body)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      return #ok(parsed_typed);

    };

    public func list_dns_records_with_match_opts(payload : [Types.CloudflareMatchOpts], canister_id : Principal, transform : Types.Transform) : async Types.Response<Types.DomainRegistrationRecords> {
      let config : Types.CloudflareConfig = switch (_get_cloudflare_credentials()) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      if (payload.size() == 0) return #err(Errors.EmptyPayloadArray("Batch list dns records"));

      let host = "api.cloudflare.com";
      let url = "https://" # host # "/client/v4/zones/" # config.zone_id # "/dns_records";
      // let bod = [#Object(payload.txt_payload), #Object(payload.cname_challenge), #Object(payload.cname_domain)];
      // var bod : [SearchRecordsRawPayload] = [];
      // var bod = [];

      var query_paths : [Types.DomainRecordPathType] = [];
      var query_path_map : Map.Map<Text, Types.DomainRecordPathType> = Map.empty();

      // Prepare headers
      let request_headers = [
        { name = "Content-Type"; value = "application/json" },
        { name = "Authorization"; value = "Bearer " # config.api_key },
        { name = "X-Auth-Key"; value = config.api_key },
        { name = "X-Auth-Email"; value = config.email },
      ];

      // Build array of path parameter objects
      for (opt in payload.vals()) {

        // var content_query = "content.contains=" # opt.content.contains # "&content.endsWith=" # opt.content.ends_with # "&content.exact=" # opt.content.exact # "&content.startsWith=" # opt.content.starts_with;
        // var name_query = "name.contains=" # opt.content.contains # "&name.endsWith=" # opt.content.ends_with # "&name.exact=" # opt.content.exact # "&name.startsWith=" # opt.content.starts_with;
        var content_query = "content.exact=" # opt.content.exact;
        var name_query = "name.exact=" # opt.name.exact;
        var full_query = content_query # "&" # name_query;

        let rec_type = switch (opt.record_type) {
          case (#txt) {
            Map.add(query_path_map, Text.compare, "txt", { record_type = "txt"; path = full_query });
            "txt";
          };
          case (#cname_challenge) {
            Map.add(query_path_map, Text.compare, "cname_challenge", { record_type = "cname_challenge"; path = full_query });
            "cname_challenge";
          };
          case (#cname_domain) {
            Map.add(query_path_map, Text.compare, "cname_domain", { record_type = "cname_domain"; path = full_query });
            "cname_domain";
          };
        };
        let _paths = Array.append(query_paths, [{ record_type = rec_type; path = full_query }]);

        query_paths := _paths;
      };

      var records : [Types.DnsRecord] = [];
      var matched_domain_registration : ?Types.DomainRegistrationRecords = ?{
        canister_id = canister_id;
        txt_domain_record_id = "";
        cname_challenge_record_id = "";
        cname_domain_record_id = "";
      };

      for (path_item in query_paths.vals()) {
        let existing_domain_registration : Types.DomainRegistrationRecords = switch (matched_domain_registration) {
          case (null) return #err(Errors.UnexpectedError("Domain registration not found"));
          case (?val) val;
        };

        let opt = switch (Map.get(query_path_map, Text.compare, path_item.record_type)) {
          case (null) return #err(Errors.UnexpectedError("searching dns records by exact match"));
          case (?val) val;
        };

        let req_url = url # "?" # path_item.path;
        Debug.print("requesting dns records for url:" # req_url);
        // Await response
        let res : Types.HttpResponse = switch (await Outcall.make_http_request(#get, req_url, request_headers, null, transform)) {
          case (#err(err)) return #err(err);
          case (#ok(val)) val;
        };

        let parsed_typed : [Types.DnsRecord] = switch (Parsing.parse_cloudflare_dns_response(res.body)) {
          case (#err(err)) return #err(err);
          case (#ok(val)) val;
        };

        Debug.print("got records:" # debug_show (parsed_typed));

        if (parsed_typed.size() == 0) return #err(Errors.NotFoundRecord());

        let updated_records = switch (opt.record_type) {
          case ("txt") {
            {
              canister_id = canister_id;
              txt_domain_record_id = parsed_typed[0].id;
              cname_challenge_record_id = existing_domain_registration.cname_challenge_record_id;
              cname_domain_record_id = existing_domain_registration.cname_domain_record_id;
            };
          };
          case ("cname_domain") {
            {
              canister_id = canister_id;
              txt_domain_record_id = existing_domain_registration.txt_domain_record_id;
              cname_challenge_record_id = existing_domain_registration.cname_challenge_record_id;
              cname_domain_record_id = parsed_typed[0].id;
            };
          };
          case ("cname_challenge") {
            {
              canister_id = canister_id;
              txt_domain_record_id = existing_domain_registration.txt_domain_record_id;
              cname_challenge_record_id = parsed_typed[0].id;
              cname_domain_record_id = existing_domain_registration.cname_domain_record_id;
            };
          };
          case (_) return #err(Errors.UnsupportedAction("Record type"));
        };

        matched_domain_registration := ?updated_records;

        let new_records = Array.append(records, parsed_typed);
        records := new_records;
      };

      // for (path in query_paths.vals()) {
      //   let req_url = url # "?" # path;
      //   Debug.print("requesting dns records for url:" # req_url);
      //   // Await response
      //   let res : Types.HttpResponse = switch (await Outcall.make_http_request(#get, req_url, request_headers, null, transform)) {
      //     case (#err(err)) return #err(err);
      //     case (#ok(val)) val;
      //   };

      //   let parsed_typed : [Types.DnsRecord] = switch (Parsing.parse_cloudflare_dns_response(res.body)) {
      //     case (#err(err)) return #err(err);
      //     case (#ok(val)) val;
      //   };

      //   Debug.print("got records:" # debug_show (parsed_typed));

      //   let new_records = Array.append(records, parsed_typed);
      //   records := new_records;
      // };

      Debug.print("ALl matched records:" # Nat.toText(records.size()));
      Debug.print("parsed:" # debug_show (records));

      let matched_records : Types.DomainRegistrationRecords = switch (matched_domain_registration) {
        case (null) return #err(Errors.UnexpectedError("searching for domain records."));
        case (?val) val;
      };

      return #ok(matched_records);
    };

    public func batch_create_records(payload : Types.CanisterRecordsPayload, transform : Types.Transform) : async Types.Response<[Types.CreateRecordResponse]> {
      let config : Types.CloudflareConfig = switch (_get_cloudflare_credentials()) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      let host = "api.cloudflare.com";
      let url = "https://" # host # "/client/v4/zones/" # payload.zone_id # "/dns_records/batch";

      let bod = [#Object(payload.txt_payload), #Object(payload.cname_challenge), #Object(payload.cname_domain)];

      // let string_body = JSON.show(#Array(bod));

      // Build JSON body with only non-empty fields
      var body_fields_txt : [Text] = [];
      let txt_content = switch (payload.txt_payload.content) {
        case (null) {
          return #err(Errors.MissingParameter("content property for TXT"));
        };
        case (?val) { val };
      };

      // Add required fields
      body_fields_txt := Array.append<Text>(body_fields_txt, ["\"name\":\"" # payload.txt_payload.name # "\""]);
      body_fields_txt := Array.append<Text>(body_fields_txt, ["\"type\":\"" # payload.txt_payload.type_ # "\""]);
      body_fields_txt := Array.append<Text>(body_fields_txt, ["\"content\":\"" # txt_content # "\""]);
      body_fields_txt := Array.append<Text>(body_fields_txt, ["\"ttl\":" # Nat.toText(switch (payload.txt_payload.ttl) { case (null) 1; case (?val) val })]);
      // body_fields_txt := Array.append<Text>(body_fields_txt, ["\"proxied\":" # Bool.toText(switch (payload.txt_payload.proxied) { case (null) false; case (?val) val })]);

      var body_fields_cname_domain : [Text] = [];

      let target_domain = switch (payload.cname_domain.target) {
        case (null) { return #err(Errors.MissingParameter("target")) };
        case (?val) val;
      };
      let target_challenge = switch (payload.cname_challenge.target) {
        case (null) { return #err(Errors.MissingParameter("target")) };
        case (?val) val;
      };

      // Add required fields
      body_fields_cname_domain := Array.append<Text>(body_fields_cname_domain, ["\"name\":\"" # payload.cname_domain.name # "\""]);
      body_fields_cname_domain := Array.append<Text>(body_fields_cname_domain, ["\"type\":\"" # payload.cname_domain.type_ # "\""]);
      body_fields_cname_domain := Array.append<Text>(body_fields_cname_domain, ["\"content\":\"" # target_domain # "\""]);
      body_fields_cname_domain := Array.append<Text>(body_fields_cname_domain, ["\"ttl\":" # Nat.toText(switch (payload.cname_domain.ttl) { case (null) 1; case (?val) val })]);
      body_fields_cname_domain := Array.append<Text>(body_fields_cname_domain, ["\"proxied\":" # Bool.toText(switch (payload.cname_domain.proxied) { case (null) false; case (?val) val })]);

      var body_fields_cname_challenge : [Text] = [];

      // Add required fields
      body_fields_cname_challenge := Array.append<Text>(body_fields_cname_challenge, ["\"name\":\"" # payload.cname_challenge.name # "\""]);
      body_fields_cname_challenge := Array.append<Text>(body_fields_cname_challenge, ["\"type\":\"" # payload.cname_challenge.type_ # "\""]);
      body_fields_cname_challenge := Array.append<Text>(body_fields_cname_challenge, ["\"content\":\"" # target_challenge # "\""]);
      body_fields_cname_challenge := Array.append<Text>(body_fields_cname_challenge, ["\"ttl\":" # Nat.toText(switch (payload.cname_challenge.ttl) { case (null) 1; case (?val) val })]);
      body_fields_cname_challenge := Array.append<Text>(body_fields_cname_challenge, ["\"proxied\":" # Bool.toText(switch (payload.cname_challenge.proxied) { case (null) false; case (?val) val })]);

      let string_body_cname_domain : Text = "{" # Text.join(",", Iter.fromArray(body_fields_cname_domain)) # "}";
      let string_body_cname_challenge : Text = "{" # Text.join(",", Iter.fromArray(body_fields_cname_challenge)) # "}";
      let string_body_txt : Text = "{" # Text.join(",", Iter.fromArray(body_fields_txt)) # "}";

      // Validate that the JSON is properly formatted
      if (Text.size(string_body_txt) == 0) {
        return #err(Errors.InvalidInput("Generated JSON body is empty for txt record"));
      };

      // Validate that the JSON is properly formatted
      if (Text.size(string_body_cname_domain) == 0) {
        return #err(Errors.InvalidInput("Generated JSON body is empty for cname doman record"));
      };
      // Validate that the JSON is properly formatted
      if (Text.size(string_body_cname_challenge) == 0) {
        return #err(Errors.InvalidInput("Generated JSON body is empty for cname challenge record"));
      };

      let batch_body : Text = "{\"posts\":[" # string_body_txt # ", " # string_body_cname_challenge # ", " # string_body_cname_domain # "]}";

      // Prepare headers
      let request_headers = [
        { name = "Content-Type"; value = "application/json" },
        { name = "Authorization"; value = "Bearer " # config.api_key },
        { name = "X-Auth-Key"; value = config.api_key },
        { name = "X-Auth-Email"; value = config.email },
      ];

      Debug.print("Headers : " # debug_show (request_headers));
      Debug.print("BODY : " # debug_show (batch_body));

      // Convert Text to Blob for the HTTP request body
      let body_blob : Blob = Text.encodeUtf8(batch_body);

      // Await response
      let res : Types.HttpResponse = switch (await Outcall.make_http_request(#post, url, request_headers, ?body_blob, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Check if we got an error response
      if (res.response.status != 200) {
        Debug.print("Cloudflare API Error Response: " # res.body);
        if (Text.contains(res.body, #text "An A, AAAA, or CNAME record with that host already exists") == true) {
          Debug.print("Cloudflare error: Record with name " # payload.cname_domain.name # " already exists");
          return #err("Cloudflare error: Record with name " # payload.cname_domain.name # " already exists");

        };
        return #err(Errors.UnexpectedError("Cloudflare API returned HTTP " # Nat.toText(res.response.status) # ": " # res.body));
      };

      let parsed_typed : [Types.CreateRecordResponse] = switch (Parsing.parse_cloudflare_batch_create_response(res.body)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };
      return #ok(parsed_typed);
    };

    // public func update_dns_record(zone_id : Text, record_id : Text, record : Types.DnsRecord) : async Types.Response<Types.CloudflareRecord> {
    //   // Check if Cloudflare credentials are configured
    //   if (not has_cloudflare_credentials()) {
    //     return #err(Errors.CloudflareNotConfigured());
    //   };

    //   // Validate DNS record
    //   if (record.name == " " or record.content == " ") {
    //     return #err(Errors.InvalidInput("DNS record name and content are required "));
    //   };

    //   // TODO: Implement actual Cloudflare API call
    //   // PATCH /zones/{zone_id}/dns_records/{dns_record_id}
    //   // Headers: X-Auth-Email, X-Auth-Key
    //   // Body: { name, type, content, ttl, proxied }
    //   // For now, return the updated record
    //   let updated_record : Types.DnsRecord = {
    //     id = record_id;
    //     name = record.name;
    //     type_ = " ";
    //     content = record.content;
    //     ttl = record.ttl;
    //     proxied = record.proxied;
    //   };

    //   return #ok(updated_record);
    // };

    // public func get_dns_zones() : async Types.Response<[Types.DnsZone]> {
    //   // Check if Cloudflare credentials are configured
    //   if (not has_cloudflare_credentials()) {
    //     return #err(Errors.CloudflareNotConfigured());
    //   };

    //   // TODO: Implement actual Cloudflare API call
    //   // GET /zones
    //   // Headers: X-Auth-Email, X-Auth-Key
    //   // For now, return empty array
    //   return #ok([]);
    // };

    // public func get_dns_record(zone_id : Text, record_id : Text) : async Types.Response<Types.DnsRecord> {
    //   // Check if Cloudflare credentials are configured
    //   if (not has_cloudflare_credentials()) {
    //     return #err(Errors.CloudflareNotConfigured());
    //   };

    //   // TODO: Implement actual Cloudflare API call
    //   // GET /zones/{zone_id}/dns_records/{dns_record_id}
    //   // Headers: X-Auth-Email, X-Auth-Key
    //   // For now, return a mock record
    //   let mock_record : Types.CloudflareRecord = {
    //     id = record_id;
    //     name = "www.example.com";
    //     type_ = "";
    //     content = "192.168.1.1";
    //     proxiable = false;
    //     proxied = false;
    //     ttl = 120;
    //     settings = { flatten_cname = false };
    //     meta = {};
    //     comment = ?"comments";
    //     tags = ["tag"];
    //     created_on = Nat.toText(Int.abs(Utility.get_time_now(#milliseconds)));
    //     modified_on = Nat.toText(Int.abs(Utility.get_time_now(#milliseconds)));
    //   };

    //   return #ok(mock_record);
    // };

    // public func delete_dns_record(zone_id : Text, record_id : Text) : async Types.Response<Bool> {
    //   // Check if Cloudflare credentials are configured
    //   if (not has_cloudflare_credentials()) {
    //     return #err(Errors.CloudflareNotConfigured());
    //   };

    //   // TODO: Implement actual Cloudflare API call
    //   // DELETE /zones/{zone_id}/dns_records/{dns_record_id}
    //   // Headers: X-Auth-Email, X-Auth-Key
    //   // For now, return success
    //   return #ok(true);
    // };

    // Helper function to check if Cloudflare credentials are set
    private func has_cloudflare_credentials() : Bool {
      switch (CLOUDFLARE_EMAIL, CLOUDFLARE_API_KEY) {
        case (?email, ?api_key) { true };
        case (_, _) { false };
      };
    };

    /** End Class*/
  };
  /** End Module*/
};
