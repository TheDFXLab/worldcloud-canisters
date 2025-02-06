import React, { useState } from "react";
import "./DangerZone.css";
import { Button, Modal } from "react-bootstrap";

export const DangerZone: React.FC<{ canisterId: string }> = ({
  canisterId,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDelete = async () => {
    // Implement delete logic
  };

  return (
    <div className="danger-zone">
      <h2>Danger Zone</h2>
      <div className="danger-zone__warning">
        <p>These actions are irreversible. Please proceed with caution.</p>
        <Button variant="danger" onClick={() => setShowConfirmation(true)}>
          Delete Canister
        </Button>
      </div>
      <Modal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      >
        <div className="danger-zone__confirmation">
          <h3>Delete Canister</h3>
          <p>
            Are you sure you want to delete this canister? This action cannot be
            undone.
          </p>
          <div className="danger-zone__actions">
            <Button onClick={() => setShowConfirmation(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
