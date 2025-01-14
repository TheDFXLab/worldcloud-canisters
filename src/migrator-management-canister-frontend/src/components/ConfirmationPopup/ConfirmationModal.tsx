import { Modal, Button, Form } from "react-bootstrap";

interface ConfirmationModalProps {
  show: boolean;
  amountState: [string, (amount: string) => void];
  onHide: () => void;
  onConfirm: (amount: number) => void;
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
  const [amount, setAmount] = amountState;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only positive numbers with up to 4 decimal places
    if (/^\d*\.?\d{0,4}$/.test(value) && parseFloat(value || "0") >= 0) {
      setAmount(value);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{message}</p>
        <Form.Group>
          <Form.Label>Amount (ICP)</Form.Label>
          <Form.Control
            type="number"
            value={amount}
            onChange={handleAmountChange}
            min="0"
            step="0.0001"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {cancelText}
        </Button>
        <Button
          variant="primary"
          onClick={() => onConfirm(parseFloat(amount))}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
