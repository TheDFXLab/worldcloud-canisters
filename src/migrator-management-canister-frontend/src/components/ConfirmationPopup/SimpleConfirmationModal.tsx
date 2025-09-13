import React, { useState } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import "./ConfirmationModal.css";

interface SimpleConfirmationModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: "danger" | "warning" | "primary" | "secondary";
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const SimpleConfirmationModal: React.FC<
  SimpleConfirmationModalProps
> = ({
  show,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonVariant = "primary",
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = isLoading || isSubmitting;

  return (
    <Modal show={show} onHide={onCancel} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="modal-message">{message}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button
          style={{
            backgroundColor: "var(--color-secondary)",
            border: "1px solid var(--color-secondary)",
            color: "var(--text-primary)",
          }}
          onClick={onCancel}
          disabled={isButtonDisabled}
        >
          {cancelText}
        </Button>
        <Button
          style={{
            backgroundColor:
              confirmButtonVariant === "danger"
                ? "var(--color-danger)"
                : "var(--color-primary)",
            border: `1px solid ${
              confirmButtonVariant === "danger"
                ? "var(--color-danger)"
                : "var(--color-primary)"
            }`,
          }}
          onClick={handleConfirm}
          disabled={isButtonDisabled}
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
              Processing...
            </>
          ) : (
            confirmText
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
