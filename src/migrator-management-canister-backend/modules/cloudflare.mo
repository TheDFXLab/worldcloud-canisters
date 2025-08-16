import Types "../types";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Errors "errors";
import Outcall "outcall";
import Parsing "../utils/Parsing";
import Utility "../utils/Utility";

module {
  public class Cloudflare(base_url_init : Text, email_init : ?Text, api_key_init : ?Text) {
    var CLOUDFLARE_API_BASE_URL : Text = base_url_init;
    var CLOUDFLARE_EMAIL : ?Text = email_init;
    var CLOUDFLARE_API_KEY : ?Text = api_key_init;

    public func get_cloudflare_credentials() : Types.Response<{ email : ?Text; api_key : ?Text }> {
      return #ok({
        email = CLOUDFLARE_EMAIL;
        api_key = CLOUDFLARE_API_KEY;
      });
    };

    public func set_cloudflare_credentials(email : Text, api_key : Text) : Types.Response<()> {
      CLOUDFLARE_EMAIL := ?email;
      CLOUDFLARE_API_KEY := ?api_key;
      return #ok();
    };

    public func list_dns_records(zone_id : Text, transform : Types.Transform) : async Types.Response<[Types.CloudflareRecord]> {
      // Check if Cloudflare credentials are configured
      if (not has_cloudflare_credentials()) {
        return #err(Errors.CloudflareNotConfigured());
      };

      let api_key : Text = switch (CLOUDFLARE_API_KEY) {
        case (null) return #err(Errors.NotFoundCloudflareApiKey());
        case (?val) val;
      };

      let host = "api.cloudflare.com";
      let url = "https://" # host # "/client/v4/zones/" # zone_id # "/dns_records";
      Debug.print("URL: " # url);
      // Prepare headers
      let request_headers = [
        { name = "Authorization"; value = "Bearer " # api_key },
      ];

      // Await response
      let res : Types.HttpResponse = switch (await Outcall.make_http_request(#get, url, request_headers, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      let parsed_typed : [Types.CloudflareRecord] = switch (Parsing.parse_cloudflare_dns_response(res.body)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      Debug.print("Parsed types res list dns records: " # debug_show (parsed_typed));
      return #ok(parsed_typed);
    };

    public func create_dns_record(zone_id : Text, record : Types.DnsRecord) : async Types.Response<Types.DnsRecord> {
      // Check if Cloudflare credentials are configured
      if (not has_cloudflare_credentials()) {
        return #err(Errors.CloudflareNotConfigured());
      };

      // Validate DNS record
      if (record.name == "" or record.content == "") {
        return #err(Errors.InvalidInput("DNS record name and content are required"));
      };

      let created_record : Types.DnsRecord = {
        id = "dns_record_" # Nat.toText(Int.abs(Utility.get_time_now(#milliseconds)));
        zone_id = zone_id;
        zone_name = record.zone_name;
        name = record.name;
        dns_type = record.dns_type;
        content = record.content;
        ttl = record.ttl;
        proxied = record.proxied;
        created_on = Int.abs(Utility.get_time_now(#milliseconds));
        modified_on = Int.abs(Utility.get_time_now(#milliseconds));
      };

      return #ok(created_record);
    };

    public func update_dns_record(zone_id : Text, record_id : Text, record : Types.DnsRecord) : async Types.Response<Types.DnsRecord> {
      // Check if Cloudflare credentials are configured
      if (not has_cloudflare_credentials()) {
        return #err(Errors.CloudflareNotConfigured());
      };

      // Validate DNS record
      if (record.name == "" or record.content == "") {
        return #err(Errors.InvalidInput("DNS record name and content are required"));
      };

      // TODO: Implement actual Cloudflare API call
      // PATCH /zones/{zone_id}/dns_records/{dns_record_id}
      // Headers: X-Auth-Email, X-Auth-Key
      // Body: { name, type, content, ttl, proxied }
      // For now, return the updated record
      let updated_record : Types.DnsRecord = {
        id = record_id;
        zone_id = zone_id;
        zone_name = record.zone_name;
        name = record.name;
        dns_type = record.dns_type;
        content = record.content;
        ttl = record.ttl;
        proxied = record.proxied;
        created_on = record.created_on;
        modified_on = Int.abs(Utility.get_time_now(#milliseconds));
      };

      return #ok(updated_record);
    };

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
