import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  SharedCanisterStatus,
  Tier,
} from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import SubscriptionApi, {
  SubscribeResponse,
} from "../../api/subscription/SubscriptionApi";

import { useIdentity } from "../IdentityContext/IdentityContext";
import LedgerApi from "../../api/ledger/LedgerApi";
import { backend_canister_id } from "../../config/config";
import { useCycles } from "../CyclesContext/CyclesContext";
import MainApi from "../../api/main";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";
import { useQuery } from "@tanstack/react-query";
import { sanitizeObject } from "../../utility/sanitize";
import { useLoadBar } from "../LoadBarContext/LoadBarContext";
import { useSubscription } from "../SubscriptionContext/SubscriptionContext";

interface FreemiumValidation {
  status: boolean;
  message: string;
  max: number;
  current: number;
}

export interface TierListData {
  id: number;
  name: string;
  price: number;
  min_deposit: number;
  features: string[];
  slots: number;
}

enum SlotStatus {
  occupied = "Active Trial",
  available = "Inactive",
}

export interface FreemiumUsageData {
  canister_id: string;
  owner: string; // controller of the canister
  user: string; // current user of the canister
  start_timestamp: bigint; //time user occupied the canister
  create_timestamp: bigint; //time user occupied the canister
  duration: bigint; //total time allowed for a single user to occupy a canister
  start_cycles: bigint; // total cycles available at start_timestamp
  status: SlotStatus;
}

interface FreemiumContextType {
  isLoadingUsageData: boolean;
  shouldRefetchFreemiumUsage: boolean;
  usageData: FreemiumUsageData;
  setShouldRefetchFreemiumUsage: (value: boolean) => void;
  refreshFreemiumUsage: () => void;
  getFreemiumUsage: () => Promise<FreemiumUsageData | null>;
  validateSubscription: (
    refreshSubscription: boolean
  ) => Promise<FreemiumValidation>;
}

export const FreemiumContext = createContext<FreemiumContextType | undefined>(
  undefined
);

export function FreemiumProvider({ children }: { children: ReactNode }) {
  /** Hooks */
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { setShowLoadBar, setCompleteLoadBar } = useLoadBar();
  const { tiers } = useSubscription();
  /** States */
  const [shouldRefetchFreemiumUsage, setShouldRefetchFreemiumUsage] =
    useState<boolean>(true);
  const VERIFICATION_INTERVAL = 10 * 60 * 1000; // 10mins
  let queryNameSubscription = "freemium";

  const { data: usageData = false, isLoading: isLoadingUsageData } = useQuery({
    queryKey: [queryNameSubscription, identity?.getPrincipal().toText()],
    queryFn: async () => {
      try {
        setShowLoadBar(true);
        console.log(`Regreshing freemium usage...`);
        const res = await getFreemiumUsage();

        if (!res) {
          console.log("No freemium entry found");
          return null;
        }

        if (!identity) {
          console.log("No identity found");
          return null;
        }

        // save to local storage
        const storageData = {
          status: res,
          timestamp: Date.now(),
          principal: identity.getPrincipal().toText(),
        };

        localStorage.setItem(
          queryNameSubscription,
          JSON.stringify(storageData)
        );

        return res;
      } catch (error) {
        console.error("Error in queryFn getFreemiumUsage:", error);
        throw error;
      } finally {
        setCompleteLoadBar(true);
        setShouldRefetchFreemiumUsage(false);
      }
    },
    initialData: () => {
      const stored = localStorage.getItem(queryNameSubscription);
      if (!stored) {
        return null;
      }

      const { status, timestamp, principal } = JSON.parse(stored);
      const isExpired = Date.now() - timestamp > VERIFICATION_INTERVAL;
      if (isExpired) {
        localStorage.removeItem(queryNameSubscription);
        return false;
      }

      if (identity && principal !== identity.getPrincipal().toText()) {
        localStorage.removeItem(queryNameSubscription);
        return false;
      }
      return status;
    },
    staleTime: 0,
    refetchInterval: VERIFICATION_INTERVAL,
    refetchOnMount: true,
    enabled: !!identity && !!agent && shouldRefetchFreemiumUsage,
  });

  // Function to trigger manual refetch
  const refreshFreemiumUsage = () => {
    setShouldRefetchFreemiumUsage(true);
  };

  const validateSubscription = async (refreshSubscription: boolean) => {
    // Refresh subscription
    if (refreshSubscription) {
      await getFreemiumUsage();
    }

    if (!tiers) {
      return {
        status: false,
        message: "No tiers found",
        max: 0,
        current: 0,
      };
    }

    if (!usageData) {
      return {
        status: false,
        message: "No usageData found",
        max: 0,
        current: 0,
      };
    }

    const maxSlots = Number(tiers[Number(usageData?.tier_id)].slots);
    const currentSlots = usageData?.canisters.length;
    if (currentSlots >= maxSlots) {
      return {
        status: false,
        message:
          "You have reached the maximum number of canisters for this tier",
        max: maxSlots,
        current: currentSlots,
      };
    }

    return {
      status: true,
      message: `Used ${currentSlots}/${maxSlots} canister slots.`,
      max: maxSlots,
      current: currentSlots,
    };
  };

  const getFreemiumUsage = async () => {
    try {
      if (!agent) {
        console.log(`No agent found in get subscription`);
        return null;
      }
      console.log(`Getting subscription`);
      const mainApi = await MainApi.create(identity, agent);
      const usage = await mainApi?.getUserFreemiumUsage();
      if (!usage) {
        console.log(`no usage log found at all`);
        return null;
      } else {
        return sanitizeObject(usage) as FreemiumUsageData;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  return (
    <FreemiumContext.Provider
      value={{
        usageData,
        isLoadingUsageData,
        getFreemiumUsage,
        refreshFreemiumUsage,
        shouldRefetchFreemiumUsage,
        setShouldRefetchFreemiumUsage,
        validateSubscription,
      }}
    >
      {children}
    </FreemiumContext.Provider>
  );
}

export function useFreemium() {
  const context = useContext(FreemiumContext);
  if (context === undefined) {
    throw new Error("useFreemium must be used within a SubscriptionProvider");
  }
  return context;
}
