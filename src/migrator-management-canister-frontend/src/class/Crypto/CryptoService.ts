import { get, set } from 'idb-keyval';

// Usage of the imported bindings only works if the respective .wasm was loaded, which is done in main.ts.
// See also https://github.com/rollup/plugins/tree/master/packages/wasm#using-with-wasm-bindgen-and-wasm-pack
import * as vetkd from "@dfinity/vetkeys";
import { BackendActor } from '../../api/main';
import { Principal } from '@dfinity/principal';

export class CryptoService {
    constructor(private actor: BackendActor) {
    }

    // The function encrypts data with the note-id-specific secretKey.
    public async encryptWithApiKeyKey(principal: Principal, owner: string, data: string): Promise<string> {
        await this.fetch_api_key_key_if_needed(principal, owner);

        const principal_key: CryptoKey | undefined = await get([principal.toString(), owner]);
        if (!principal_key) {
            throw new Error(`Api key not found`);
        }
        const data_encoded = Uint8Array.from([...data].map(ch => ch.charCodeAt(0))).buffer
        // The iv must never be reused with a given key.
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            principal_key,
            data_encoded
        );

        const iv_decoded = String.fromCharCode(...new Uint8Array(iv));
        const cipher_decoded = String.fromCharCode(...new Uint8Array(ciphertext));
        return iv_decoded + cipher_decoded;
    }

    // The function decrypts the given input data with the note-id-specific secretKey.
    public async decryptWithApiKeyKey(principal: Principal, owner: string, data: string) {
        await this.fetch_api_key_key_if_needed(principal, owner);
        const principal_key: CryptoKey | undefined = await get([principal.toString(), owner]);

        if (!principal_key) {
            throw new Error(`Symmetric key not found`);
        }

        if (data.length < 13) {
            throw new Error('wrong encoding, too short to contain iv');
        }
        const iv_decoded = data.slice(0, 12);
        const cipher_decoded = data.slice(12);
        const iv_encoded = Uint8Array.from([...iv_decoded].map(ch => ch.charCodeAt(0))).buffer;
        const ciphertext_encoded = Uint8Array.from([...cipher_decoded].map(ch => ch.charCodeAt(0))).buffer;

        let decrypted_data_encoded = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv_encoded
            },
            principal_key,
            ciphertext_encoded
        );
        const decrypted_data_decoded = String.fromCharCode(...new Uint8Array(decrypted_data_encoded));
        return decrypted_data_decoded;
    }

    private async fetch_api_key_key_if_needed(principal: Principal, owner: string): Promise<void> {
        if (!await get([principal.toString(), owner])) {
            const tsk = vetkd.TransportSecretKey.random();

            const ek_bytes_hex = await this.actor.encrypted_symmetric_key_for_api_key(tsk.publicKeyBytes());
            const encryptedVetKey = new vetkd.EncryptedVetKey(hex_decode(ek_bytes_hex));

            const pk_bytes_hex = await this.actor.symmetric_key_verification_key_for_api_key();
            const dpk = vetkd.DerivedPublicKey.deserialize(hex_decode(pk_bytes_hex));

            const principal_bytes: Uint8Array = Buffer.from(principal.toString());
            let input = principal_bytes;
            input.set(principal_bytes);

            const vetKey = encryptedVetKey.decryptAndVerify(tsk, dpk, input);

            const principal_key = await (await vetKey.asDerivedKeyMaterial()).deriveAesGcmCryptoKey("principal-key");
            await set([principal.toString(), owner], principal_key)
        }
    }
}

const hex_decode = (hexString: string) => {

    const obj = hexString.match(/.{1,2}/g);
    if (!obj) {
        throw new Error(`Obj is null`);
    }
    return Uint8Array.from(obj).map((byte: any) => parseInt(byte, 16));
}


// Inspired by https://coolaj86.com/articles/convert-js-bigints-to-typedarrays/
function bigintTo128BitBigEndianUint8Array(bn: bigint): Uint8Array {
    var hex = BigInt(bn).toString(16);

    // extend hex to length 32 = 16 bytes = 128 bits
    while (hex.length < 32) {
        hex = '0' + hex;
    }

    var len = hex.length / 2;
    var u8 = new Uint8Array(len);

    var i = 0;
    var j = 0;
    while (i < len) {
        u8[i] = parseInt(hex.slice(j, j + 2), 16);
        i += 1;
        j += 2;
    }

    return u8;
}