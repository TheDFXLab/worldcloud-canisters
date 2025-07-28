import Types "../types";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Book "../book";
import Nat64 "mo:base/Nat64";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import ErrorType "../modules/errors";

module {
  public class AccessControl(deployer_principal : Principal) {
    public var role_map : Types.RoleMap = HashMap.HashMap<Principal, Types.Role>(0, Principal.equal, Principal.hash);
    private var is_initialized : Bool = false;

    public func init() {
      Debug.print("Initted access control.");
      role_map.put(deployer_principal, #super_admin);
      is_initialized := true;
    };

    /** Assertions */
    public func assert_super_admin(caller : Principal) : Bool {
      switch (role_map.get(caller)) {
        case (null) {
          return false;
        };
        case (?role) {
          Debug.print("Validating.." # debug_show (role));
          return role == #super_admin;
        };
      };
    };

    public func assert_admin(caller : Principal) : Bool {
      switch (role_map.get(caller)) {
        case (null) {
          return false;
        };
        case (?role) {
          return role == #admin;
        };
      };
    };

    public func is_authorized(principal : Principal) : Bool {
      return assert_super_admin(principal) or assert_admin(principal);
    };

    public func check_role(principal : Principal) : Types.Response<Types.Role> {
      switch (role_map.get(principal)) {
        case (null) {
          Debug.print("No role set for principal" # debug_show (principal));
          return #err(ErrorType.NotAnAdmin());

        };
        case (?role) {
          Debug.print("Checking role" # debug_show (role));
          return #ok(role);
        };
      };
    };

    /** CRUD Operations */
    public func add_role(principal : Principal, role : Types.Role, caller : Principal) : Types.Response<Text> {
      if (assert_super_admin(caller) == false) {
        return #err(ErrorType.Unauthorized());
      };
      role_map.put(principal, role);
      return #ok "Role added";
    };

    public func remove_role(principal : Principal, caller : Principal) : Types.Response<Text> {
      if (assert_super_admin(caller) == false) {
        return #err(ErrorType.Unauthorized());
      };
      role_map.delete(principal);
      return #ok "Role removed";
    };

    /** Manage Stable Storage */
    // Function to get data for stable storage
    public func getStableData() : [(Principal, Types.Role)] {
      Iter.toArray(role_map.entries());
    };

    // Function to restore from stable storage
    public func loadFromStable(stable_data : [(Principal, Types.Role)]) {
      role_map := HashMap.fromIter<Principal, Types.Role>(
        stable_data.vals(),
        stable_data.size(),
        Principal.equal,
        Principal.hash,
      );
    };
    /** End Stable Storage */
  };
};
