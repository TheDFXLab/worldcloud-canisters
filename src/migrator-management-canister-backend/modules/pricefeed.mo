import Types "../types";
import Int "mo:base/Int";
import Nat64 "mo:base/Nat64";
import Debug "mo:base/Debug";
import Constants "../utils/constants";
import Utility "../utils/Utility";
import Outcall "outcall";
import Parsing "../utils/Parsing";

module {
  public class PriceFeed() {
    public var icp_last_price : Types.TokenPrice = {
      value = 0.0;
      last_updated_seconds = 0;
    };
    public var is_updating_icp_price = false;

    /// Fetches the current ICP price from Coinbase API
    /// Returns the most recent candle data including timestamp, open, high, low, close, and volume
    /// The data represents 1-minute intervals from the Coinbase exchange
    public func get_icp_price(transform : Types.Transform) : async Types.Response<Float> {
      // Construct url
      // let ONE_MINUTE : Nat64 = 60;
      let FIVE_MINUTES : Nat64 = 5 * 60;
      let end_timestamp : Nat64 = Nat64.fromNat(Int.abs(Utility.get_time_now(#seconds)));
      let start_timestamp : Nat64 = end_timestamp - FIVE_MINUTES;
      let host : Text = "api.exchange.coinbase.com";
      let url = "https://" # host # "/products/ICP-USD/candles?start=" # Nat64.toText(start_timestamp) # "&end=" # Nat64.toText(end_timestamp) # "&granularity=" # Nat64.toText(FIVE_MINUTES);

      // Prepare headers
      let request_headers = [
        { name = "User-Agent"; value = "price-feed" },
      ];

      // Await response
      let res : Types.HttpResponse = switch (await Outcall.make_http_request(#get, url, request_headers, null, transform)) {
        case (#err(err)) return #err(err);
        case (#ok(val)) val;
      };

      // Parse Candle data
      let candle_data : Types.CandleData = switch (Parsing.parse_coinbase_price_response(res.body)) {
        case (#err(err)) { return #err(err) };
        case (#ok(val)) { val };
      };
      Debug.print("ICP PRICE RESPONSE:" # debug_show (candle_data));

      // Return the open price
      #ok(candle_data.open);
    };

    public func update_icp_price(transform : Types.Transform) : async Types.Response<Types.TokenPrice> {
      if (is_updating_icp_price == true) return #ok(icp_last_price);

      // Lock procedure
      is_updating_icp_price := true;

      // Bug protection in case lastupdated is in the future
      let now : Nat = Int.abs(Utility.get_time_now(#seconds));
      if (now < icp_last_price.last_updated_seconds) {
        icp_last_price := { value = 0.0; last_updated_seconds = 0 };
      };

      // Return current price stored in memory
      let new_price = if (now - icp_last_price.last_updated_seconds < Constants.REFRESH_PRICE_INTERVAL_SECONDS and icp_last_price.value != 0.0 and icp_last_price.last_updated_seconds != 0) {

        icp_last_price;
      } else {
        // Update token price
        let usd_price : Float = switch (await get_icp_price(transform)) {
          case (#err(err)) {
            // Release lock
            is_updating_icp_price := false;
            return #err(err);
          };
          case (#ok(val)) { val };
        };

        icp_last_price := {
          value = usd_price;
          last_updated_seconds = Int.abs(Utility.get_time_now(#seconds));
        };

        icp_last_price;
      };

      // Release lock
      is_updating_icp_price := false;
      return #ok(icp_last_price);
    };
  };

};
