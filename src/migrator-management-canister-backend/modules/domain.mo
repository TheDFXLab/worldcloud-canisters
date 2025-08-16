import Types "../types";
import Principal "mo:base/Principal";
import Cloudflare "cloudflare";
import Errors "errors";

module {
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

  // List DNS records for a zone
  public func list_dns_records(zone_id : Text, transform : Types.Transform, cloudflare : Types.Cloudflare) : async Types.Response<[Types.CloudflareRecord]> {
    return await cloudflare.list_dns_records(zone_id, transform);
  };

  // Create a new DNS record
  public func create_dns_record(zone_id : Text, record : Types.DnsRecord, cloudflare : Types.Cloudflare) : async Types.Response<Types.DnsRecord> {
    return await cloudflare.create_dns_record(zone_id, record);
  };

  // Update an existing DNS record
  public func update_dns_record(zone_id : Text, record_id : Text, record : Types.DnsRecord, cloudflare : Types.Cloudflare) : async Types.Response<Types.DnsRecord> {

    // // Check if Cloudflare credentials are configured
    // if (not hasCloudflareCredentials()) {
    //   return #err(Errors.CloudflareNotConfigured());
    // };

    // // Validate DNS record
    // if (record.name == "" or record.content == "") {
    //   return #err(Errors.InvalidInput("DNS record name and content are required"));
    // };

    // // TODO: Implement actual Cloudflare API call
    // // PATCH /zones/{zone_id}/dns_records/{dns_record_id}
    // // Headers: X-Auth-Email, X-Auth-Key
    // // Body: { name, type, content, ttl, proxied }
    // // For now, return the updated record
    // let updated_record : Types.DnsRecord = {
    //   id = record_id;
    //   zone_id = zone_id;
    //   zone_name = record.zone_name;
    //   name = record.name;
    //   dns_type = record.dns_type;
    //   content = record.content;
    //   ttl = record.ttl;
    //   proxied = record.proxied;
    //   created_on = record.created_on;
    //   modified_on = Int.abs(Utility.get_time_now(#milliseconds));
    // };

    // return #ok(updated_record);

    return await cloudflare.update_dns_record(zone_id, record_id, record);
  };

  // Delete a DNS record
  // public shared (msg) func deleteDnsRecord(zone_id : Text, record_id : Text) : async Types.Response<Bool> {
  //   if (not access_control.is_authorized(msg.caller)) {
  //     return #err(Errors.Unauthorized());
  //   };

  //   // Check if Cloudflare credentials are configured
  //   if (not hasCloudflareCredentials()) {
  //     return #err(Errors.CloudflareNotConfigured());
  //   };

  //   // TODO: Implement actual Cloudflare API call
  //   // DELETE /zones/{zone_id}/dns_records/{dns_record_id}
  //   // Headers: X-Auth-Email, X-Auth-Key
  //   // For now, return success
  //   return #ok(true);
  // };

  // // Get a specific DNS record
  // public shared query (msg) func getDnsRecord(zone_id : Text, record_id : Text) : async Types.Response<Types.DnsRecord> {
  //   if (not access_control.is_authorized(msg.caller)) {
  //     return #err(Errors.Unauthorized());
  //   };

  //   // Check if Cloudflare credentials are configured
  //   if (not hasCloudflareCredentials()) {
  //     return #err(Errors.CloudflareNotConfigured());
  //   };

  //   // TODO: Implement actual Cloudflare API call
  //   // GET /zones/{zone_id}/dns_records/{dns_record_id}
  //   // Headers: X-Auth-Email, X-Auth-Key
  //   // For now, return a mock record
  //   let mock_record : Types.DnsRecord = {
  //     id = record_id;
  //     zone_id = zone_id;
  //     zone_name = "example.com";
  //     name = "www.example.com";
  //     dns_type = #A;
  //     content = "192.168.1.1";
  //     ttl = 120;
  //     proxied = false;
  //     created_on = Int.abs(Utility.get_time_now(#milliseconds));
  //     modified_on = Int.abs(Utility.get_time_now(#milliseconds));
  //   };

  //   return #ok(mock_record);
  // };

  // // Get DNS zones (domains)
  // public shared query (msg) func getDnsZones() : async Types.Response<[Types.DnsZone]> {
  //   // Check if Cloudflare credentials are configured
  //   if (not hasCloudflareCredentials()) {
  //     return #err(Errors.CloudflareNotConfigured());
  //   };

  //   // TODO: Implement actual Cloudflare API call
  //   // GET /zones
  //   // Headers: X-Auth-Email, X-Auth-Key
  //   // For now, return empty array
  //   return #ok([]);
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
