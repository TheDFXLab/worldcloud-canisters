import React, { useEffect, useState } from "react";
import { Button, Form, Table, Spinner } from "react-bootstrap";
import { useAuthority } from "../../context/AuthorityContext/AuthorityContext";
import "./AuthorityManager.css";
import { Principal } from "@dfinity/principal";
import AuthorityApi from "../../api/authority";
import { ProgressBar } from "../ProgressBarTop/ProgressBarTop";

export const AuthorityManager: React.FC<{ canisterId: string }> = ({
  canisterId,
}) => {
  const [newController, setNewController] = useState("");
  const {
    status,
    isLoadingStatus,
    refreshStatus,
    handleAddController,
    handleRemoveController,
  } = useAuthority();

  useEffect(() => {
    console.log(`isLoadingStatus changed: `, isLoadingStatus);
  }, [isLoadingStatus]);

  return (
    <>
      <ProgressBar isLoading={isLoadingStatus} />
      <div className="authority-manager">
        <h2>Controllers</h2>
        <div className="authority-manager__add mb-4">
          <Form.Group className="d-flex gap-2">
            <Form.Control
              value={newController}
              onChange={(e) => setNewController(e.target.value)}
              placeholder="Principal ID"
              className="flex-grow-1"
            />
            <Button onClick={() => handleAddController(newController)}>
              Add Controller
            </Button>
          </Form.Group>
        </div>

        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Principal ID</th>
              <th className="text-center" style={{ width: "150px" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {status?.controllers.map((controller) => (
              <tr key={controller}>
                <td>{controller}</td>
                <td className="text-center">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveController(controller)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {!status?.controllers.length && (
              <tr>
                <td colSpan={2} className="text-center">
                  No controllers found
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>
    </>
  );
};
