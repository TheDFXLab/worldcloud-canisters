import { createContext, useContext, useState, ReactNode } from "react";

interface ActionBarContextType {
  actionBar: any;
  setActionBar: (action: any) => void;
}

const ActionBarContext = createContext<ActionBarContextType | undefined>(
  undefined
);

export function ActionBarProvider({ children }: { children: ReactNode }) {
  const [actionBar, setActionBar] = useState<any>(null);

  return (
    <ActionBarContext.Provider
      value={{
        actionBar,
        setActionBar,
      }}
    >
      {children}
    </ActionBarContext.Provider>
  );
}
export function useActionBar() {
  const context = useContext(ActionBarContext);
  if (context === undefined) {
    throw new Error("useAction must be used within a ActionBarProvider");
  }
  return context;
}
