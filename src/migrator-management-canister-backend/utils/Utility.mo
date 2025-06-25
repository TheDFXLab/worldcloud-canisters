import Debug "mo:base/Debug";

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

};
