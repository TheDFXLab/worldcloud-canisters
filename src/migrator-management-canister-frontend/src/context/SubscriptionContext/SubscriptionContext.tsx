import { createContext, ReactNode, useContext } from "react";
import { FrontendTier } from "../../state/slices/subscriptionSlice";
import { SubscriptionData } from "../../state/slices/subscriptionSlice";
import { useSubscriptionLogic } from "../../hooks/useSubscriptionLogic";
import { SubscribeResponse } from "../../api/subscription/SubscriptionApi";

interface SubscriptionValidation {
  status: boolean;
  message: string;
  max: number;
  current: number;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  tiers: FrontendTier[] | null;
  isLoadingSub: boolean;
  isLoadingTiers: boolean;
  refreshSubscription: () => void;
  subscribe: (
    tierId: number,
    amountInIcp: number
  ) => Promise<SubscribeResponse>;
  validateSubscription: (
    refreshSubscription: boolean
  ) => Promise<SubscriptionValidation>;
}

export const SubscriptionContext = createContext<
  SubscriptionContextType | undefined
>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  // Instead of managing state here, we use our Redux hook
  const {
    subscription,
    tiers,
    isLoadingSub,
    isLoadingTiers,
    refreshSubscription,
    validateSubscription,
    subscribe,
  } = useSubscriptionLogic();

  const value = {
    subscription,
    tiers,
    isLoadingSub,
    isLoadingTiers,
    refreshSubscription,
    validateSubscription,
    subscribe,
  };

  return (
    <SubscriptionContext.Provider value={value}>
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
