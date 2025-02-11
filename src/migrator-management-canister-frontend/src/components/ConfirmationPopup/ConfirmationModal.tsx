import { Modal, Button, Form, Spinner } from "react-bootstrap";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import Tooltip from "@mui/material/Tooltip";
import "./ConfirmationModal.css";
import { useCycles } from "../../context/CyclesContext/CyclesContext";
import { cyclesToTerra, fromE8sStable, icpToE8s } from "../../utility/e8s";
import { useLedger } from "../../context/LedgerContext/LedgerContext";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useConfirmationModal } from "../../context/ConfirmationModalContext/ConfirmationModalContext";

export type ModalType = "topup" | "cycles" | "subscription" | "default";

export interface ModalConfig {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  showCyclesInfo?: boolean;
  showWalletInfo?: boolean;
  showEstimatedCycles?: boolean;
  showInputField?: boolean;
  showTotalPrice?: boolean;
  totalPrice?: number;
}

const MODAL_CONFIGS: Record<ModalType, ModalConfig> = {
  topup: {
    title: "Top Up Wallet",
    message: "Enter the amount of ICP you want to deposit",
    confirmText: "Top Up",
    cancelText: "Cancel",
    showWalletInfo: true,
    showEstimatedCycles: true,
    showInputField: true,
    showTotalPrice: true,
  },
  cycles: {
    title: "Add Cycles",
    message: "Enter the amount of ICP to convert to cycles",
    confirmText: "Add Cycles",
    cancelText: "Cancel",
    showCyclesInfo: true,
    showWalletInfo: true,
    showEstimatedCycles: true,
    showInputField: true,
    showTotalPrice: false,
  },
  subscription: {
    title: "Confirm Subscription",
    message: "Enter the amount to deposit for your subscription",
    confirmText: "Subscribe",
    cancelText: "Cancel",
    showWalletInfo: true,
    showInputField: false,
    showTotalPrice: true,
  },
  default: {
    title: "Confirm Action",
    message: "Please confirm your action",
    confirmText: "Confirm",
    cancelText: "Cancel",
    showWalletInfo: true,
    showInputField: false,
    showTotalPrice: false,
  },
};

interface ConfirmationModalProps {
  amountState: [string, (amount: string) => void];
  onHide: () => void;
  onConfirm: (amount: number) => Promise<void>;
  type?: ModalType;
  customConfig?: Partial<ModalConfig>;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  amountState,
  onHide,
  onConfirm,
  type = "default",
  customConfig = {},
}) => {
  const { modalType, showModal, setShowModal } = useConfirmationModal();
  /** Hooks */
  const {
    isLoadingCycles,
    cyclesAvailable,
    cyclesRate,
    cyclesStatus,
    estimateCycles,
    getStatus,
  } = useCycles();
  const { balance, getBalance } = useLedger();
  const params = useParams();

  /** State */
  const [amount, setAmount] = amountState;
  const [estimatedMax, setEstimatedMax] = useState<number>(0);
  const [estimatedOutput, setEstimatedOutput] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge default config with custom config
  const config = { ...MODAL_CONFIGS[type], ...customConfig };

  // Handlers
  const handleAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,4}$/.test(value) && parseFloat(value || "0") >= 0) {
      setAmount(value);
    }
  };

  useEffect(() => {
    const estimateCyclesForInputIcp = async () => {
      if (!amount) return;
      const amt = BigInt(icpToE8s(parseFloat(amount)));
      const cycles = await estimateCycles(fromE8sStable(amt));
      setEstimatedOutput(cycles);
    };
    if (config.showEstimatedCycles) {
      estimateCyclesForInputIcp();
    }
  }, [amount, config.showEstimatedCycles]);

  useEffect(() => {
    const estimateCyclesForIcp = async () => {
      if (!balance) return;
      const cycles = await estimateCycles(fromE8sStable(balance));
      setEstimatedMax(cycles);
    };
    if (config.showEstimatedCycles) {
      estimateCyclesForIcp();
    }
  }, [balance, config.showEstimatedCycles]);

  const handleClickSubmit = async () => {
    if (type === "cycles" && !params.canisterId) {
      console.log(`Canister ID is not set`);
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(parseFloat(amount));
      if (type === "cycles") {
        getStatus(params.canisterId as string);
      }
      getBalance();
      onHide();
    } catch (error) {
      console.error("Error during submission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={showModal} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{config.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="modal-message">{config.message}</p>

        <div className="stats-container">
          {config.showCyclesInfo && (
            <div className="stat-item">
              <div className="stat-label">
                Cycles in Canister
                <Tooltip title="Total cycles currently in the canister" arrow>
                  <InfoIcon className="info-icon" />
                </Tooltip>
              </div>
              <div className="stat-value">
                {cyclesStatus?.cycles ? (
                  `${fromE8sStable(cyclesStatus?.cycles, 12).toFixed(
                    2
                  )} T Cycles`
                ) : (
                  <Spinner size="sm" />
                )}
              </div>
            </div>
          )}

          {config.showWalletInfo && (
            <div className="stat-item">
              <div className="stat-label">
                Wallet Balance
                <Tooltip title="Your current ICP balance" arrow>
                  <InfoIcon className="info-icon" />
                </Tooltip>
              </div>
              <div className="stat-value">
                {balance && balance !== BigInt(0) ? (
                  <>
                    {`${fromE8sStable(balance).toFixed(2)} ICP`}
                    {config.showEstimatedCycles && (
                      <span className="estimated-value">
                        ≈{" "}
                        {fromE8sStable(
                          BigInt(Math.floor(estimatedMax)),
                          12
                        ).toFixed(2)}{" "}
                        T Cycles
                      </span>
                    )}
                  </>
                ) : (
                  <Spinner size="sm" />
                )}
              </div>
            </div>
          )}
          {config.showTotalPrice && (
            <div className="stat-item">
              <div className="stat-label">
                Total Price
                <Tooltip title="Your current ICP balance" arrow>
                  <InfoIcon className="info-icon" />
                </Tooltip>
              </div>
              <div className="stat-value">
                {balance && balance !== BigInt(0) ? (
                  <>{`${config.totalPrice} ICP`}</>
                ) : (
                  <Spinner size="sm" />
                )}
              </div>
            </div>
          )}
        </div>

        {config.showInputField && (
          <Form.Group className="amount-input-group">
            <Form.Label>
              Amount (ICP)
              {config.showEstimatedCycles && amount && (
                <span className="estimated-value">
                  ≈{" "}
                  {fromE8sStable(
                    BigInt(Math.floor(estimatedOutput)),
                    12
                  ).toFixed(2)}{" "}
                  T Cycles
                </span>
              )}
            </Form.Label>
            <Form.Control
              type="text"
              value={amount}
              onChange={handleAmountChange}
              min="0"
              step="0.0001"
              placeholder="Enter amount"
            />
          </Form.Group>
        )}

        <div style={{ marginTop: "10px", height: "40px" }}>
          <Form.Group style={{ height: "100%" }}>
            <Form.Label
              style={{
                margin: 0,
                visibility: config.totalPrice ? "visible" : "hidden",
              }}
            >
              {config.totalPrice
                ? `${config.totalPrice} ICP will be transferred from your wallet.`
                : "placeholder"}
            </Form.Label>
          </Form.Group>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          style={{
            backgroundColor: "var(--color-secondary)",
            border: "1px solid var(--color-secondary)",
            color: "var(--text-primary)",
          }}
          onClick={onHide}
          disabled={isSubmitting}
        >
          {config.cancelText}
        </Button>
        <Button
          style={{
            backgroundColor: "var(--color-primary)",
            border: "1px solid var(--color-secondary)",
          }}
          onClick={handleClickSubmit}
          disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Please wait...
            </>
          ) : (
            config.confirmText
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
