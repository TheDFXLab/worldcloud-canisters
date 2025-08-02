import React, { useState } from "react";
import "./AdminConfirmationModal.css";

interface AdminConfirmationModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  confirmButtonVariant?: "danger" | "warning" | "primary";
}

const AdminConfirmationModal: React.FC<AdminConfirmationModalProps> = ({
  show,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  confirmButtonVariant = "danger",
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="admin-confirmation-overlay">
      <div className="admin-confirmation-modal">
        <div className="admin-confirmation-header">
          <h3>{title}</h3>
        </div>
        <div className="admin-confirmation-body">
          <p>{message}</p>
        </div>
        <div className="admin-confirmation-actions">
          <button
            className="admin-confirmation-btn admin-confirmation-btn-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`admin-confirmation-btn admin-confirmation-btn-confirm admin-confirmation-btn-${confirmButtonVariant}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfirmationModal;
