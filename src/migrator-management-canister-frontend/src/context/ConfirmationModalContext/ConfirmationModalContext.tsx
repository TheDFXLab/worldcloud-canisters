import { createContext, ReactNode, useContext, useState } from "react";
import {
  ModalConfig,
  ModalType,
} from "../../components/ConfirmationPopup/ConfirmationModal";

interface ConfirmationModalContextType {
  modalType: ModalType;
  modalConfig: ModalConfig | null;
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  call: (type: ModalType, customConfig?: Partial<ModalConfig>) => void;
}

export const ConfirmationModalContext = createContext<
  ConfirmationModalContextType | undefined
>(undefined);

export function ConfirmationModalProvider({
  children,
}: {
  children: ReactNode;
}) {
  /** Hooks */

  /** States */
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ModalType>("default");
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const call = (type: ModalType, customConfig?: Partial<ModalConfig>) => {
    setModalType(type);
    if (customConfig) setModalConfig(customConfig as ModalConfig);
  };

  return (
    <ConfirmationModalContext.Provider
      value={{ call, modalConfig, modalType, showModal, setShowModal }}
    >
      {children}
    </ConfirmationModalContext.Provider>
  );
}

export function useConfirmationModal() {
  const context = useContext(ConfirmationModalContext);
  if (context === undefined) {
    throw new Error(
      "useConfirmationModal must be used within a ConfirmationModalProvider"
    );
  }
  return context;
}
