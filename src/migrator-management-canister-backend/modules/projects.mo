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

    public class ProjectManager() {
        private var projects : HashMap.HashMap<Nat, Types.Project> = HashMap.HashMap<Nat, Types.Project>(0, Nat.equal, Hash.hash);
        private var user_to_projects : HashMap.HashMap<Principal, [Nat]> = HashMap.HashMap<Principal, [Nat]>(0, Principal.equal, Principal.hash);
        private var next_project_id : Nat = 0;
        private var canister_table : HashMap.HashMap<Principal, Types.CanisterDeployment> = HashMap.HashMap<Principal, Types.CanisterDeployment>(0, Principal.equal, Principal.hash);

        public func get_project_by_id(project_id : Nat) : Types.Response<Types.Project> {
            let project : Types.Project = switch (projects.get(project_id)) {
                case (null) { return #err(Errors.NotFoundProject()) };
                case (?_project) { _project };
            };

            return #ok(project);
        };

        public func put_project(project_id : Nat, payload : Types.Project) : () {
            projects.put(project_id, payload);
        };

        public func put_canister_table(canister_id : Principal, payload : Types.CanisterDeployment) {
            canister_table.put(canister_id, payload);
        };

        public func get_deployment_by_canister(canister_id : Principal) : ?Types.CanisterDeployment {
            let deployment : Types.CanisterDeployment = Utility.expect(canister_table.get(canister_id), Errors.NotFoundCanister());
            ?deployment;
        };

        public func get_projects_by_user(user : Principal, payload : Types.GetProjectsByUserPayload) : async Types.Response<[Types.Project]> {
            let project_ids : [Nat] = Utility.expect_else(user_to_projects.get(user), []);
            Debug.print("Project length " # Nat.toText(project_ids.size()));
            // Early return for empty projects
            if (project_ids.size() == 0) return #ok([]);

            let _limit = Utility.expect_else(payload.limit, 20);
            var _page = Utility.expect_else(payload.page, 0);
            Debug.print("Limit page " # Nat.toText(_limit) # " " # Nat.toText(_page));

            // Paginate data
            var start = _page * _limit;
            var end = if (start + _limit >= project_ids.size() - 1) {
                project_ids.size() - 1; // Return empty array if start is beyond array bounds
            } else {
                start + _limit; // Don't go beyond array bounds
            };

            Debug.print("Start " # Nat.toText(start) # " end " # Nat.toText(end));

            // If start is beyond array bounds, return empty array
            if (start >= project_ids.size()) {
                return #ok([]);
            };

            var result_projects : [Types.Project] = [];
            for (index in Iter.range(start, end)) {
                let project_id = project_ids[index];
                Debug.print("Index: " # Nat.toText(index) # " project id: " # Nat.toText(project_id));
                let project = Utility.expect(projects.get(project_id), Errors.NotFoundProject());
                result_projects := Array.append(result_projects, [project]);
            };

            #ok(result_projects);
        };

        public func is_freemium_session_active(project_id : Types.ProjectId) : Types.Response<Bool> {
            let project : Types.Project = switch (projects.get(project_id)) {
                case (null) { return #err(Errors.NotFoundProject()) };
                case (?p) { p };
            };

            switch (project.plan) {
                case (#paid) { return #ok(false) };
                case (#freemium) {
                    if (project.canister_id == null) {
                        return #ok(false);
                    } else {
                        return #ok(true);
                    };
                };
            };
        };

        /** Destructive Methods */
        public func drop_projects() : Bool {
            projects := HashMap.HashMap<Nat, Types.Project>(0, Nat.equal, Hash.hash);
            user_to_projects := HashMap.HashMap<Principal, [Nat]>(0, Principal.equal, Principal.hash);
            // next_project_id := 0;
            return true;
        };

        public func drop_project(user : Principal, project_id : Nat) : Types.Response<Bool> {

            let user_projects : [Nat] = switch (user_to_projects.get(user)) {
                case (null) { return #err(Errors.NotFoundProject()) };
                case (?projects) { projects };
            };

            var new_array : [Nat] = [];
            for (index in Iter.range(0, user_projects.size() - 1)) {
                let project : Types.Project = Utility.expect(projects.get(project_id), Errors.NotFoundProject());
                if (not (project.id == project_id)) {
                    let non_matching : [Nat] = Array.append(new_array, [project.id]);
                };
            };

            user_to_projects.put(user, new_array);
            projects.delete(project_id);
            return #ok(true);
        };

        public func create_project(user : Principal, payload : Types.CreateProjectPayload) : Nat {

            // Create the project record
            let project : Types.Project = {
                id = next_project_id;
                user = user;
                canister_id = null;
                name = payload.project_name;
                description = payload.project_description;
                tags = payload.tags;
                plan = payload.plan;
                date_created = Utility.get_time_now(#milliseconds);
                date_updated = Utility.get_time_now(#milliseconds);
            };

            Debug.print("Creating new project: " # debug_show (project));
            // Store the records
            projects.put(next_project_id, project);
            let existing_projects : [Nat] = Utility.expect_else(user_to_projects.get(user), []);
            user_to_projects.put(user, Array.append(existing_projects, [next_project_id]));

            // Update the next project id
            next_project_id += 1;

            return next_project_id - 1;
        };

        /**Start stable management */

        // Function to get data for stable storage
        public func get_stable_data_projects() : [(Nat, Types.Project)] {
            Iter.toArray(projects.entries());
        };
        public func get_stable_data_user_to_projects() : [(Principal, [Nat])] {
            Iter.toArray(user_to_projects.entries());
        };
        public func get_stable_data_next_project_id() : Nat {
            next_project_id;
        };

        public func get_stable_data_canister_table() : [(Principal, Types.CanisterDeployment)] {
            Iter.toArray(canister_table.entries());
        };

        // Function to restore from stable storage
        public func load_from_stable_projects(stable_data : [(Nat, Types.Project)]) {
            projects := HashMap.fromIter<Nat, Types.Project>(
                stable_data.vals(),
                stable_data.size(),
                Nat.equal,
                Hash.hash,
            );
        };

        public func load_from_stable_user_to_projects(stable_data : [(Principal, [Nat])]) {
            user_to_projects := HashMap.fromIter<Principal, [Nat]>(
                stable_data.vals(),
                stable_data.size(),
                Principal.equal,
                Principal.hash,
            );
        };

        public func load_from_stable_next_project_id(stable_data : Nat) {
            next_project_id := stable_data;
        };

        public func load_from_stable_canister_table(stable_data : [(Principal, Types.CanisterDeployment)]) {
            canister_table := HashMap.fromIter(
                stable_data.vals(),
                stable_data.size(),
                Principal.equal,
                Principal.hash,
            );

            Debug.print("Postupgrade: Restored canister deployments: " # Nat.toText(canister_table.size()));
        }

        /** End class */

    }

};
