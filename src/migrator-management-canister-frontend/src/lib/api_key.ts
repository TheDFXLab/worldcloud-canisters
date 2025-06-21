import { Principal } from "@dfinity/principal";
import { EncryptedApiKey } from "../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { CryptoService } from "../class/Crypto/CryptoService";

export interface GithubApiKeyModel {
    id: bigint;
    principal: Principal;
    createdAt: number;
    updatedAt: number;
    owner: string;
    encrypted_text: string;
};
type SerializableApiKeyModel = Omit<GithubApiKeyModel, 'owner' | 'principal'>;

export async function deserialize(
    encrypted_api_key: EncryptedApiKey,
    cryptoService: CryptoService
): Promise<GithubApiKeyModel> {
    const serializedNote = await cryptoService.decryptWithApiKeyKey(encrypted_api_key.owner, encrypted_api_key.owner.toString(), encrypted_api_key.encrypted_text);
    const deserializedKey: SerializableApiKeyModel = JSON.parse(serializedNote);

    console.log(`Deserialized key:`, deserializedKey)
    return {
        principal: encrypted_api_key.owner,
        owner: encrypted_api_key.owner.toString(),
        ...deserializedKey,
    };
}

export async function serialize(
    apiKeyObj: GithubApiKeyModel,
    cryptoService: CryptoService
): Promise<EncryptedApiKey> {
    const serializableNote: SerializableApiKeyModel = {
        id: apiKeyObj.id,
        encrypted_text: apiKeyObj.encrypted_text,
        createdAt: apiKeyObj.createdAt,
        updatedAt: apiKeyObj.updatedAt,
    };
    const encryptedApiKey = await cryptoService.encryptWithApiKeyKey(
        apiKeyObj.principal,
        apiKeyObj.owner.toString(),
        JSON.stringify(serializableNote)
    );
    return {
        id: apiKeyObj.id,
        encrypted_text: encryptedApiKey,
        owner: apiKeyObj.principal,
    };
}