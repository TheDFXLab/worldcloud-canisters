import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Tier } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
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

interface SubscriptionValidation {
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

export interface SubscriptionData {
  tier_id: number;
  canisters: string[];
  date_created: number;
  date_updated: number;
  max_slots: number;
  used_slots: number;
  user_id: string;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  tiers: Tier[] | null;
  isLoadingSub: boolean;
  isLoadingTiers: boolean;
  shouldRefetchSubscription: boolean;
  setShouldRefetchSubscription: (value: boolean) => void;
  refreshSubscription: () => void;
  subscribe: (
    tierId: number,
    amountInIcp: number
  ) => Promise<SubscribeResponse>;
  getSubscription: () => Promise<SubscriptionData | null>;
  validateSubscription: (
    refreshSubscription: boolean
  ) => Promise<SubscriptionValidation>;
}

export const SubscriptionContext = createContext<
  SubscriptionContextType | undefined
>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  /** Hooks */
  const { identity } = useIdentity();
  const { totalCredits } = useCycles();
  const { agent } = useHttpAgent();

  /** States */
  const [shouldRefetchSubscription, setShouldRefetchSubscription] =
    useState<boolean>(true);
  const VERIFICATION_INTERVAL = 10 * 60 * 1000; // 10mins
  let queryNameSubscription = "subscription";

  const { data: subscription = false, isLoading: isLoadingSub } = useQuery({
    queryKey: [queryNameSubscription, identity?.getPrincipal().toText()],
    queryFn: async () => {
      try {
        const res = await getSubscription();

        if (!res) {
          console.log("No subscription found");
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
        console.error("Error in queryFn getSubscription:", error);
        throw error;
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
    enabled: !!identity && !!agent && shouldRefetchSubscription,
  });

  let queryNameTiersList = "tiersList";
  const { data: tiers = false, isLoading: isLoadingTiers } = useQuery({
    queryKey: [queryNameTiersList, identity?.getPrincipal().toText()],
    queryFn: async () => {
      try {
        const res = await getTiersList();
        if (!res) {
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

        localStorage.setItem(queryNameTiersList, JSON.stringify(storageData));

        return res;
      } catch (error) {
        console.error("Error in queryFn getTiersList:", error);
        throw error;
      }
    },
    initialData: () => {
      const stored = localStorage.getItem(queryNameTiersList);
      if (!stored) {
        return null;
      }

      const { status, timestamp, principal } = JSON.parse(stored);
      const isExpired = Date.now() - timestamp > VERIFICATION_INTERVAL;
      if (isExpired) {
        localStorage.removeItem(queryNameTiersList);
        return false;
      }

      if (identity && principal !== identity.getPrincipal().toText()) {
        localStorage.removeItem(queryNameTiersList);
        return false;
      }
      return status;
    },
    staleTime: 0,
    refetchInterval: VERIFICATION_INTERVAL,
    refetchOnMount: true,
    enabled: !!identity && !!agent,
  });

  // Function to trigger manual refetch
  const refreshSubscription = () => {
    setShouldRefetchSubscription(true);
  };

  const validateSubscription = async (refreshSubscription: boolean) => {
    // Refresh subscription
    if (refreshSubscription) {
      await getSubscription();
    }

    if (!tiers) {
      return {
        status: false,
        message: "No tiers found",
        max: 0,
        current: 0,
      };
    }

    if (!subscription) {
      return {
        status: false,
        message: "No subscription found",
        max: 0,
        current: 0,
      };
    }

    const maxSlots = Number(tiers[Number(subscription?.tier_id)].slots);
    const currentSlots = subscription?.canisters.length;
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

  const getTiersList = async () => {
    try {
      if (!agent) {
        throw new Error("Agent not found");
      }
      console.log(`fetching tiers by`, identity?.getPrincipal().toText());
      console.log(`fetching tiers`, agent.config);
      const subscriptionApi = new SubscriptionApi();
      const tiers = await subscriptionApi.getTiersList(identity, agent);
      if (!tiers) {
        throw new Error("Failed to get tiers");
      }
      return sanitizeObject(tiers);
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const getAllSubscriptions = async () => {
    try {
      if (!agent) {
        return;
      }
      const subscriptionApi = new SubscriptionApi();
      const subscriptions = await subscriptionApi.getAllSubscriptions(
        identity,
        agent
      );
    } catch (error) {
      console.error(error);
    }
  };

  const getSubscription = async () => {
    try {
      if (!agent) {
        return null;
      }

      const subscriptionApi = new SubscriptionApi();
      const subscription = await subscriptionApi.getSubscription(
        identity,
        agent
      );
      if (!subscription) {
        return null;
      } else {
        return sanitizeObject(subscription) as SubscriptionData;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  const subscribe = async (
    tierId: number,
    amountInIcp: number
  ): Promise<SubscribeResponse> => {
    try {
      if (!agent) {
        throw new Error("Agent not found");
      }
      const subscriptionApi = new SubscriptionApi();

      if (!totalCredits) {
        throw new Error("Total credits not found");
      }

      // Deposit to canister if not enough credits
      if (totalCredits.total_credits < amountInIcp) {
        const ledgerApi = await LedgerApi.create(identity, agent);
        if (!ledgerApi) {
          throw new Error("Failed to create ledger api");
        }

        const transfer = await ledgerApi.transfer(
          backend_canister_id,
          amountInIcp
        );

        if (!transfer) {
          throw new Error("Failed to transfer funds");
        }

        const mainApi = await MainApi.create(identity, agent);
        if (!mainApi) {
          throw new Error("Failed to create main api");
        }

        const response = await mainApi.deposit();
        if (!response) {
          throw new Error("Failed to deposit funds");
        }
      }

      const response = await subscriptionApi.createSubscription(
        identity,
        agent,
        tierId
      );

      refreshSubscription();
      return response;
    } catch (error: any) {
      console.error("Error while subscribing..", error);
      return {
        status: false,
        message: error.message,
      };
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        tiers,
        isLoadingSub,
        isLoadingTiers,
        subscribe,
        getSubscription,
        refreshSubscription,
        shouldRefetchSubscription,
        setShouldRefetchSubscription,
        validateSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
}
