import Types "../types";
import Map "mo:core/Map";
import Text "mo:base/Text";
import Nat "mo:base/Nat";

module {
  public class TimerManager(timers_map_by_number_init : Types.TimersMap, timers_map_by_text_init : Types.GlobalTimersMap, domain_registration_timers_init : Types.DomainRegistrationTimers) {

    public var domain_registration_timer_map : Types.DomainRegistrationTimers = domain_registration_timers_init;
    public var timers_by_text : Types.GlobalTimersMap = timers_map_by_text_init;
    public var timers_by_number : Types.TimersMap = timers_map_by_number_init;

    public func get_domain_registration_timer_by_subdomain(subdomain : Text) : ?Types.DomainRegistrationTimer {
      Map.get(domain_registration_timer_map, Text.compare, subdomain);
    };

    public func get_timer_by_text(key : Text) : ?Nat {
      Map.get(timers_by_text, Text.compare, key);
    };

    public func get_timer_by_number(key : Nat) : ?Nat {
      Map.get(timers_by_number, Nat.compare, key);
    };

    public func set_timer_domain_registration(subdomain : Text, data : Types.DomainRegistrationTimer) : () {
      Map.add(domain_registration_timer_map, Text.compare, subdomain, data);
    };

    public func set_timer_by_text(key : Text, id : Nat) : () {
      Map.add(timers_by_text, Text.compare, key, id);
    };

    public func set_timer_by_number(key : Nat, id : Nat) : () {
      Map.add(timers_by_number, Nat.compare, key, id);
    };

    public func delete_timer_by_number(key : Nat) : () {
      ignore Map.delete(timers_by_number, Nat.compare, key);
    };

    public func delete_timer_by_text(key : Text) : () {
      ignore Map.delete(timers_by_text, Text.compare, key);
    };

    public func delete_domain_registration_timer(subdomain : Text) : () {
      ignore Map.delete(domain_registration_timer_map, Text.compare, subdomain);
    };

  };
};
