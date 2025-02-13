import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Subscription,
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

interface SubscriptionValidation {
  status: boolean;
  message: string;
  max: number;
  current: number;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  tiers: Tier[] | null;
  isLoadingSub: boolean;
  isLoadingTiers: boolean;
  subscribe: (
    tierId: number,
    amountInIcp: number
  ) => Promise<SubscribeResponse>;
  getSubscription: () => Promise<void>;
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

  /** States */
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoadingSub, setIsLoadingSub] = useState<boolean>(false);
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [isLoadingTiers, setIsLoadingTiers] = useState<boolean>(false);
  const [refreshSubscription, setRefreshSubscription] = useState<boolean>(true);

  useEffect(() => {
    if (!identity) return;
    getTiersList();
    getSubscription();
    getAllSubscriptions();
    setRefreshSubscription(true);
  }, [identity]);

  useEffect(() => {
    if (refreshSubscription) {
      if (!identity) return;
      getSubscription();
      setRefreshSubscription(false);
    }
  }, [refreshSubscription]);

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
      setIsLoadingTiers(true);
      const subscriptionApi = new SubscriptionApi();
      const tiers = await subscriptionApi.getTiersList(identity);
      if (!tiers) {
        throw new Error("Failed to get tiers");
      }
      setTiers(tiers);
    } catch (error) {
    } finally {
      setIsLoadingTiers(false);
    }
  };

  const getAllSubscriptions = async () => {
    try {
      const subscriptionApi = new SubscriptionApi();
      const subscriptions = await subscriptionApi.getAllSubscriptions(identity);
    } catch (error) {
      console.error(error);
    }
  };

  const getSubscription = async () => {
    try {
      setIsLoadingSub(true);
      const subscriptionApi = new SubscriptionApi();
      const subscription = await subscriptionApi.getSubscription(identity);
      if (!subscription) {
        setSubscription(null);
      } else {
        setSubscription(subscription);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingSub(false);
    }
  };

  const subscribe = async (
    tierId: number,
    amountInIcp: number
  ): Promise<SubscribeResponse> => {
    try {
      const subscriptionApi = new SubscriptionApi();

      // Deposit to canister if not enough credits
      if (totalCredits.total_credits < amountInIcp) {
        const ledgerApi = await LedgerApi.create(identity);
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

        const mainApi = await MainApi.create(identity);
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
        tierId
      );

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
