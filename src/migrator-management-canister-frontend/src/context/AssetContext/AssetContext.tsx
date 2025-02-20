import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Principal } from "@dfinity/principal";
import AuthorityApi from "../../api/authority";
import { CanisterAsset } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import { useIdentity } from "../IdentityContext/IdentityContext";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";

interface AssetContextType {
  assets: CanisterAsset[];
  isLoadingAssets: boolean;
  refreshAssets: () => Promise<void>;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export function AssetProvider({
  children,
  canisterId,
}: {
  children: ReactNode;
  canisterId: Principal;
}) {
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assets, setAssets] = useState<CanisterAsset[]>([]);
  const authApi = new AuthorityApi(canisterId);

  const refreshAssets = async () => {
    try {
      if (!agent) {
        throw new Error("Agent not found");
      }
      setIsLoadingAssets(true);
      const result = await authApi.getAssetList(canisterId, identity, agent);
      setAssets(result.assets);
    } catch (error) {
      setIsLoadingAssets(false);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  useEffect(() => {
    refreshAssets();
  }, []);

  return (
    <AssetContext.Provider
      value={{
        assets,
        isLoadingAssets,
        refreshAssets,
      }}
    >
      {children}
    </AssetContext.Provider>
  );
}
export function useAsset() {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error("useAsset must be used within a AssetProvider");
  }
  return context;
}
