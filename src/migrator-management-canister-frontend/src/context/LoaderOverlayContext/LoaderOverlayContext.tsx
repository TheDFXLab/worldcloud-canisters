import { createContext, ReactNode, useContext, useState } from "react";

interface LoaderOverlayContextType {
  isLoading: boolean;
  message?: string;
  setMessage: (message: string) => void;
  summon: (message?: string) => void;
  destroy: () => void;
}

export const LoaderOverlayContext = createContext<
  LoaderOverlayContextType | undefined
>(undefined);

export function LoaderOverayProvider({ children }: { children: ReactNode }) {
  /** States */
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const summon = (message?: string) => {
    setIsLoading(true);
    setMessage(message ? message : "Processing your request...");
  };

  const destroy = () => {
    setIsLoading(false);
    setMessage(undefined);
  };

  return (
    <LoaderOverlayContext.Provider
      value={{
        isLoading,
        message,
        setMessage,
        summon,
        destroy,
      }}
    >
      {children}
    </LoaderOverlayContext.Provider>
  );
}

export function useLoaderOverlay() {
  const context = useContext(LoaderOverlayContext);
  if (context === undefined) {
    throw new Error(
      "useLoaderOverlay must be used within a LoaderOverlayProvider"
    );
  }
  return context;
}
