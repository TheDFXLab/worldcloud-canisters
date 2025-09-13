import Types "../types";
import Map "mo:core/Map";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Book "../book";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import ErrorType "../modules/errors";
import Utility "../utils/Utility";

module {
  public class AccessControl(deployer_principal : Principal, role_map_init : Types.RoleMap) {
    public var role_map : Types.RoleMap = role_map_init;
    private var is_initialized : Bool = false;
    private let disable_guards : Bool = false;
    Map.add(role_map, Principal.compare, deployer_principal, #super_admin);

    public func get_role_users(payload : Types.PaginationPayload) : Types.Response<[(Principal, Types.Role)]> {
      let roles : [(Principal, Types.Role)] = Iter.toArray(Map.entries(role_map));
      return #ok(Utility.paginate(roles, payload));
    };

    /** Assertions */
    public func assert_super_admin(caller : Principal) : Bool {
      switch (Map.get(role_map, Principal.compare, caller)) {
        case (null) {
          return false;
        };
        case (?role) {
          return role == #super_admin;
        };
      };
    };

    public func assert_admin(caller : Principal) : Bool {
      switch (Map.get(role_map, Principal.compare, caller)) {
        case (null) {
          return false;
        };
        case (?role) {
          return role == #admin;
        };
      };
    };

    public func is_authorized(principal : Principal) : Bool {
      if (disable_guards) return true;
      return assert_super_admin(principal) or assert_admin(principal);
    };

    public func check_role(principal : Principal) : Types.Response<Types.Role> {
      switch (Map.get(role_map, Principal.compare, principal)) {
        case (null) {
          return #err(ErrorType.NotAnAdmin());

        };
        case (?role) {
          return #ok(role);
        };
      };
    };

    /** CRUD Operations */
    public func add_role(principal : Principal, role : Types.Role, caller : Principal) : Types.Response<Text> {
      if (assert_super_admin(caller) == false) {
        return #err(ErrorType.Unauthorized());
      };
      Map.add(role_map, Principal.compare, principal, role);
      return #ok "Role added";
    };

    public func remove_role(principal : Principal, caller : Principal) : Types.Response<Text> {
      if (assert_super_admin(caller) == false) {
        return #err(ErrorType.Unauthorized());
      };
      ignore Map.delete(role_map, Principal.compare, principal);
      return #ok "Role removed";
    };

  };
};
