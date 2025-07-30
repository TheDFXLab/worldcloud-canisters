import Debug "mo:base/Debug";
import Types "../types";
import Error "mo:base/Error";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Principal "mo:base/Principal";
import Errors "../modules/errors";

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
  public func expect_soft<T>(opt : ?T) : ?T {
    switch (opt) {
      case (null) {
        // Debug.trap(violation_msg);
        null;
      };
      case (?x) {
        ?x;
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
  };

  public func resolve_else_null<T>(value : Types.Response<T>) : ?T {
    switch (value) {
      case (#ok(_ok)) {
        return ?_ok;
      };
      case (#err(_msg)) {
        null;
      };
    };
  };

  // Chain responses together, short-circuiting on first error
  public func chain<A, B>(response : Types.Response<A>, f : (A) -> Types.Response<B>) : Types.Response<B> {
    switch (response) {
      case (#err(e)) { #err(e) };
      case (#ok(a)) { f(a) };
    };
  };

  // Convert a response to another type while preserving the error
  public func map<A, B>(response : Types.Response<A>, f : (A) -> B) : Types.Response<B> {
    switch (response) {
      case (#err(e)) { #err(e) };
      case (#ok(a)) { #ok(f(a)) };
    };
  };

  // Unwrap a response or return early with the error
  public func unwrap<T>(response : Types.Response<T>, context : Text) : T {
    switch (response) {
      case (#ok(val)) { val };
      case (#err(e)) {
        Debug.trap(context # ": " # e);
      };
    };
  };

  public func get_time_now(format : Types.TimeFormat) : Int {
    let divisor = switch (format) {
      case (#nanoseconds) { 1 };
      case (#microseconds) { 1_000 };
      case (#milliseconds) { 1_000_000 };
      case (#seconds) { 1_000_000_000 };
    };

    return Int.abs(Time.now() / divisor);
  };

  public func assert_not_anonymous(principal : Principal) : Types.Response<()> {
    if (Principal.isAnonymous(principal)) {
      return #err(Errors.Unauthorized());
    } else {
      return #ok();
    };
  };

  public func is_anonymous(principal : Principal) : Bool {
    if (Principal.isAnonymous(principal)) {
      return true;
    } else {
      return false;
    };
  };
  public func get_quota_scheduler_seconds() : Types.QuotaSchedulerSeconds {
    let now = get_time_now(#seconds);

    // Calculate seconds until next midnight (UTC)
    let seconds_in_day : Nat = 24 * 60 * 60; // 86400 seconds
    let seconds_since_midnight : Nat = Int.abs(now % seconds_in_day);
    let seconds_until_next_midnight : Nat = seconds_in_day - seconds_since_midnight;
    return {
      seconds_since_midnight = seconds_since_midnight;
      seconds_until_next_midnight = seconds_until_next_midnight;
    };
  };
};
