import Debug "mo:base/Debug";
import Types "../types";
module {
    // Utility function that helps writing assertion-driven code more concisely.
    public func expect<T>(opt : ?T, violation_msg : Text) : T {
        switch (opt) {
            case (null) {
                Debug.trap(violation_msg);
            };
            case (?x) {
                x;
            };
        };
    };
    public func expect_else<T>(opt : ?T, fallback_value : T) : T {
        switch (opt) {
            case (null) {
                fallback_value;
            };
            case (?x) {
                x;
            };
        };
    };

    public func evaluate<T>(predicate : Bool, truth_value : T, false_value : T) : T {
        switch (predicate) {
            case (true) {
                truth_value;
            };
            case (false) {
                false_value;
            };
        };
    };

    public func resolve<T>(value : Types.Response<T>) : T {
        switch (value) {
            case (#ok(_ok)) {
                return _ok;
            };
            case (#err(_msg)) {
                Debug.trap("Resolve response trapped with error: " # _msg);
            };
        };
    }

};
