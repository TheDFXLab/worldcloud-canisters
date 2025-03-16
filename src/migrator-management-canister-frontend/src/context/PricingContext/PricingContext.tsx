import { createContext, ReactNode, useContext } from "react";
import { Tier } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import SubscriptionApi from "../../api/subscription/SubscriptionApi";

import { useIdentity } from "../IdentityContext/IdentityContext";
import { useQuery } from "@tanstack/react-query";
import { sanitizeObject } from "../../utility/sanitize";

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

interface PricingContextType {
  tiers: Tier[] | null;
  isLoadingTiers: boolean;
}

export const PricingContext = createContext<PricingContextType | undefined>(
  undefined
);

export function PricingProvider({ children }: { children: ReactNode }) {
  /** Hooks */
  const { identity } = useIdentity();

  /** States */
  const VERIFICATION_INTERVAL = 10 * 60 * 1000; // 10mins

  let queryNameTiersList = "tiersList";
  const { data: tiers = false, isLoading: isLoadingTiers } = useQuery({
    queryKey: [queryNameTiersList],
    queryFn: async () => {
      try {
        console.log("fetching tiers");
        const res = await getTiersList();
        if (!res) {
          return null;
        }

        // save to local storage - simplified
        const storageData = {
          status: res,
          timestamp: Date.now(),
        };

        localStorage.setItem(queryNameTiersList, JSON.stringify(storageData));

        return res;
      } catch (error) {
        console.error("Error in queryFn getTiersList:", error);
        throw error;
      }
    },
    initialData: () => {
      console.log("initialData for tiers running");
      const stored = localStorage.getItem(queryNameTiersList);
      if (!stored) {
        console.log("No stored tiers data found");
        return null;
      }

      const parsedData = JSON.parse(stored);
      const { status, timestamp } = parsedData;

      // Check if data is expired
      const isExpired = Date.now() - timestamp > VERIFICATION_INTERVAL;
      if (isExpired) {
        console.log("Tiers data expired");
        localStorage.removeItem(queryNameTiersList);
        return false;
      }

      console.log("Using cached tiers data");
      return status;
    },
    staleTime: 0,
    refetchInterval: VERIFICATION_INTERVAL,
    refetchOnMount: true,
    enabled: true,
  });

  const getTiersList = async () => {
    try {
      console.log("fetching tiers");
      const subscriptionApi = new SubscriptionApi();
      const tiers = await subscriptionApi.getTiersList(identity);
      if (!tiers) {
        throw new Error("Failed to get tiers");
      }
      return sanitizeObject(tiers);
    } catch (error) {
      console.error(error);
      return null;
    }
  };

  return (
    <PricingContext.Provider
      value={{
        tiers,
        isLoadingTiers,
      }}
    >
      {children}
    </PricingContext.Provider>
  );
}

export function usePricing() {
  const context = useContext(PricingContext);
  if (context === undefined) {
    throw new Error("usePricing must be used within a PricingProvider");
  }
  return context;
}
