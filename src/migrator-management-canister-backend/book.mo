import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Principal "mo:base/Principal";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Map "mo:core/Map";
import Order "mo:core/Order";
import T "types";
import Utility "utils/Utility";

module {
  public class Book(book_init : T.BookMap) {

    var book = book_init;

    public func get(user : Principal) : ?Map.Map<T.Token, Nat> {
      Map.get(book, Principal.compare, user);
    };

    public func put(user : Principal, userBalances : Map.Map<T.Token, Nat>) {
      Map.add(book, Principal.compare, user, userBalances);
    };

    public func entries() : Iter.Iter<(Principal, Map.Map<T.Token, Nat>)> {
      Map.entries(book);
    };

    public func size() : Nat {
      Map.size(book);
    };

    public func get_all_entries() : T.Response<[(Principal, Map.Map<T.Token, Nat>)]> {
      #ok(Iter.toArray(Map.entries(book)));
    };

    public func get_all_entries_paginated(payload : T.PaginationPayload) : T.Response<[(Principal, Map.Map<T.Token, Nat>)]> {
      let all_entries = Iter.toArray(Map.entries(book));
      let paginated_entries = Utility.paginate(all_entries, payload);
      #ok(paginated_entries);
    };
    public func toStable() : [(Principal, [(T.Token, Nat)])] {
      let entries = Iter.toArray(Map.entries(book));
      Array.map<(Principal, Map.Map<T.Token, Nat>), (Principal, [(T.Token, Nat)])>(
        entries,
        func(entry) {
          let (principal, innerMap) = entry;
          (principal, Iter.toArray(Map.entries(innerMap)));
        },
      );
    };

    public func fromStable(stable_data : [(Principal, [(T.Token, Nat)])]) {
      for ((principal, innerEntries) in stable_data.vals()) {
        let innerMap = Map.empty<T.Token, Nat>();
        for ((token, amount) in innerEntries.vals()) {
          Map.add(innerMap, Principal.compare, token, amount);
        };
        Map.add(book, Principal.compare, principal, innerMap);
      };
    };

    public func getUsersCumulativeBalance(canisterPrincipal : Principal, token : T.Token) : Nat {
      var cumulativeUserBalance = 0;
      for ((x, y) in Map.entries(book)) {
        if (x != canisterPrincipal) {
          for ((key : T.Token, value : Nat) in Map.entries(y)) {
            if (key == token) {
              cumulativeUserBalance += value;
            };
          };
        };

      };
      return cumulativeUserBalance;
    };

    public func clear() {
      book := Map.empty<Principal, Map.Map<T.Token, Nat>>();
    };

    // function that adds tokens to book. Book keeps track of users deposits.
    public func addTokens(user : Principal, token : T.Token, amount : Nat) {
      switch (Map.get(book, Principal.compare, user)) {
        case (?token_balance) {
          // check if user already has existing balance for this token
          switch (Map.get(token_balance, Principal.compare, token)) {
            case (?balance) {
              Map.add(token_balance, Principal.compare, token, balance + amount);
            };
            case (null) {
              Map.add(token_balance, Principal.compare, token, amount);
            };
          };
        };
        case (null) {
          // user didn't exist
          let x1 = Map.empty<T.Token, Nat>();
          Map.add(x1, Principal.compare, token, amount);
          Map.add(book, Principal.compare, user, x1);
        };
      };
    };

    // return the new balance.
    public func removeTokens(user : Principal, token : T.Token, amount : Nat) : ?Nat {
      switch (Map.get(book, Principal.compare, user)) {
        case (?token_balance) {
          // check if user already has existing balance for this token
          switch (Map.get(token_balance, Principal.compare, token)) {
            case (?balance) {
              if (balance >= amount) {
                if (balance == amount) {
                  ignore Map.delete(token_balance, Principal.compare, token);
                } else {
                  var remaining = 0;
                  if (balance > amount) {
                    remaining := balance - amount;
                  };
                  Map.add(token_balance, Principal.compare, token, remaining);
                };
                ?(balance - amount);
              } else {
                null;
              };
            };
            case (null) {
              null;
            };
          };
        };
        case (null) {
          null;
        };
      };
    };

    // Increase deposited amount for `to` principal
    public func process_payment(from : Principal, to : Principal, token : T.Token, amount : Nat) : Bool {
      let _removed_credits = removeTokens(from, token, amount);
      switch (_removed_credits) {
        case (null) {
          return false;
        };
        case (_) {
          addTokens(to, token, amount);
          return true;
        };
      };
    };

    // Return true if a user has at least amount tokens in the book, false otherwise.
    public func hasEnoughBalance(user : Principal, token : Principal, amount : Nat) : Bool {
      switch (Map.get(book, Principal.compare, user)) {
        case (?balances) {
          switch (Map.get(balances, Principal.compare, token)) {
            case (?balance) return balance >= amount;
            case null return false;
          };
        };
        case null return false;
      };
    };

    public func fetchUserIcpBalance(user : Principal, token : Principal) : Nat {
      switch (Map.get(book, Principal.compare, user)) {
        case (?balances) {
          switch (Map.get(balances, Principal.compare, token)) {
            case (?balance) return balance;
            case null return 0;
          };
        };
        case null return 0;
      };
    };
  };
};
