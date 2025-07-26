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
        private let DEFAULT_DURATION_MS = 1200 * 1_000; // 20 mins
        // private let DEFAULT_DURATION = 14_400; // 4 hrs
        private let RATE_LIMIT_WINDOW_MS = 86_400 * 1_000; // 1 day
        private let MAX_USES_THRESHOLD = 3; // 3 uses per day
        public var MAX_SHAREABLE_CANISTERS = 10;
        public var MIN_CYCLES_INIT_E8S = 200_000_000;

        public var slots : Types.SlotToCanister = HashMap.HashMap<Nat, Types.ShareableCanister>(0, Nat.equal, Hash.hash);
        public var user_to_slot : Types.UserToSlots = HashMap.HashMap<Principal, ?Nat>(0, Principal.equal, Principal.hash);
        public var used_slots : Types.UsedCanisters = HashMap.HashMap<Nat, Bool>(0, Nat.equal, Hash.hash);
        public var usage_logs : Types.UsageLogs = HashMap.HashMap<Principal, Types.UsageLog>(0, Principal.equal, Principal.hash);

        private var next_slot_id : Nat = 0;

        public func reset_slots(actor_principal : Principal) : Types.ResetSlotsResult {
            var reset_project_ids : [?Nat] = [];
            var slot_ids : [Nat] = [];

            for ((slot_id, slot) in slots.entries()) {
                let updated_slot : Types.ShareableCanister = {
                    id = slot.id;
                    project_id = null;
                    canister_id = slot.canister_id;
                    owner = slot.owner;
                    user = slot.owner;
                    start_timestamp = 0;
                    create_timestamp = Int.abs(Utility.get_time_now(#milliseconds));
                    duration = DEFAULT_DURATION_MS;
                    start_cycles = slot.start_cycles;
                    status = #available;
                };

                // Delete mapped user to slot
                // Update usage log for users of slots
                if (not (slot.user == actor_principal)) {
                    let _usage_log : ?Types.UsageLog = switch (usage_logs.get(slot.user)) {
                        case (null) {
                            null;
                        };
                        case (?log) {
                            let updated_log : Types.UsageLog = {
                                is_active = false;
                                usage_count = log.usage_count;
                                last_used = Int.abs(Utility.get_time_now(#milliseconds));
                                rate_limit_window = log.rate_limit_window;
                                max_uses_threshold = log.max_uses_threshold;
                                quota = log.quota;
                            };

                            usage_logs.put(slot.user, updated_log);
                            ?updated_log;
                        };
                    };

                    // Track cleaned up slot id for further project cleanup
                    reset_project_ids := Array.append(reset_project_ids, [slot.project_id]);
                    slot_ids := Array.append(slot_ids, [slot.id]);
                    user_to_slot.delete(slot.user);
                };

                // Update slot details
                // Remove slot from used slots
                slots.put(slot_id, updated_slot);
                used_slots.delete(slot_id);
            };

            return {
                project_ids = reset_project_ids;
                slot_ids = slot_ids;
            };
        };
        /** Public facing methods  */
        //
        //
        //
        //
        //
        //
        //

        public func admin_clear_usage_logs() {
            usage_logs := HashMap.HashMap<Principal, Types.UsageLog>(0, Principal.equal, Principal.hash);
        };

        public func get_used_slots() : [(Nat, Bool)] {
            Iter.toArray(used_slots.entries());
        };

        public func get_canister_by_slot(slot_id : Nat) : Types.Response<Types.ShareableCanister> {
            let slot : Types.ShareableCanister = switch (slots.get(slot_id)) {
                case (null) {
                    return #err(Errors.NotFoundSlot());
                };
                case (?_slot) {
                    _slot;
                };
            };
            return #ok(slot);
        };

        public func get_user_usage(user : Principal) : Types.UsageLog {
            switch (usage_logs.get(user)) {
                case (null) {
                    let new_usage : Types.UsageLog = {
                        is_active = false;
                        usage_count = 0;
                        last_used = 0;
                        rate_limit_window = RATE_LIMIT_WINDOW_MS;
                        max_uses_threshold = MAX_USES_THRESHOLD;
                        quota = {
                            consumed = 0;
                            total = MAX_USES_THRESHOLD;
                        };
                    };
                    return new_usage;
                };
                case (?log) {
                    return log;
                };
            };
        };

        public func get_slot_id_by_user(user : Principal) : Types.Response<?Nat> {
            switch (user_to_slot.get(user)) {
                case (null) {
                    // return #err(Errors.NotFoundSlot());
                    return #ok(null);
                };
                case (?id) {
                    return #ok(id);
                };
            };
        };

        public func get_canister_by_user(user : Principal) : Types.Response<?Types.ShareableCanister> {
            let slot_id : Nat = switch (get_slot_id_by_user(user)) {
                case (#ok(null)) { return #ok(null) };
                case (#ok(?id)) { id };
                case (#err(err)) { return #err(err) };
            };

            let canister : Types.ShareableCanister = switch (slots.get(slot_id)) {
                case (null) { return #err(Errors.NotFoundSharedCanister()) };
                case (?_canister) { _canister };
            };
            return #ok(?canister);
        };

        public func get_next_slot_id() : Nat {
            return next_slot_id;
        };

        public func get_slots(limit : ?Nat, index : ?Nat) : [Types.ShareableCanister] {
            if (slots.size() == 0) {
                Debug.print("NO AVAILABLE SLOTS");
                return [];
            };
            let start = switch (index) {
                case (null) {
                    0;
                };
                case (?_ind) {
                    _ind;
                };
            };

            let end = if (slots.size() == 0) {
                0;
            } else {
                switch (limit) {
                    case (null) {
                        if (start + 10 > slots.size() - 1) {
                            slots.size() - 1;
                        } else {
                            start + 10;
                        };
                    };
                    case (?_lim) {
                        if (start + _lim > slots.size() - 1) {
                            slots.size() - 1;
                        } else {
                            _lim;
                        };
                    };
                };
            };
            var canisters : [Types.ShareableCanister] = [];
            Debug.print("Getting slots from start index: " # Nat.toText(start) # " and end index: " #Nat.toText(end));

            for ((slot_id, slot) in slots.entries()) {
                canisters := Array.append(canisters, [slot]);
            };
            canisters;

        };

        public func get_used_slot_ids() : [Nat] {
            return Iter.toArray(used_slots.keys());
        };

        public func get_available_slots() : [Nat] {
            if (next_slot_id == 0) return [];

            var _slot_ids : [Nat] = [];

            Debug.print("Finding available slots...");

            for ((slot_id, slot) in slots.entries()) {
                if (slot.status == #available) {
                    switch (slot.project_id) {
                        case (null) {
                            Debug.print("Slot #" # Nat.toText(slot_id) # " is available.");
                            _slot_ids := Array.append(_slot_ids, [slot_id]);
                        };
                        case (?id) {
                            Debug.print("Not found slot #" # Nat.toText(slot_id));
                        };
                    };
                };
            };
            Debug.print("Returning slot ids array size: " # Nat.toText(_slot_ids.size()));
            return _slot_ids;
        };

        public func is_expired_session(slot_id : Nat) : Types.Response<Bool> {
            let slot : Types.ShareableCanister = switch (slots.get(slot_id)) {
                case (null) { return #err(Errors.NotFoundSlot()) };
                case (?slot) {
                    if (slot.status == #occupied and (Utility.get_time_now(#milliseconds) - slot.start_timestamp >= slot.duration)) {
                        return #ok(true);
                    };
                    return #ok(false);
                };
            };
            return #ok(true);
        };

        public func is_active_session(user : Principal) : async Types.Response<Bool> {
            try {
                let usage_log : Types.UsageLog = switch (usage_logs.get(user)) {
                    case (null) {
                        return #err(Errors.NotFoundSlot());
                    };
                    case (?val) {
                        val;
                    };
                };
                return #ok(usage_log.is_active);
            } catch (error) {
                let log : Types.UsageLog = _create_usage_log(user);
                return #ok(log.is_active);
            }

        };

        private func _create_usage_log(user : Principal) : Types.UsageLog {
            let log : Types.UsageLog = {
                is_active = false;
                usage_count = 0;
                last_used = 0;
                rate_limit_window = RATE_LIMIT_WINDOW_MS;
                max_uses_threshold = MAX_USES_THRESHOLD;
                quota = {
                    consumed = 0;
                    total = MAX_USES_THRESHOLD;
                };
            };

            usage_logs.put(user, log);
            return log;
        };

        private func calculate_usage_count(usage_count : Nat, last_used : Nat, increment : Bool) : Nat {
            let now : Int = Utility.get_time_now(#milliseconds);
            if (now < last_used) return usage_count;
            switch (Int.abs(now) - last_used > RATE_LIMIT_WINDOW_MS) {
                case (false) {
                    // Reset if time window is passed
                    if (increment == true) {
                        1;
                    } else {
                        0;
                    };
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
        public func request_session(user : Principal, project_id : Nat) : async Types.Response<?Types.ShareableCanister> {
            let available_slot_ids : [Nat] = get_available_slots();
            Debug.print("Received available slot ids length;" # Nat.toText(available_slot_ids.size()));
            for (index in Iter.range(0, available_slot_ids.size() - 1)) {
                Debug.print("Debugging: Slot #" # Nat.toText(available_slot_ids[index]) # " is available");
            };

            if (available_slot_ids.size() == 0) {
                Debug.print("No slots found. Exiting...");
                return #ok(null);
            };

            // Ensure no current active session
            let usage_log : Types.UsageLog = get_usage_log(user);

            if (usage_log.is_active) {
                return #err(Errors.ActiveSession());
            };

            Debug.print("Starting a session...");
            try {
                let slot : Types.ShareableCanister = switch (start_session(available_slot_ids[0], user, project_id)) {
                    case (#err(msg)) { return #err(msg) };
                    case (#ok(_slot)) { _slot };
                };

                #ok(?slot);
            } catch (e : Error) {
                return #err(Error.message(e));
            };
        };

        // Ending a session
        public func terminate_session(slot_id : Nat, end_cycles : Nat) : Types.Response<?Nat> {
            return end_session(slot_id, end_cycles);
        };

        public func get_quota(user : Principal) : Types.Response<Types.Quota> {
            let usage_log : Types.UsageLog = switch (usage_logs.get(user)) {
                case (null) {
                    return #ok({
                        consumed = 0;
                        total = MAX_USES_THRESHOLD;
                    });
                };
                case (?val) { val };
            };

            return #ok({
                consumed = usage_log.quota.consumed;
                total = usage_log.max_uses_threshold;
            });
        };

        public func get_usage_log(user : Principal) : Types.UsageLog {
            let usage_log : Types.UsageLog = switch (usage_logs.get(user)) {
                case (null) {
                    let new_usage : Types.UsageLog = {
                        is_active = false;
                        usage_count = 0;
                        last_used = 0;
                        rate_limit_window = RATE_LIMIT_WINDOW_MS;
                        max_uses_threshold = MAX_USES_THRESHOLD;
                        quota = {
                            consumed = 0;
                            total = MAX_USES_THRESHOLD;
                        };
                    };
                    return new_usage;
                };
                case (?val) { val };
            };

            return usage_log;
        };
        /** Update methods **/
        //
        //
        //
        //
        //
        //
        //

        private func increment_quota(user : Principal) : Types.Response<Types.UsageLog> {
            let usage_log : Types.UsageLog = get_usage_log(user);
            let now : Int = Utility.get_time_now(#milliseconds);

            if (usage_log.is_active) return #err(Errors.ActiveSession());

            // Ensure now is greater to prevent underflow
            let consumed : Nat = switch (now > usage_log.last_used) {
                case (false) {
                    return #ok(usage_log);
                };
                case (true) {
                    var _consumed = usage_log.quota.consumed;
                    if ((now - usage_log.last_used) >= usage_log.rate_limit_window) {
                        _consumed := 1;
                    } else {
                        if (usage_log.quota.consumed + 1 > usage_log.quota.total) return #err(Errors.QuotaReached(usage_log.quota.total));
                        _consumed := _consumed + 1;
                    };
                    _consumed;
                };
            };

            let updated_usage_log : Types.UsageLog = {
                is_active = true;
                usage_count = usage_log.usage_count + 1;
                last_used = Int.abs(Utility.get_time_now(#milliseconds));
                rate_limit_window = RATE_LIMIT_WINDOW_MS;
                max_uses_threshold = MAX_USES_THRESHOLD;
                quota = {
                    consumed = consumed;
                    total = usage_log.quota.total;
                };
            };
            usage_logs.put(user, updated_usage_log);
            return #ok(usage_log);

        };

        private func start_session(slot_id : Nat, user : Principal, project_id : Nat) : Types.Response<Types.ShareableCanister> {
            // Get slot details
            let slot : Types.ShareableCanister = switch (slots.get(slot_id)) {
                case (null) { return #err(Errors.NotFoundSlot()) };
                case (?val) { val };
            };

            let usage_log : Types.UsageLog = switch (increment_quota(user)) {
                case (#err(err)) { return #err(err) };
                case (#ok(val)) { val };
            };

            let updated_slot : Types.ShareableCanister = {
                id = slot.id;
                project_id = ?project_id;
                canister_id = slot.canister_id;
                owner = slot.owner;
                user = user;
                create_timestamp = slot.create_timestamp;
                start_timestamp = Int.abs(Utility.get_time_now(#milliseconds));
                duration = slot.duration;
                start_cycles = slot.start_cycles; // set cycle balance at start of session
                status = #occupied;
            };

            // Update slot and set user session
            slots.put(slot_id, updated_slot);
            user_to_slot.put(user, ?slot_id);
            used_slots.put(slot_id, true);
            Debug.print("Assigned slot #" # Nat.toText(slot_id) # " to user " # Principal.toText(user));
            return #ok(updated_slot);
        };

        // Used to terminate a serving a user's assets from a slot
        // Returns project id such that the caller can update the respective project
        private func end_session(slot_id : Nat, end_cycles : Nat) : Types.Response<?Nat> {
            Debug.print("[end_session] Ending session for slot #" # Nat.toText(slot_id));
            // Get and update slot details
            let slot : Types.ShareableCanister = switch (slots.get(slot_id)) {
                case (null) { return #err(Errors.NotFoundSlot()) };
                case (?val) { val };
            };

            let updated_slot : Types.ShareableCanister = {
                id = slot.id;
                project_id = null;
                canister_id = slot.canister_id;
                owner = slot.owner;
                user = slot.owner;
                create_timestamp = slot.create_timestamp;
                start_timestamp = 0; // Reset to 0, when user occupies, it will be set
                duration = slot.duration;
                start_cycles = end_cycles; // get new cycles balance
                status = #available;
            };

            Debug.print("[end_session] Updated slot: " # debug_show (updated_slot) # Principal.toText(slot.user));

            // Get and update usage log for user
            let _usage_log : ?Types.UsageLog = switch (usage_logs.get(slot.user)) {
                case (null) {
                    Debug.print("[end_session] No usage log detected for user: " # Principal.toText(slot.user));
                    // Deleting
                    null;
                };
                case (?log) {
                    Debug.print("[end_session] Found and updating usage log for user " # Principal.toText(slot.user));
                    let updated_usage_log : Types.UsageLog = {
                        is_active = false;
                        usage_count = calculate_usage_count(log.usage_count, log.last_used, false); // Only incremented when session starts
                        last_used = Int.abs(Utility.get_time_now(#milliseconds));
                        rate_limit_window = RATE_LIMIT_WINDOW_MS;
                        max_uses_threshold = MAX_USES_THRESHOLD;
                        quota = log.quota;
                    };

                    // Put updates in mappings
                    usage_logs.put(slot.user, updated_usage_log);
                    Debug.print("[end_session] Updated usage log for user #" # Principal.toText(slot.user));
                    ?log;
                };
            };

            slots.put(slot_id, updated_slot);
            used_slots.delete(slot_id);
            user_to_slot.delete(slot.user);
            Debug.print("[end_session] Updated slot #" # Nat.toText(slot_id) # " and usage logs for" # Principal.toText(slot.user));

            return #ok(slot.project_id);
        };

        public func create_slot(owner : Principal, user : Principal, canister_id : Principal, project_id : ?Nat, start_cycles : Nat) : Types.Response<Nat> {
            // Limit number of canisters createable
            if (Iter.toArray(slots.keys()).size() >= MAX_SHAREABLE_CANISTERS) {
                return #err(Errors.MaxSlotsReached());
            };

            // TODO: can add canister principal  and is_wasm_installed here
            let new_slot_canister : Types.ShareableCanister = {
                id = next_slot_id;
                project_id = null;
                canister_id = ?canister_id;
                owner = owner;
                user = owner;
                create_timestamp = Int.abs(Utility.get_time_now(#milliseconds));
                start_timestamp = Int.abs(Utility.get_time_now(#milliseconds));
                duration = DEFAULT_DURATION_MS;
                start_cycles = start_cycles;
                status = #available;
            };

            slots.put(next_slot_id, new_slot_canister);
            next_slot_id += 1;

            return #ok(next_slot_id - 1);
        };

        // Method for assignign new canister to a slot
        public func update_slot(slot_id : Nat, updated_slot : Types.ShareableCanister) : Types.Response<Types.ShareableCanister> {
            // Ensure updating of existing slots only
            if (slot_id >= next_slot_id) {
                return #err(Errors.IndexOutOfBounds());
            };

            // Get current slot and update canister id
            var slot : Types.ShareableCanister = switch (slots.get(slot_id)) {
                case (null) { return #err(Errors.NotFoundSlot()) };
                case (?val) { val };
            };

            if (slot.status == #occupied) {
                return #err(Errors.SlotUnavailable());
            };

            // let updated_canister : Types.ShareableCanister = {
            //     project_id = slot.project_id;
            //     canister_id = ?canister_id;
            //     owner = slot.owner;
            //     user = slot.user;
            //     start_timestamp = slot.start_timestamp;
            //     create_timestamp = slot.create_timestamp;
            //     duration = slot.duration;
            //     start_cycles = slot.start_cycles;
            //     status = slot.status;
            // };
            slots.put(slot_id, updated_slot);
            return #ok(updated_slot);
        };

        /** End private methods*/

        public func migrate_usage_log_add_quota() : [(Principal, Types.UsageLog)] {
            var migrated_array : [(Principal, Types.UsageLog)] = [];
            for ((user, log) in usage_logs.entries()) {
                let obj : Types.UsageLog = {
                    is_active = log.is_active;
                    usage_count = log.usage_count;
                    last_used = log.last_used;
                    rate_limit_window = log.rate_limit_window;
                    max_uses_threshold = log.max_uses_threshold;
                    quota = {
                        consumed = 0;
                        total = MAX_USES_THRESHOLD;
                    };
                };
                Debug.print("migrating usage log for user: " # Principal.toText(user) # debug_show (obj));
                migrated_array := Array.append(migrated_array, [(user, obj)]);
            };
            return migrated_array;
        };

        public func apply_usage_log_migration() {
            for ((user, log) in usage_logs.entries()) {
                Debug.print("Migrating logs for user: " # Principal.toText(user) # "...");
                let updated_log : Types.UsageLog = {
                    is_active = log.is_active;
                    usage_count = log.usage_count;
                    last_used = log.last_used;
                    rate_limit_window = log.rate_limit_window;
                    max_uses_threshold = log.max_uses_threshold;
                    quota = {
                        consumed = 0;
                        total = MAX_USES_THRESHOLD;
                    } : Types.Quota;
                };
                usage_logs.put(user, updated_log);
                Debug.print("Migration successful for user: " # Principal.toText(user) # ". Updated log: " # debug_show (updated_log));
            };
        };

        /**Start stable management */

        // Function to get data for stable storage
        public func get_stable_data_slots() : [(Nat, Types.ShareableCanister)] {
            Iter.toArray(slots.entries());
        };
        public func get_stable_data_user_to_slot() : [(Principal, ?Nat)] {
            Iter.toArray(user_to_slot.entries());
        };
        public func get_stable_data_used_slots() : [(Nat, Bool)] {
            Iter.toArray(used_slots.entries());
        };
        public func get_stable_data_usage_logs() : [(Principal, Types.UsageLog)] {
            Iter.toArray(usage_logs.entries());
        };
        public func get_stable_data_next_slot_id() : Nat {
            next_slot_id;
        };

        // Function to restore from stable storage
        public func load_from_stable_slots(stable_data : [(Nat, Types.ShareableCanister)]) {
            slots := HashMap.fromIter<Nat, Types.ShareableCanister>(
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

        public func load_from_stable_used_slots(stable_data : [(Nat, Bool)]) {
            used_slots := HashMap.fromIter<Nat, Bool>(
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

        public func load_from_stable_next_slot_id(stable_data : Nat) {
            next_slot_id := stable_data;
        }

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
// slots (slot_id : number => ShareableCanister) -- used to map a shared canister to a slot id
// user_to_slot (principal => UserShareSession) --- used to prevent abuse of freemium features
// used_slots (slot_id => boolean) -- used to deduce available canisters for usage by a user
//
// Variables:
// next_slot_id : number -- used to assign the next slot id to be created
//
