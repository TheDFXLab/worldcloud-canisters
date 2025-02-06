import { createContext, useContext, useState, ReactNode } from "react";
import { ToasterData } from "../../components/Toast/Toaster";

interface ToasterContextType {
  toasterData: ToasterData | null;
  showToaster: boolean;
  setShowToaster: (show: boolean) => void;
  setToasterData: (data: ToasterData) => void;
}

const ToasterContext = createContext<ToasterContextType | undefined>(undefined);

export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasterData, setToasterData] = useState<ToasterData | null>(null);
  const [showToaster, setShowToaster] = useState<boolean>(false);
  return (
    <ToasterContext.Provider
      value={{
        toasterData,
        setToasterData,
        showToaster,
        setShowToaster,
      }}
    >
      {children}
    </ToasterContext.Provider>
  );
}
export function useToaster() {
  const context = useContext(ToasterContext);
  if (context === undefined) {
    throw new Error("useToaster must be used within a ToasterProvider");
  }
  return context;
}
