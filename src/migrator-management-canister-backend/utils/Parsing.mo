import Types "../types";
import JSON "mo:json.mo/JSON";
import Debug "mo:base/Debug";

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
};
