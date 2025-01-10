import React, { useEffect, useState } from "react";
import { Button, Form, Table, Spinner } from "react-bootstrap";
import { useAuthority } from "../../context/AuthorityContext/AuthorityContext";
import "./AuthorityManager.css";
import { Principal } from "@dfinity/principal";
import AuthorityApi from "../../api/authority";
import { ProgressBar } from "../ProgressBarTop/ProgressBarTop";
import { ToasterData } from "../Toast/Toaster";
import { isValidPrincipal } from "../../validation/principal";

export const AuthorityManager: React.FC<{
  canisterId: string;
  setShowToaster: (showToaster: boolean) => void;
  setToasterData: (toasterData: ToasterData) => void;
}> = ({ canisterId, setShowToaster, setToasterData }) => {
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

  const addController = async () => {
    try {
      if (!isValidPrincipal(newController)) {
        throw { message: "Invalid principal ID" };
      }

      setToasterData({
        headerContent: "Adding controller",
        toastStatus: true,
        toastData: "Adding controller. Please wait...",
        textColor: "blue",
      });
      setShowToaster(true);

      const success = await handleAddController(newController);
      if (success) {
        setShowToaster(true);
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: "Controller added",
          textColor: "green",
        });

        await refreshStatus(); // Update controllers list
      }
    } catch (error: any) {
      setShowToaster(true);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message,
        textColor: "red",
      });
    }
  };

  const removeController = async (controller: string) => {
    try {
      setToasterData({
        headerContent: "Removing controller",
        toastStatus: true,
        toastData: "Removing controller. Please wait...",
        textColor: "blue",
      });
      setShowToaster(true);

      const isRemoved = await handleRemoveController(controller);
      if (isRemoved) {
        setShowToaster(true);
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: "Controller removed",
          textColor: "green",
        });

        await refreshStatus();
      } else {
        setShowToaster(true);
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Failed to remove controller",
          textColor: "red",
        });
      }
    } catch (error: any) {
      setShowToaster(true);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message,
        textColor: "red",
      });
    }
  };

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
            <Button onClick={() => addController()}>Add Controller</Button>
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
                    onClick={() => removeController(controller)}
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
