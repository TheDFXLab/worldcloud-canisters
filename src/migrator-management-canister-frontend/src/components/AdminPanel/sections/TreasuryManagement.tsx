import React, { useEffect, useState } from "react";
import { useSubscriptionLogic } from "../../../hooks/useSubscriptionLogic";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import {
  AccountBalance,
  Settings,
  AccountBalanceWallet,
  CheckCircle,
  Warning,
  Refresh,
} from "@mui/icons-material";
import { useAdminLogic } from "../../../hooks/useAdminLogic";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../../state/store";
import { fetchTreasuryBalance } from "../../../state/slices/adminSlice";
import { e8sToIcp } from "../../../utility/e8s";
import { useIdentity } from "../../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../../context/HttpAgentContext/HttpAgentContext";
import { handleError } from "../../../utility/errorHandler";
import "../../HomePage/HomePage.css";
const TreasuryManagement: React.FC = () => {
  const {
    // treasuryPrincipal,
    // isLoadingTreasury,
    // treasuryError,
    // setTreasury,
    // withdrawTreasury,
    // handleGetTreasuryPrincipal,
  } = useSubscriptionLogic();

  const {
    treasuryPrincipal,
    treasuryBalance,
    isLoadingTreasury,
    error,
    withdrawTreasury,
    handleGetTreasuryPrincipal,
    handleSetTreasury,
  } = useAdminLogic();

  const { identity } = useIdentity();
  const { agent } = useHttpAgent();

  const dispatch = useDispatch<AppDispatch>();
  const { treasuryBalance: reduxTreasuryBalance, isLoadingTreasuryBalance } =
    useSelector((state: RootState) => state.admin);
  const { setToasterData, setShowToaster } = useToaster();

  const [treasuryInput, setTreasuryInput] = useState("");
  const [isSettingTreasury, setIsSettingTreasury] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    handleGetTreasuryPrincipal();
    // Fetch treasury balance from Redux
    if (identity && agent) {
      dispatch(fetchTreasuryBalance({ identity, agent })).unwrap();
    }
  }, [dispatch, identity, agent, handleGetTreasuryPrincipal]);

  const setTreasury = async () => {
    if (!treasuryInput.trim()) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter a valid treasury principal",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    setIsSettingTreasury(true);
    try {
      const result = await handleSetTreasury(treasuryInput.trim());
      if (result.status) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: result.message,
          textColor: "green",
          timeout: 3000,
        });
        setTreasuryInput("");
      } else {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: result.message,
          textColor: "red",
          timeout: 5000,
        });
      }
      setShowToaster(true);
    } catch (error: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: handleError(error),
        textColor: "red",
        timeout: 5000,
      });
      setShowToaster(true);
    } finally {
      setIsSettingTreasury(false);
    }
  };

  const handleWithdrawTreasury = async () => {
    setIsWithdrawing(true);
    try {
      const result = await withdrawTreasury();
      if (result.status) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: result.message,
          textColor: "green",
          timeout: 3000,
        });
      } else {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: result.message,
          textColor: "red",
          timeout: 5000,
        });
      }
      setShowToaster(true);
    } catch (error: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: handleError(error),
        textColor: "red",
        timeout: 5000,
      });
      setShowToaster(true);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const formatPrincipal = (principal: string) => {
    return principal.length > 20
      ? `${principal.substring(0, 20)}...`
      : principal;
  };

  const formatBalance = (balanceInE8s: number | null) => {
    if (balanceInE8s === null) return "0.00";
    const balanceInIcp = e8sToIcp(balanceInE8s);
    return balanceInIcp.toFixed(4);
  };

  return (
    <div className="admin-subscriptions-management">
      {/* Summary Cards */}
      <div className="admin-summary-cards">
        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <AccountBalance />
          </div>
          <div className="admin-card-content">
            <h3>Treasury Status</h3>
            <p className="admin-card-value">
              {treasuryPrincipal ? "Configured" : "Not Set"}
            </p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            {treasuryPrincipal ? <CheckCircle /> : <Warning />}
          </div>
          <div className="admin-card-content">
            <h3>Current Treasury</h3>
            <p className="admin-card-value">
              {treasuryPrincipal ? formatPrincipal(treasuryPrincipal) : "None"}
            </p>
          </div>
        </div>

        <div className="admin-summary-card">
          <div className="admin-card-icon">
            <AccountBalanceWallet />
          </div>
          <div className="admin-card-content">
            <h3>Treasury Balance</h3>
            <p className="admin-card-value">
              {isLoadingTreasuryBalance ? (
                <span className="loading-text">Loading...</span>
              ) : (
                `${formatBalance(reduxTreasuryBalance)} ICP`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Treasury Operations */}
      <div className="admin-actions-section">
        <div className="admin-action-card">
          <h3>Set Treasury</h3>
          <p>Configure the treasury principal for the system</p>
          <div className="admin-action-buttons">
            <input
              type="text"
              placeholder="Enter treasury principal (e.g., abc12-def34-ghi56...)"
              value={treasuryInput}
              onChange={(e) => setTreasuryInput(e.target.value)}
              style={{
                padding: "0.75rem 1rem",
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                background: "var(--background-secondary)",
                color: "var(--text-primary)",
                fontSize: "var(--font-size-sm)",
                width: "100%",
                marginBottom: "1rem",
              }}
              disabled={isSettingTreasury}
            />
            <button
              onClick={setTreasury}
              className="admin-action-btn primary"
              disabled={isSettingTreasury || !treasuryInput.trim()}
            >
              {isSettingTreasury ? (
                <>
                  <Refresh className="spinning" /> Setting...
                </>
              ) : (
                <>
                  <Settings /> Set Treasury
                </>
              )}
            </button>
          </div>
        </div>

        <div className="admin-action-card">
          <h3>Withdraw from Treasury</h3>
          <p>Withdraw all funds from the treasury to the default subaccount</p>
          <div className="admin-action-buttons">
            <button
              onClick={handleWithdrawTreasury}
              className="admin-action-btn danger"
              disabled={isWithdrawing || !treasuryPrincipal}
            >
              {isWithdrawing ? (
                <>
                  <Refresh className="spinning" /> Withdrawing...
                </>
              ) : (
                <>
                  <AccountBalanceWallet /> Withdraw Treasury
                </>
              )}
            </button>
            {!treasuryPrincipal && (
              <p
                style={{
                  margin: "1rem 0 0 0",
                  padding: "0.75rem",
                  background: "var(--color-warning-bg)",
                  border: "1px solid var(--color-warning)",
                  borderRadius: "8px",
                  color: "var(--color-warning)",
                  fontSize: "var(--font-size-sm)",
                }}
              >
                Treasury must be set before withdrawing
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ marginTop: "2rem" }}>
          <div className="admin-action-card">
            <h3>Error</h3>
            <p
              style={{
                margin: 0,
                color: "var(--color-error)",
                fontSize: "var(--font-size-sm)",
              }}
            >
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreasuryManagement;
