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
import Errors "../modules/errors";
import Utility "../utils/Utility";

module {
    public class SubscriptionManager(book : Book.Book, ledger : Principal) {
        private var icp_fee : Nat = 10_000;
        private var treasury : ?Principal = null; // Receiver of payments
        public var subscriptions : Types.SubscriptionsMap = HashMap.HashMap<Principal, Types.Subscription>(0, Principal.equal, Principal.hash);
        public var tiers_list : Types.TiersList = [
            {
                id = 0;
                name = "Basic";
                slots = 1;
                min_deposit = { e8s = 50_000_000 }; // 0.5 ICP
                price = { e8s = 0 }; // Free tier
                features = [
                    "1 Canister",
                    "Basic Support",
                    "Manual Deployments",
                    "GitHub Integration",
                ];
            },
            {
                id = 1;
                name = "Pro";
                slots = 5;
                min_deposit = { e8s = 200_000_000 }; // 2 ICP
                price = { e8s = 500_000_000 }; // 5 ICP
                features = [
                    "5 Canisters",
                    "Priority Support",
                    "Automated Deployments",
                    "Custom Domains",
                    "Deployment History",
                    "Advanced Analytics",
                ];
            },
            {
                id = 2;
                name = "Enterprise";
                slots = 25;
                min_deposit = { e8s = 500_000_000 }; // 5 ICP
                price = { e8s = 2_500_000_000 }; // 25 ICP
                features = [
                    "25 Canisters",
                    "24/7 Support",
                    "Team Management",
                    "Advanced Analytics",
                    "Priority Queue",
                    "Custom Branding",
                    "API Access",
                ];
            },
            {
                id = 3;
                name = "Freemium";
                slots = 1;
                min_deposit = { e8s = 0 };
                price = { e8s = 0 }; // Free tier
                features = [
                    "1 Canister",
                    "Manual Deployments",
                    "GitHub Integration",
                    "4hrs Demo Hosting Trial",
                    "3 Free Trials per day",
                ];
            },
        ];

        public func set_treasury(new_treasury : Principal) : Bool {
            treasury := ?new_treasury;
            return true;
        };

        public func get_treasury() : ?Principal {
            return treasury;
        };

        public func get_tier_id_freemium() : Types.Response<Nat> {
            var i = 0;
            let n = tiers_list.size();
            // Use a while loop for early exit
            while (i < n) {
                if (tiers_list[i].name == "Freemium") {
                    return #ok(tiers_list[i].id);
                };
                i += 1;
            };
            // If not found, throw error
            // return Utility.expect(null, Errors.NotFoundTier());
            return #err(Errors.NotFoundTier());
        };

        // TODO: Admin function
        public func get_all_subscriptions() : async [(Principal, Types.Subscription)] {
            return Iter.toArray(subscriptions.entries());
        };

        public func get_subscription(caller : Principal) : Types.Response<Types.Subscription> {
            switch (subscriptions.get(caller)) {
                case (null) { return #err(Errors.SubscriptionNotFound()) };
                case (?sub) { return #ok(sub) };
            };
        };

        private func _get_subscription(caller : Principal) : async ?Types.Subscription {
            switch (subscriptions.get(caller)) {
                case (null) { return null };
                case (?sub) { return ?sub };
            };
        };

        private func _create_subscription(caller : Principal, tier_id : Nat, subscription : Types.Subscription, payment_receiver : Principal) : async Types.Response<Types.Subscription> {
            // Bypass payment for freemium tier
            if (tier_id == 3) {
                subscriptions.put(caller, subscription); // Add subscription plan for caller
                return #ok(subscription);
            };

            // Get pricing list
            let tier : Types.Tier = tiers_list[tier_id];

            // Get user's ICP balance
            let deposited_icp = book.fetchUserIcpBalance(caller, ledger);

            // Get total cost
            let total_cost = Nat64.toNat(tier.min_deposit.e8s + tier.price.e8s);

            // Validate user has enough ICP balance
            if (deposited_icp < total_cost) {
                return #err(Errors.InsufficientFunds());
            };

            // Deduct payment from caller's balance
            let success = book.process_payment(caller, payment_receiver, ledger, total_cost);
            if (success) {
                subscriptions.put(caller, subscription); // Add subscription plan for caller
                Debug.print("Added subscription for caller : " # Principal.toText(caller));
                Debug.print("Sub: " # debug_show (subscription));
                return #ok(subscription);
            } else {
                return #err(Errors.PaymentProcessingFailure());
            };
        };

        public func create_subscription(caller : Principal, tier_id : Nat) : async Types.Response<Types.Subscription> {
            // Validate treasury principal
            let payment_receiver = switch (treasury) {
                case null {
                    return #err(Errors.TreasuryNotSet());
                };
                case (?treasury) {
                    treasury;
                };
            };

            if (tier_id >= tiers_list.size()) {
                return #err(Errors.InvalidTier());
            };

            // // Get pricing list
            let tier : Types.Tier = tiers_list[tier_id];

            // Prevent duplicate subscription
            let get_subscription_response = await _get_subscription(caller);
            let create_response = switch (get_subscription_response) {
                case (null) {
                    Debug.print("Error getting subscription: ");
                    let subscription : Types.Subscription = {
                        user_id = caller;
                        tier_id = tier_id;
                        max_slots = tier.slots;
                        used_slots = 0;
                        canisters = [];
                        free_canisters = [];
                        date_created = Utility.get_time_now(#milliseconds);
                        date_updated = Utility.get_time_now(#milliseconds);
                    };

                    // subscription;
                    await _create_subscription(caller, tier_id, subscription, payment_receiver);
                };
                case (?sub) {

                    // Allow upgrade/downgrade only
                    if (sub.tier_id == tier_id) {
                        return #err(Errors.SubscriptionAlreadyExists());
                    };

                    let subscription : Types.Subscription = {
                        user_id = sub.user_id;
                        tier_id = tier_id;
                        max_slots = tier.slots;
                        used_slots = sub.used_slots;
                        canisters = sub.canisters;
                        free_canisters = [];
                        date_created = Utility.get_time_now(#milliseconds);
                        date_updated = Utility.get_time_now(#milliseconds);
                    };

                    await _create_subscription(caller, tier_id, subscription, payment_receiver);
                };
            };

            return create_response;
        };

        public func push_canister_id(caller : Principal, canister_id : Principal) : async Bool {
            let subscription = get_subscription(caller);
            switch (subscription) {
                case (#err(_)) { return false };
                case (#ok(sub)) {
                    subscriptions.put(caller, { sub with canisters = Array.append(sub.canisters, [canister_id]) });
                    return true;
                };
            };
        };

        // Decrements the usage count, and pushes the canister to unused array
        public func update_sub_delete_project(caller : Principal, canister_id : Principal) : async Types.Response<()> {
            let subscription : Types.Subscription = switch (get_subscription(caller)) {
                case (#err(_msg)) { return #err(_msg) };
                case (#ok(sub)) {
                    sub;
                };
            };

            // Remove project canister from used array
            let updated_used_canisters : [Principal] = Array.filter(subscription.canisters, func(c : Principal) : Bool { c == canister_id });

            // Update free canisters
            let updated_free_canisters = Array.append(subscription.free_canisters, [canister_id]);

            // Decrement used slots count
            let updated_used_slot_count : Nat = switch (subscription.used_slots == 0) {
                case (true) { 0 };
                case (false) { subscription.used_slots - 1 };
            };

            // Update subscription records
            let updated_subscription : Types.Subscription = {
                user_id = subscription.user_id;
                tier_id = subscription.tier_id;
                canisters = updated_used_canisters;
                free_canisters = updated_free_canisters;
                used_slots = updated_used_slot_count;
                max_slots = subscription.max_slots;
                date_created = subscription.date_created;
                date_updated = Utility.get_time_now(#milliseconds);
            };

            subscriptions.put(caller, updated_subscription);
            return #ok();
        };

        public func validate_subscription(caller : Principal) : async Bool {
            let subscription = get_subscription(caller);
            switch (subscription) {
                case (#err(_)) { return false };
                case (#ok(sub)) {
                    let tier = tiers_list[sub.tier_id];
                    if (sub.canisters.size() >= tier.slots) {
                        return false;
                    };
                    return true;
                };
            };
        };

        /** Stable Storage */

        // Function to get data for stable storage
        public func getStableData() : [(Principal, Types.Subscription)] {
            Iter.toArray(subscriptions.entries());
        };

        // Function to restore from stable storage
        public func loadFromStable(stable_data : [(Principal, Types.Subscription)]) {
            subscriptions := HashMap.fromIter<Principal, Types.Subscription>(
                stable_data.vals(),
                stable_data.size(),
                Principal.equal,
                Principal.hash,
            );
        };
        /** End Stable Storage */

    };
};
