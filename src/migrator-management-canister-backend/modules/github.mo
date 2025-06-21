import Types "../types";
import Hash "mo:base/Hash";
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
import Utility "../utils/Utility";
import HTTP "./http";

module

{
    public class Github() {
        public var base_url : Text = "https://github.com";
        public var api_base_url : Text = "https://api.github.com";
        public var next_key_id : Nat = 1;
        public var api_keys_by_principal = HashMap.HashMap<Principal, Types.EncryptedApiKey>(0, Principal.equal, Principal.hash);
        public var api_key_owner_by_id = HashMap.HashMap<Nat, Principal>(0, Nat.equal, Hash.hash);

        public func get_by_principal(principal : Principal) : async Types.EncryptedApiKey {
            assert not Principal.isAnonymous(principal);

            return Utility.expect(api_keys_by_principal.get(principal), "Api key not found for given principal");
        };

        public func get_by_id(id : Nat) : async Types.EncryptedApiKey {
            assert not (id == 0);

            let owner_principal = Utility.expect(api_key_owner_by_id.get(id), "Api key with specified ID not found");
            return Utility.expect(api_keys_by_principal.get(owner_principal), "Api key not found for given principal");
        };

        public func create(principal : Principal, encrypted_text : Text) : async Nat {
            assert not Principal.isAnonymous(principal);

            let encrypted_api_key : Types.EncryptedApiKey = {
                id = next_key_id;
                encrypted_text = encrypted_text;
                owner = principal;
            };
            api_keys_by_principal.put(principal, encrypted_api_key);
            api_key_owner_by_id.put(next_key_id, principal);

            next_key_id := next_key_id + 1;
            return next_key_id - 1;
        };

        public func update(principal : Principal, encrypted_text : Text) : async Bool {
            assert not Principal.isAnonymous(principal);

            var encrypted_key : Types.EncryptedApiKey = Utility.expect(api_keys_by_principal.get(principal), "Api key not found for given principal");
            let updated_key : Types.EncryptedApiKey = {
                encrypted_text = encrypted_text;
                id = encrypted_key.id;
                owner = encrypted_key.owner;
            };
            api_keys_by_principal.put(principal, updated_key);

            return true;
        };

        public func delete(principal : Principal) : async Bool {
            assert not Principal.isAnonymous(principal);
            let existing : Types.EncryptedApiKey = Utility.expect(api_keys_by_principal.get(principal), "Api key does not exist for given principal");
            api_key_owner_by_id.delete(existing.id);
            api_keys_by_principal.delete(principal);
            return true;
        };

        /** Manage Stable Storage */
        // Function to get data for stable storage
        public func get_stable_data_next_key_id() : (Nat) {
            next_key_id;
        };

        public func get_stable_data_api_keys_by_id() : [(Nat, Principal)] {
            Iter.toArray(api_key_owner_by_id.entries());
        };

        public func get_stable_data_api_keys_by_principal() : [(Principal, Types.EncryptedApiKey)] {
            Iter.toArray(api_keys_by_principal.entries());
        };

        // Function to restore from stable storage
        public func load_next_key_id(stable_data : (Nat)) {
            next_key_id := stable_data;
        };

        // public func auth_request_code(client_id : Text, scope : Text) : async Text {
        //     let url = base_url # "/login/device/code";
        //     let stringified_body = "{ \"client_id\": \"" # client_id # "\", \"scope\": \"" # scope # "\" }";
        //     Debug.print("Attempt HTTPS Outcall to url " # url # " with body: " # stringified_body);

        //     await HTTP.send_http_post_request(url, stringified_body);
        // };

        public func load_api_keys_map_by_principal(stable_data : [(Principal, Types.EncryptedApiKey)]) {
            api_keys_by_principal := HashMap.fromIter<Principal, Types.EncryptedApiKey>(
                stable_data.vals(),
                stable_data.size(),
                Principal.equal,
                Principal.hash,
            );
        };

        public func load_api_keys_map_by_id(stable_data : [(Nat, Principal)]) {
            api_key_owner_by_id := HashMap.fromIter<Nat, Principal>(
                stable_data.vals(),
                stable_data.size(),
                Nat.equal,
                Hash.hash,
            );
        };
        /** End Stable Storage */
    };
};
