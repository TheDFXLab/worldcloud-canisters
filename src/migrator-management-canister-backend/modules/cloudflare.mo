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

    public func find_dns_record_ids(subdomain_name : Text, domain_name : Text, canister_id : Principal, transform : Types.Transform) : async Types.Response<Types.DomainRegistrationRecords> {
      let zone_id = get_zone_id();
      let dns_records : [Types.DnsRecord] = switch (await list_dns_records(zone_id, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      var txt_id : ?Text = null;
      var cname_domain_id : ?Text = null;
      var cname_challenge_id : ?Text = null;

      for (record in dns_records.vals()) {
        let content : Text = switch (record.content) {
          case (null) return #err(Errors.NotFound("DNS record `content`"));
          case (?val) val;
        };

        // Find txt record
        if (Text.contains(content, #text(Principal.toText(canister_id)))) {
          txt_id := ?record.id;
        } else if (Text.contains(content, #text(subdomain_name # "." # domain_name # ".icp1.io"))) {
          // Find cname domain record
          cname_domain_id := ?record.id;
        } else if (Text.contains(content, #text("_acme-challenge." # domain_name # ".icp2.io"))) {
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

      return #ok(domain_registration_records);
    };

    public func list_dns_records(zone_id : Text, transform : Types.Transform) : async Types.Response<[Types.DnsRecord]> {
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

      let host = "api.cloudflare.com";
      let url = "https://" # host # "/client/v4/zones/" # zone_id # "/dns_records";

      // Prepare headers
      let request_headers = [
        // { name = "Authorization"; value = "Bearer " # api_key },
        { name = "X-Auth-Key"; value = api_key },
        { name = "X-Auth-Email"; value = email },
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

    public func create_dns_record(payload : Types.CreateDnsRecordPayload, transform : Types.Transform) : async Types.Response<Types.DnsRecord> {
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
        { name = "X-Auth-Key"; value = api_key },
        { name = "X-Auth-Email"; value = email },
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

    public func batch_create_records(payload : Types.CanisterRecordsPayload, transform : Types.Transform) : async Types.Response<[Types.CreateRecordResponse]> {
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
        { name = "Authorization"; value = "Bearer " # api_key },
        { name = "X-Auth-Key"; value = api_key },
        { name = "X-Auth-Email"; value = email },
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
