import Array "mo:base/Array";
import Types "../types";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Hex "../utils/Hex";
import Blob "mo:base/Blob";
import SHA256 "../utils/SHA256";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Nat8 "mo:base/Nat8";

module {
    let IC_MANAGEMENT_CANISTER = "aaaaa-aa"; // Production

    public func symmetric_key_verification_key_for_api_key() : async Text {
        let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);
        let { public_key } = await IC.vetkd_public_key({
            canister_id = null;
            context = Text.encodeUtf8("api_key_symmetric_key");
            key_id = { curve = #bls12_381_g2; name = "test_key_1" };
        });
        Hex.encode(Blob.toArray(public_key));
    };

    // TODO: Validation for principal
    public func encrypted_symmetric_key_for_api_key(principal : Principal, transport_public_key : Blob) : async Text {
        let IC : Types.IC = actor (IC_MANAGEMENT_CANISTER);

        // Hash user principal for collision resistance
        let principal_bytes = principalToBigEndianByteArray(principal);
        let principal_hash = SHA256.sha256(principal_bytes);

        let input = Blob.fromArray(principal_hash); // prefix-free

        ExperimentalCycles.add(26_153_846_153);
        let { encrypted_key } = await IC.vetkd_derive_key({
            input;
            context = Text.encodeUtf8("api_key_symmetric_key");
            key_id = { curve = #bls12_381_g2; name = "test_key_1" };
            transport_public_key;
        });
        Hex.encode(Blob.toArray(encrypted_key));
    };

    private func principalToBigEndianByteArray(principal : Principal) : [Nat8] {
        let blob = Principal.toBlob(principal);
        return Blob.toArray(blob);
    };

    // Converts a nat to a fixed-size big-endian byte (Nat8) array
    private func natToBigEndianByteArray(len : Nat, n : Nat) : [Nat8] {
        let ith_byte = func(i : Nat) : Nat8 {
            assert (i < len);
            let shift : Nat = 8 * (len - 1 - i);
            Nat8.fromIntWrap(n / 2 ** shift);
        };
        Array.tabulate<Nat8>(len, ith_byte);
    };

};
