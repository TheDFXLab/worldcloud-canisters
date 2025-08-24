import Types "../types";
import JSON "mo:json.mo/JSON";
import Debug "mo:base/Debug";
import Array "mo:base/Array";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Iter "mo:base/Iter";

module {
  public func parse_coinbase_price_response(decoded_text : Text) : Types.Response<Types.CandleData> {
    let parsed = JSON.parse(decoded_text);
    Debug.print("Parsed " # debug_show (parsed));

    // Expected JSON structure from Coinbase API:
    // [[timestamp, low, high, open, close, volume], ...]
    // where timestamp is a number and others are floats
    let obj = switch (parsed) {
      case (?#Array(objays)) {
        Debug.print("Array of objay" # debug_show (objays));

        if (objays.size() == 0) {
          return #err("No candle data received");
        };

        switch (objays[0]) {
          case (#Array(inner)) {
            Debug.print("Inner" # debug_show (inner));

            if (inner.size() < 6) {
              return #err("Invalid candle data format - expected 6 elements");
            };

            // Extract the first candle data
            let timestamp = switch (inner[0]) {
              case (#Number(n)) { n };
              case _ {
                return #err("Invalid timestamp format - expected number, got: " # debug_show (inner[0]));
              };
            };

            let low = switch (inner[1]) {
              case (#Float(f)) { f };
              case _ {
                return #err("Invalid low price format - expected float, got: " # debug_show (inner[1]));
              };
            };

            let high = switch (inner[2]) {
              case (#Float(f)) { f };
              case _ {
                return #err("Invalid high price format - expected float, got: " # debug_show (inner[2]));
              };
            };

            let open = switch (inner[3]) {
              case (#Float(f)) { f };
              case _ {
                return #err("Invalid open price format - expected float, got: " # debug_show (inner[3]));
              };
            };

            let close = switch (inner[4]) {
              case (#Float(f)) { f };
              case _ {
                return #err("Invalid close price format - expected float, got: " # debug_show (inner[4]));
              };
            };

            let volume = switch (inner[5]) {
              case (#Float(f)) { f };
              case _ {
                return #err("Invalid volume format - expected float, got: " # debug_show (inner[5]));
              };
            };

            // Validate that the data makes sense
            if (low < 0 or high < 0 or open < 0 or close < 0 or volume < 0) {
              return #err("Invalid price data - negative values not allowed");
            };

            if (low > high) {
              return #err("Invalid price data - low price cannot be greater than high price");
            };

            let obj : Types.CandleData = {
              timestamp = timestamp;
              low = low;
              high = high;
              open = open;
              close = close;
              volume = volume;
            };

            Debug.print("Parsed candle data: " # debug_show (obj));
            obj;
          };
          case _ { return #err("unexpected error") };
        };
      };
      case _ { return #err("Unexpected JSON structure") };
    };

    return #ok(obj);
  };

  // ===== GENERIC JSON PARSING UTILITIES =====

  /// Generic function to safely extract a field from a JSON object
  public func get_field<T>(fields : [(Text, JSON.JSON)], key : Text, default_value : T, parser : JSON.JSON -> T) : T {
    let field = Array.find<(Text, JSON.JSON)>(fields, func(field) { field.0 == key });
    switch (field) {
      case (?field) { parser(field.1) };
      case (null) { default_value };
    };
  };

  /// Parse string field with default
  public func get_string(fields : [(Text, JSON.JSON)], key : Text, default_value : Text) : Text {
    get_field<Text>(
      fields,
      key,
      default_value,
      func(value) : Text {
        switch (value) {
          case (#String(s)) { s };
          case _ { default_value };
        };
      },
    );
  };

  /// Parse boolean field with default
  public func get_bool(fields : [(Text, JSON.JSON)], key : Text, default_value : Bool) : Bool {
    get_field<Bool>(
      fields,
      key,
      default_value,
      func(value) : Bool {
        switch (value) {
          case (#Boolean(b)) { b };
          case _ { default_value };
        };
      },
    );
  };

  /// Parse number field with default
  public func get_number(fields : [(Text, JSON.JSON)], key : Text, default_value : Int) : Int {
    get_field<Int>(
      fields,
      key,
      default_value,
      func(value) : Int {
        switch (value) {
          case (#Number(n)) { Int.abs(n) };
          case _ { default_value };
        };
      },
    );
  };

  /// Parse optional string field
  public func get_optional_string(fields : [(Text, JSON.JSON)], key : Text) : ?Text {
    let field = Array.find<(Text, JSON.JSON)>(fields, func(field) { field.0 == key });
    switch (field) {
      case (?field) {
        switch (field.1) {
          case (#String(s)) { ?s };
          case (#Null) { null };
          case _ { null };
        };
      };
      case (null) { null };
    };
  };

  /// Parse array field with custom parser
  public func get_array<T>(fields : [(Text, JSON.JSON)], key : Text, default_value : [T], parser : JSON.JSON -> T) : [T] {
    let field = Array.find<(Text, JSON.JSON)>(fields, func(field) { field.0 == key });
    switch (field) {
      case (?field) {
        switch (field.1) {
          case (#Array(arr)) {
            Array.map<JSON.JSON, T>(arr, parser);
          };
          case _ { default_value };
        };
      };
      case (null) { default_value };
    };
  };

  /// Parse nested object field
  public func get_object(fields : [(Text, JSON.JSON)], key : Text) : ?[(Text, JSON.JSON)] {
    let field = Array.find<(Text, JSON.JSON)>(fields, func(field) { field.0 == key });
    switch (field) {
      case (?field) {
        switch (field.1) {
          case (#Object(obj_fields)) { ?obj_fields };
          case _ { null };
        };
      };
      case (null) { null };
    };
  };

  /// Generic function to extract array from response with "result" field
  public func extract_result_array(parsed : ?JSON.JSON) : Types.Response<[JSON.JSON]> {
    switch (parsed) {
      case (?#Object(fields)) {
        let result_field = Array.find<(Text, JSON.JSON)>(fields, func(field) { field.0 == "result" });
        switch (result_field) {
          case (?field) {
            switch (field.1) {
              case (#Array(records)) { #ok(records) };
              case _ { #err("'result' field is not an array") };
            };
          };
          case (null) { #err("Missing 'result' field in response") };
        };
      };
      case _ { #err("Unexpected JSON structure - expected object") };
    };
  };

  // ===== SPECIFIC PARSERS USING GENERIC UTILITIES =====

  private func parse_cloudflare_create_dns_record(record : JSON.JSON) : Types.CreateRecordResponse {
    switch (record) {
      case (#Object(record_fields)) {
        let settings_obj = get_object(record_fields, "settings");
        let flatten_cname = switch (settings_obj) {
          case (?settings_fields) {
            get_bool(settings_fields, "flatten_cname", false);
          };
          case (null) { false };
        };

        {
          id = get_string(record_fields, "id", "");
          name = get_string(record_fields, "name", "");
          type_ = get_string(record_fields, "type", "");
          content = get_string(record_fields, "content", "");
          proxiable = get_bool(record_fields, "proxiable", false);
          proxied = get_bool(record_fields, "proxied", false);
          ttl = Int.abs(get_number(record_fields, "ttl", 1));
          created_on = get_string(record_fields, "created_on", "");
          modified_on = get_string(record_fields, "modified_on", "");
        };
      };
      case _ {
        // Return default values if record is not an object
        {
          id = "";
          name = "";
          type_ = "";
          content = "";
          proxied = false;
          proxiable = false;
          ttl = 1;
          created_on = "";
          modified_on = "";
        };
      };
    };
  };

  private func parse_cloudflare_dns_record(record : JSON.JSON) : Types.DnsRecord {
    switch (record) {
      case (#Object(record_fields)) {
        let settings_obj = get_object(record_fields, "settings");
        let flatten_cname = switch (settings_obj) {
          case (?settings_fields) {
            get_bool(settings_fields, "flatten_cname", false);
          };
          case (null) { false };
        };

        {
          id = get_string(record_fields, "id", "");
          name = get_string(record_fields, "name", "");
          type_ = get_string(record_fields, "type", "");
          content = ?get_string(record_fields, "content", "");
          // proxiable = get_bool(record_fields, "proxiable", false);
          proxied = ?get_bool(record_fields, "proxied", false);
          ttl = Int.abs(get_number(record_fields, "ttl", 1));
          settings = ?{
            ipv4_only = ?get_bool(record_fields, "ipv4_only", false);
            ipv6_only = ?get_bool(record_fields, "ipv6_only", false);
          };
          // settings = { flatten_cname = flatten_cname };
          // meta = {};
          comment = get_optional_string(record_fields, "comment");
          tags = ?get_array<Text>(
            record_fields,
            "tags",
            [],
            func(tag) : Text {
              switch (tag) {
                case (#String(s)) { s };
                case _ { "" };
              };
            },
          );
          // created_on = get_string(record_fields, "created_on", "");
          // modified_on = get_string(record_fields, "modified_on", "");
        };
      };
      case _ {
        // Return default values if record is not an object
        {
          id = "";
          name = "";
          type_ = "";
          content = ?"";
          // proxiable = false;
          proxied = ?false;
          ttl = 1;
          settings = ?{
            ipv4_only = null;
            ipv6_only = null;
          };
          // settings = { flatten_cname = false };
          // meta = {};
          comment = null;
          tags = ?[];
          // created_on = "";
          // modified_on = "";
        };
      };
    };
  };

  public func parse_record_response(decoded_text : Text) : Types.Response<Types.DnsRecord> {
    let parsed = JSON.parse(decoded_text);
    Debug.print("Parsed Cloudflare response: " # debug_show (parsed));

    let response = switch (extract_result_array(parsed)) {
      case (#ok(records)) { records };
      case (#err(err)) { return #err(err) };
    };

    let parsed_records = parse_cloudflare_dns_record(response[0]);
    return #ok(parsed_records);
  };
  /// Parses Cloudflare DNS records response using generic utilities
  public func parse_cloudflare_dns_response(decoded_text : Text) : Types.Response<[Types.DnsRecord]> {
    let parsed = JSON.parse(decoded_text);
    Debug.print("Parsed Cloudflare response: " # debug_show (parsed));

    let response = switch (extract_result_array(parsed)) {
      case (#ok(records)) { records };
      case (#err(err)) { return #err(err) };
    };

    // Parse each DNS record using generic utilities
    let parsed_records = Array.map<JSON.JSON, Types.DnsRecord>(
      response,
      parse_cloudflare_dns_record,
    );

    Debug.print("Parsed " # Nat.toText(parsed_records.size()) # " DNS records");
    return #ok(parsed_records);
  };

  public func parse_cloudflare_create_dns_response(decoded_text : Text) : Types.Response<Types.DnsRecord> {
    let parsed = JSON.parse(decoded_text);
    Debug.print("Parsed Cloudflare create DNS response: " # debug_show (parsed));

    // First check if the request was successful
    let success = switch (parsed) {
      case (?#Object(fields)) {
        get_bool(fields, "success", false);
      };
      case _ { return #err("Invalid response format - expected object") };
    };

    if (not success) {
      // Handle error case
      let errors = get_array<Text>(
        switch (parsed) {
          case (?#Object(fields)) { fields };
          case _ { return #err("Invalid response format") };
        },
        "errors",
        [],
        func(error) : Text {
          switch (error) {
            case (#String(s)) { s };
            case _ { "Unknown error" };
          };
        },
      );
      return #err("Cloudflare API error: " # Text.join(", ", errors.vals()));
    };

    // Extract the result object
    let result_obj : [(Text, JSON.JSON)] = switch (
      get_object(
        switch (parsed) {
          case (?#Object(fields)) { fields };
          case _ { return #err("Invalid response format") };
        },
        "result",
      )
    ) {
      case (?obj) { obj };
      case (null) { return #err("Missing 'result' field in response") };
    };

    // Parse the DNS record using existing function
    let dns_record : Types.DnsRecord = parse_cloudflare_dns_record(result_obj[0].1);
    return #ok(dns_record);
  };
  public func parse_cloudflare_batch_create_response(decoded_text : Text) : Types.Response<[Types.CreateRecordResponse]> {
    let parsed = JSON.parse(decoded_text);
    Debug.print("Parsed Cloudflare batch create response: " # debug_show (parsed));

    // First check if the request was successful
    let success = switch (parsed) {
      case (?#Object(fields)) {
        get_bool(fields, "success", false);
      };
      case _ { return #err("Invalid response format - expected object") };
    };

    if (not success) {
      // Handle error case
      let errors = get_array<Text>(
        switch (parsed) {
          case (?#Object(fields)) { fields };
          case _ { return #err("Invalid response format") };
        },
        "errors",
        [],
        func(error) : Text {
          switch (error) {
            case (#String(s)) { s };
            case _ { "Unknown error" };
          };
        },
      );
      return #err("Cloudflare API error: " # Text.join(", ", errors.vals()));
    };

    // Extract the result object
    let result_obj = switch (
      get_object(
        switch (parsed) {
          case (?#Object(fields)) { fields };
          case _ { return #err("Invalid response format") };
        },
        "result",
      )
    ) {
      case (?obj) { obj };
      case (null) { return #err("Missing 'result' field in response") };
    };

    Debug.print("Result object: " # debug_show (result_obj));

    // Extract the posts array from result
    let posts_array : [JSON.JSON] = switch (
      Array.find<(Text, JSON.JSON)>(result_obj, func(field) { field.0 == "posts" })
    ) {
      case (?field) {
        switch (field.1) {
          case (#Array(posts)) { posts };
          case _ { return #err("'posts' field is not an array") };
        };
      };
      case (null) { return #err("Missing 'posts' field in result") };
    };

    let parsed_records = Array.map<JSON.JSON, Types.CreateRecordResponse>(
      posts_array,
      parse_cloudflare_create_dns_record,
    );

    Debug.print("Parsed " # Nat.toText(parsed_records.size()) # " DNS records from batch create");
    Debug.print("Result: " #debug_show (parsed_records));
    return #ok(parsed_records);
  };

  // public func parse_register_ic_domain_response(decoded_text : Text) : Types.Response<(Types.RegisterDomainSuccessResponse)> {
  //   let parsed = JSON.parse(decoded_text);
  //   Debug.print("Parsed result: " # debug_show (parsed));
  //   // Extract response object
  //   let result_obj : [(Text, JSON.JSON)] = switch (
  //     get_object(
  //       switch (parsed) {
  //         case (?#Object(fields)) { fields };
  //         case _ { return #err("Invalid response format") };
  //       },
  //       "id",
  //     )
  //   ) {
  //     case (?obj) { obj };
  //     case (null) { return #err("Missing 'result' field in response") };
  //   };

  //   let _id = switch (result_obj[0].1) {
  //     case (#Object(record_fields)) {
  //       let id = get_string(record_fields, "id", "");
  //       id;
  //     };
  //     case _ { return #err("Failed to parse") };
  //   };

  //   return #ok({ id = _id });
  // };

  public func parse_register_ic_domain_response(decoded_text : Text) : Types.Response<Types.RegisterDomainSuccessResponse> {
    let parsed = JSON.parse(decoded_text);
    Debug.print("Parsed result: " # debug_show (parsed));

    let fields : [(Text, JSON.JSON)] = switch (parsed) {
      case (?#Object(fields)) { fields };
      case _ { return #err("Invalid response format - expected object") };
    };

    // Use helper function
    let id = get_string(fields, "id", "");

    if (id == "") {
      return #err("Missing or invalid 'id' field in response");
    };

    return #ok({ id = id });
  };
  /** END Module */
};
