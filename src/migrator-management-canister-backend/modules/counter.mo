import Types "../types";
import Map "mo:core/Map";
import Text "mo:base/Text";
import Utility "../utils/Utility";
module {
  public class IndexCounter(counter_map_init : Types.CounterMap) {
    public var map : Types.CounterMap = counter_map_init;

    public func get_index(index_type : Types.CounterType) : Nat {
      let current_id = switch (Map.get(map, Utility.compare_counter_type, index_type)) {
        case (null) {
          Map.add(map, Utility.compare_counter_type, index_type, 0);
          0;
        };
        case (?val) {
          val;
        };
      };
      return current_id;
    };

    public func reset_index(index_type : Types.CounterType) : () {
      Map.add(map, Utility.compare_counter_type, index_type, 0);
    };

    public func increment_index(index_type : Types.CounterType) : () {
      let current_id = get_index(index_type);
      Map.add(map, Utility.compare_counter_type, index_type, current_id + 1);
    };
  };
};
