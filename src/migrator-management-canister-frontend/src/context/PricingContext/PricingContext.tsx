import { createContext, ReactNode, useContext, useState } from "react";
import { Tier } from "../../../../declarations/migrator-management-canister-backend/migrator-management-canister-backend.did";
import SubscriptionApi from "../../api/subscription/SubscriptionApi";

import { useIdentity } from "../IdentityContext/IdentityContext";
import { useQuery } from "@tanstack/react-query";
import { sanitizeObject } from "../../utility/sanitize";
import { useHttpAgent } from "../HttpAgentContext/HttpAgentContext";
import { preset_tiers } from "./tiers";

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
  preset_tiers: Tier[];
}
export const PricingContext = createContext<PricingContextType | undefined>(
  undefined
);

export function PricingProvider({ children }: { children: ReactNode }) {
  /** Hooks */
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const [preset_tiers] = useState(preset);

  /** States */
  const VERIFICATION_INTERVAL = 10 * 60 * 1000; // 10mins

  let queryNameTiersList = "tiersList";
  const { data: tiers = false, isLoading: isLoadingTiers } = useQuery({
    queryKey: [queryNameTiersList, agent, identity],
    queryFn: async () => {
      try {
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
      const stored = localStorage.getItem(queryNameTiersList);
      if (!stored) {
        return null;
      }

      const parsedData = JSON.parse(stored);
      const { status, timestamp } = parsedData;

      // Check if data is expired
      const isExpired = Date.now() - timestamp > VERIFICATION_INTERVAL;
      if (isExpired) {
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

  const getTiersList = async () => {
    try {
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

  return (
    <PricingContext.Provider
      value={{
        tiers,
        isLoadingTiers,
        preset_tiers: preset_tiers,
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

export const preset = [
  {
    id: BigInt(0),
    name: "Basic",
    slots: BigInt(1),
    min_deposit: { e8s: BigInt(50_000_000) }, // 0.5 ICP
    price: { e8s: BigInt(0) }, // Free tier
    features: [
      "1 Canister",
      "Basic Support",
      "Manual Deployments",
      "GitHub Integration",
    ],
  },
  {
    id: BigInt(1),
    name: "Pro",
    slots: BigInt(5),
    min_deposit: { e8s: BigInt(200_000_000) }, // 2 ICP
    price: { e8s: BigInt(500_000_000) }, // 5 ICP
    features: [
      "5 Canisters",
      "Priority Support",
      "Automated Deployments",
      "Custom Domains",
      "Deployment History",
      "Advanced Analytics",
    ],
  },
  {
    id: BigInt(2),
    name: "Enterprise",
    slots: BigInt(25),
    min_deposit: { e8s: BigInt(500_000_000) }, // 5 ICP
    price: { e8s: BigInt(2_500_000_000) }, // 25 ICP
    features: [
      "25 Canisters",
      "24/7 Support",
      "Team Management",
      "Advanced Analytics",
      "Priority Queue",
      "Custom Branding",
      "API Access",
    ],
  },
  {
    id: BigInt(3),
    name: "Freemium",
    slots: BigInt(1),
    min_deposit: { e8s: BigInt(0) },
    price: { e8s: BigInt(0) }, // Free tier
    features: [
      "1 Canister",
      "Manual Deployments",
      "GitHub Integration",
      "4hrs Demo Hosting Trial",
      "3 Free Trials per day",
    ],
  },
];
