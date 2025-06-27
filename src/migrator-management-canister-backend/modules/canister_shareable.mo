import Array "mo:base/Array";
import Types "../types";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";
import Utility "../utils/Utility";
import Errors "errors";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Prelude "mo:base/Prelude";
import Error "mo:base/Error";
import Access "access";

module {

    public class ShareableCanisterManager() {
        private let DEFAULT_DURATION = 14_400; // 4 hrs
        private let RATE_LIMIT_WINDOW = 86_400; // 1 day
        private let MAX_USES_THRESHOLD = 3; // 3 uses per day
        public var MAX_SHAREABLE_CANISTERS = 10;

        public var slot_to_canister : Types.SlotToCanister = HashMap.HashMap<Nat, Types.ShareableCanister>(0, Nat.equal, Hash.hash);
        public var user_to_slot : Types.UserToSlots = HashMap.HashMap<Principal, ?Nat>(0, Principal.equal, Principal.hash);
        public var used_canisters : Types.UsedCanisters = HashMap.HashMap<Nat, Bool>(0, Nat.equal, Hash.hash);
        public var usage_logs : Types.UsageLogs = HashMap.HashMap<Principal, Types.UsageLog>(0, Principal.equal, Principal.hash);

        private var next_slot_id : Nat = 0;

        /** Public facing methods  */
        //
        //
        //
        //
        //
        //
        //

        public func get_canister_by_slot(slot_id : Nat) : Types.ShareableCanister {
            let canister : Types.ShareableCanister = Utility.expect(slot_to_canister.get(slot_id), "Slot " # " does not exist.");
            return canister;
        };

        public func get_canister_by_user(user : Principal) : Types.ShareableCanister {
            assert not Principal.isAnonymous(user);
            let slot_id_opt : ?Nat = Utility.expect(user_to_slot.get(user), Errors.NoUserSession());

            let slot_id : Nat = Utility.expect(slot_id_opt, Errors.NotFoundSlot());
            let canister : Types.ShareableCanister = Utility.expect(slot_to_canister.get(slot_id), Errors.NotFoundSharedCanister());
            return canister;
        };

        public func get_next_slot_id() : Nat {
            return next_slot_id;
        };

        public func get_slots(limit : ?Nat, index : ?Nat) : [Types.ShareableCanister] {
            let _limit = switch (limit) {
                case (null) {
                    10;
                };
                case (?_lim) {
                    _lim;
                };
            };

            let _index = switch (index) {
                case (null) {
                    0;
                };
                case (?_ind) {
                    _ind;
                };
            };

            var canisters : [Types.ShareableCanister] = [];
            for (slot_id in Iter.range(_index, _index + _limit - 1)) {
                let canister = Utility.expect(slot_to_canister.get(slot_id), Errors.NotFoundSlot());
                canisters := Array.append(canisters, [canister]);
            };

            canisters;
        };

        public func get_available_slots() : [Nat] {
            if (next_slot_id == 0) return [];

            // let slot_ids = slot_to_canister.keys();
            var _slot_ids : [Nat] = [];
            // var _slot_ids : [var Nat] = Array.init<Nat>(next_slot_id, 0);
            var count = 0;

            Debug.print("Finding available slots...");

            for (slot_id in Iter.range(0, next_slot_id - 1)) {
                Debug.print("checking slot id " # Nat.toText(slot_id));
                let is_used = Utility.expect_else(used_canisters.get(slot_id), false);
                if (not is_used) {
                    Debug.print("Slot " # Nat.toText(slot_id) # " is not used.");
                    _slot_ids := Array.append(_slot_ids, [slot_id]);
                    count += 1;
                };
            };

            return _slot_ids;
        };

        public func is_expired_session(slot_id : Nat) : Bool {
            let slot : Types.ShareableCanister = Utility.expect(slot_to_canister.get(slot_id), Errors.NotFoundSlot());
            (Int.abs(Time.now()) - slot.start_timestamp) > RATE_LIMIT_WINDOW;
        };

        public func is_active_session(user : Principal) : Bool {
            let usage_log : Types.UsageLog = Utility.expect(
                usage_logs.get(user),
                Errors.NotFoundSlot(),
            );
            return usage_log.is_active;
        };

        private func calculate_usage_count(usage_count : Nat, last_used : Nat, increment : Bool) : Nat {
            switch (Int.abs(Time.now()) - last_used > RATE_LIMIT_WINDOW) {
                case (false) {
                    // Reset if time window is passed
                    0;
                };
                case (true) {
                    if (increment == true) {
                        // Increment if within time window
                        usage_count + 1; // Usage count for user is incremented at start of session
                    } else {
                        usage_count;
                    }

                };
            };
        };

        /** Freemium session **/
        //
        //
        //
        //
        //
        //
        //

        // Requesting a new freemium session
        public func request_session(user : Principal) : async Types.Response<Types.ShareableCanister> {
            assert not Principal.isAnonymous(user);

            let available_slot_ids : [Nat] = get_available_slots();
            for (slot in Iter.range(0, available_slot_ids.size() - 1)) {
                Debug.print("Slot #" # Nat.toText(slot) # " is available");
            };
            try {
                let slot : Types.ShareableCanister = await start_session(available_slot_ids[0], user);
                #ok(slot);
            } catch (e : Error) {
                return #err(Error.message(e));
            };
        };

        // Ending a session
        public func terminate_session(slot_id : Nat, end_cycles : Nat) : async Types.Response<Bool> {
            try {
                return #ok(end_session(slot_id, end_cycles));
            } catch (e : Error) {
                return #err(Error.message(e));
            };
        };

        /** Update methods **/
        //
        //
        //
        //
        //
        //
        //
        private func start_session(slot_id : Nat, user : Principal) : async Types.ShareableCanister {
            // Get slot details
            let slot : Types.ShareableCanister = Utility.expect(slot_to_canister.get(slot_id), Errors.NotFoundSlot());
            try {
                let usage_log : Types.UsageLog = Utility.expect_else(
                    usage_logs.get(user),
                    {
                        is_active = false;
                        usage_count = 0;
                        last_used = 0;
                        rate_limit_window = RATE_LIMIT_WINDOW;
                        max_uses_threshold = MAX_USES_THRESHOLD;
                    },
                );
                assert not usage_log.is_active; // Ensure user is not currently using a shared canister

                // Assert usage count only when user is within timeframe
                if (not (Int.abs(Time.now()) - usage_log.last_used > RATE_LIMIT_WINDOW)) {
                    assert not (usage_log.usage_count >= usage_log.max_uses_threshold); // Ensure not over limit
                };

                let updated_usage_log : Types.UsageLog = {
                    is_active = true;
                    usage_count = calculate_usage_count(usage_log.usage_count, usage_log.last_used, true);
                    last_used = Int.abs(Time.now());
                    rate_limit_window = RATE_LIMIT_WINDOW;
                    max_uses_threshold = MAX_USES_THRESHOLD;
                };

                usage_logs.put(user, updated_usage_log);
            } catch (e : Error) {
                if (Error.message(e) == Errors.NotFoundLog()) {
                    let new_usage_log : Types.UsageLog = {
                        is_active = true;
                        usage_count = 1;
                        last_used = Int.abs(Time.now());
                        rate_limit_window = RATE_LIMIT_WINDOW;
                        max_uses_threshold = MAX_USES_THRESHOLD;
                    };

                    usage_logs.put(user, new_usage_log);
                };
            };

            let updated_slot : Types.ShareableCanister = {
                project_id = slot.project_id;
                canister_id = slot.canister_id;
                owner = slot.owner;
                user = user;
                create_timestamp = slot.create_timestamp;
                start_timestamp = Int.abs(Time.now());
                duration = slot.duration;
                start_cycles = slot.start_cycles; // set cycle balance at start of session
                status = #occupied;
            };

            // Update slot and set user session
            slot_to_canister.put(slot_id, updated_slot);
            user_to_slot.put(user, ?slot_id);
            used_canisters.put(slot_id, true);
            return updated_slot;
        };

        // Used to terminate a serving a user's assets from a slot
        private func end_session(slot_id : Nat, end_cycles : Nat) : Bool {
            // Get and update slot details
            let slot : Types.ShareableCanister = Utility.expect(slot_to_canister.get(slot_id), Errors.NotFoundSlot());
            let updated_slot : Types.ShareableCanister = {
                project_id = slot.project_id;
                canister_id = slot.canister_id;
                owner = slot.owner;
                user = slot.owner;
                create_timestamp = slot.create_timestamp;
                start_timestamp = 0; // Reset to 0, when user occupies, it will be set
                duration = slot.duration;
                start_cycles = end_cycles; // get new cycles balance
                status = #available;
            };

            // Get and update usage log for user
            let usage_log : Types.UsageLog = Utility.expect(usage_logs.get(slot.user), Errors.NotFoundLog());
            let updated_usage_log : Types.UsageLog = {
                is_active = false;
                usage_count = calculate_usage_count(usage_log.usage_count, usage_log.last_used, false); // Only incremented when session starts
                last_used = Int.abs(Time.now());
                rate_limit_window = RATE_LIMIT_WINDOW;
                max_uses_threshold = MAX_USES_THRESHOLD;
            };

            // Put updates in mappings
            usage_logs.put(slot.user, updated_usage_log);
            slot_to_canister.put(slot_id, updated_slot);
            used_canisters.put(slot_id, false);

            return true;
        };

        public func create_slot(owner : Principal, user : Principal, canister_id : Principal, project_id : Nat, start_cycles : Nat) : Types.Response<Nat> {
            // Limit number of canisters createable
            if (Iter.toArray(slot_to_canister.keys()).size() >= MAX_SHAREABLE_CANISTERS) {
                return #err(Errors.MaxSlotsReached());
            };

            // TODO: can add canister principal  and is_wasm_installed here
            let new_slot_canister : Types.ShareableCanister = {
                project_id = project_id;
                canister_id = ?canister_id;
                owner = owner;
                user = user;
                create_timestamp = Int.abs(Time.now());
                start_timestamp = Int.abs(Time.now());
                duration = DEFAULT_DURATION;
                start_cycles = start_cycles;
                status = #available;
            };

            slot_to_canister.put(next_slot_id, new_slot_canister);
            next_slot_id += 1;

            return #ok(next_slot_id - 1);
        };

        // Method for assignign new canister to a slot
        private func update_slot_canister(slot_id : Nat, canister_id : Principal) : Types.Response<Types.ShareableCanister> {
            // Ensure updating of existing slots only
            if (slot_id >= next_slot_id) {
                return #err(Errors.IndexOutOfBounds());
            };

            // Get current slot and update canister id
            var slot : Types.ShareableCanister = Utility.expect(slot_to_canister.get(slot_id), Errors.NotFoundSlot());
            if (slot.status == #occupied) {
                return #err(Errors.SlotUnavailable());
            };

            let updated_canister : Types.ShareableCanister = {
                project_id = slot.project_id;
                canister_id = ?canister_id;
                owner = slot.owner;
                user = slot.user;
                start_timestamp = slot.start_timestamp;
                create_timestamp = slot.create_timestamp;
                duration = slot.duration;
                start_cycles = slot.start_cycles;
                status = slot.status;
            };
            slot_to_canister.put(slot_id, updated_canister);
            return #ok(updated_canister);
        };

        /** End private methods*/

        /**Start stable management */

        // Function to get data for stable storage
        public func get_stable_data_slot_to_canister() : [(Nat, Types.ShareableCanister)] {
            Iter.toArray(slot_to_canister.entries());
        };
        public func get_stable_data_user_to_slot() : [(Principal, ?Nat)] {
            Iter.toArray(user_to_slot.entries());
        };
        public func get_stable_data_used_canisters() : [(Nat, Bool)] {
            Iter.toArray(used_canisters.entries());
        };
        public func get_stable_data_usage_logs() : [(Principal, Types.UsageLog)] {
            Iter.toArray(usage_logs.entries());
        };

        // Function to restore from stable storage
        public func load_from_stable_slot_to_canister(stable_data : [(Nat, Types.ShareableCanister)]) {
            slot_to_canister := HashMap.fromIter<Nat, Types.ShareableCanister>(
                stable_data.vals(),
                stable_data.size(),
                Nat.equal,
                Hash.hash,
            );
        };

        public func load_from_stable_user_to_slot(stable_data : [(Principal, ?Nat)]) {
            user_to_slot := HashMap.fromIter<Principal, ?Nat>(
                stable_data.vals(),
                stable_data.size(),
                Principal.equal,
                Principal.hash,
            );
        };

        public func load_from_stable_used_canisters(stable_data : [(Nat, Bool)]) {
            used_canisters := HashMap.fromIter<Nat, Bool>(
                stable_data.vals(),
                stable_data.size(),
                Nat.equal,
                Hash.hash,
            );
        };

        public func load_from_stable_usage_logs(stable_data : [(Principal, Types.UsageLog)]) {
            usage_logs := HashMap.fromIter<Principal, Types.UsageLog>(
                stable_data.vals(),
                stable_data.size(),
                Principal.equal,
                Principal.hash,
            );
        };

        /** End class */

    }

};

// Time-shareable asset canister for freemium plans
// User flow:
//
// [user request deploy website] --backend--> [is_free plan selected?] --yes--> [available shared canisters?] --yes--> [deploy to asset canister and set scheduler]
// [user request deploy website] --backend--> [is_free plan selected?] --yes--> [available shared canisters?] --no--> [deploy new shareable canister and upload wasm for asset canister]
// [user request deploy website] --backend--> [is_free plan selected?] --no--> [verify subscription limits] -->[deploy new personal canister and upload wasm for asset canister]
//
// Shareable canister flow:
// Uploading to existing shared canister
// [request for new deployment] --> [available shared canisters?] --YES--> [upload new files] --> [record start time] --> [share link to canister]
//
// Creating and uploading to a new canister
// [request for new deployment] --> [available shared canisters?] --NO--> [create a new shared canister] --> [upload wasm code] --> [upload files] --> [record start time] -->[share link to canister]
//
// Types:
//
// Notes:
// Rate limit freemium users per day. e.g Max allowed free canister usage per day = 3
//
// ShareableCanister
// owner: Principal -- controller of the canister
// user: Principal -- current user of the canister
// create_timestamp: Nat -- time user occupied the canister
// duration: Nat -- total time allowed for a single user to occupy a canister
// start_cycles: Nat -- total cycles available at create_timestamp
//
// ShareableCanisterStatistics
// total_cycles_consumed: Nat -- total amount of cycles consumed since genesis of canister
// create_time: Nat -- time the canister was created
// usage_count: Nat -- total times the canister was occupied
//
// UserShareSession
// slot_id: Nat -- slot id currently used by the user
// usage_count: Nat -- amount of times the canister was occupied by the user since last used. Resets to 0 when (now - last_used > rate_limit_window)
// last_used: Nat -- last time the canister was occupied by the user
// rate_limit_window: Nat -- duration of a theoretical session. used to deny occupying a shared canister when (usage_count > max_uses_threshold)
// max_uses_threshold: Nat -- maximum number of times the user is allowed to occupy the shared canister within the rate_limit_window
//
// Mappings:
// slot_to_canister (slot_id : number => ShareableCanister) -- used to map a shared canister to a slot id
// user_to_slot (principal => UserShareSession) --- used to prevent abuse of freemium features
// used_canisters (slot_id => boolean) -- used to deduce available canisters for usage by a user
//
// Variables:
// next_slot_id : number -- used to assign the next slot id to be created
//
