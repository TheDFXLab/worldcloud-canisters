import { Modal, Button, Form, Spinner } from "react-bootstrap";
import InfoIcon from "@mui/icons-material/InfoOutlined";
import Tooltip from "@mui/material/Tooltip";
import "./ConfirmationModal.css";
import { useCycles } from "../../context/CyclesContext/CyclesContext";
import { cyclesToTerra, fromE8sStable } from "../../utility/e8s";
import { useLedger } from "../../context/LedgerContext/LedgerContext";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

interface ConfirmationModalProps {
  show: boolean;
  amountState: [string, (amount: string) => void];
  onHide: () => void;
  onConfirm: (amount: number) => Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  show,
  amountState,
  onHide,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
}) => {
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

  const handleAmountChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow only positive numbers with decimal point and up to 4 decimal places
    if (/^\d*\.?\d{0,4}$/.test(value) && parseFloat(value || "0") >= 0) {
      const estimatedCycles = await estimateCycles(parseFloat(value));
      setEstimatedOutput(estimatedCycles);
      setAmount(value);
    }
  };

  useEffect(() => {
    const estimateCyclesForIcp = async () => {
      if (!balance) return;
      const cycles = await estimateCycles(fromE8sStable(balance));
      setEstimatedMax(cycles);
    };
    estimateCyclesForIcp();
  }, [balance]);

  const handleClickSubmit = async () => {
    if (!params.canisterId) {
      console.log(`Canister ID is not set`);
      return;
    }
    await onConfirm(parseFloat(amount));
    getStatus(params.canisterId);
    getBalance();
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="modal-message">{message}</p>

        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-label">
              Cycles in Canister
              <Tooltip
                title="Total cycles currently in the canister"
                arrow
                placement="top"
              >
                <InfoIcon className="info-icon" />
              </Tooltip>
            </div>
            <div className="stat-value">
              {cyclesStatus?.cycles ? (
                `${fromE8sStable(cyclesStatus?.cycles, 12).toFixed(2)} T Cycles`
              ) : (
                <Spinner />
              )}
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-label">
              Wallet Balance
              <Tooltip title="Your current ICP balance" arrow placement="top">
                <InfoIcon className="info-icon" />
              </Tooltip>
            </div>
            <div className="stat-value">
              {balance || fromE8sStable(balance) === 0 ? (
                <>
                  {`${fromE8sStable(balance).toFixed(2)} ICP`}
                  <span className="estimated-value">
                    ≈ {fromE8sStable(BigInt(estimatedMax), 12).toFixed(2)} T
                    Cycles
                  </span>
                </>
              ) : (
                <Spinner size="sm" />
              )}
            </div>
          </div>
        </div>

        <Form.Group className="amount-input-group">
          <Form.Label>Amount (ICP)</Form.Label>
          <Form.Control
            type="text"
            value={amount}
            onChange={handleAmountChange}
            min="0"
            step="0.0001"
            placeholder="Enter amount"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          {cancelText}
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            handleClickSubmit();
          }}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
