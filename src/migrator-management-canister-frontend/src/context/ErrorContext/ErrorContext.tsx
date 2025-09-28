import React, { createContext, useContext, useState, ReactNode } from "react";
import { ErrorDisplayProps } from "../../components/ErrorDisplay/ErrorDisplay";

interface ErrorContextType {
  error: ErrorDisplayProps | null;
  showError: (error: ErrorDisplayProps) => void;
  hideError: () => void;
  isErrorVisible: boolean;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [error, setError] = useState<ErrorDisplayProps | null>(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);

  const showError = (errorData: ErrorDisplayProps) => {
    setError(errorData);
    setIsErrorVisible(true);
  };

  const hideError = () => {
    setIsErrorVisible(false);
    // Delay clearing the error to allow for exit animations
    setTimeout(() => setError(null), 300);
  };

  return (
    <ErrorContext.Provider
      value={{
        error,
        showError,
        hideError,
        isErrorVisible,
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
}
