import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../state/store";
import { fetchTreasuryBalance } from "../../state/slices/adminSlice";
import { e8sToIcp } from "../../utility/e8s";
import "./TreasuryBalanceGrid.css";

interface TreasuryBalanceGridProps {
  identity: any;
  agent: any;
}

const TreasuryBalanceGrid: React.FC<TreasuryBalanceGridProps> = ({
  identity,
  agent,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { treasuryBalance, isLoadingTreasuryBalance, error } = useSelector(
    (state: RootState) => state.admin
  );

  useEffect(() => {
    if (identity && agent) {
      dispatch(fetchTreasuryBalance({ identity, agent }));
    }
  }, [dispatch, identity, agent]);

  const formatBalance = (balanceInE8s: number | null) => {
    if (balanceInE8s === null) return "0.00";
    const balanceInIcp = e8sToIcp(balanceInE8s);
    return balanceInIcp.toFixed(4);
  };

  const formatBalanceInE8s = (balanceInE8s: number | null) => {
    if (balanceInE8s === null) return "0";
    return balanceInE8s.toLocaleString();
  };

  if (isLoadingTreasuryBalance) {
    return (
      <div className="treasury-balance-grid">
        <div className="grid-header">
          <h3>Treasury Management</h3>
        </div>
        <div className="grid-content">
          <div className="loading-spinner">Loading treasury data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="treasury-balance-grid">
        <div className="grid-header">
          <h3>Treasury Management</h3>
        </div>
        <div className="grid-content">
          <div className="error-message">
            Failed to load treasury data: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="treasury-balance-grid">
      <div className="grid-header">
        <h3>Treasury Management</h3>
      </div>
      <div className="grid-content">
        <div className="grid-item">
          <div className="item-header">
            <h4>Current Balance</h4>
          </div>
          <div className="item-content">
            <div className="balance-display">
              <span className="amount">{formatBalance(treasuryBalance)}</span>
              <span className="currency">ICP</span>
            </div>
            <div className="balance-details">
              <span className="label">Available for withdrawal</span>
            </div>
          </div>
        </div>

        <div className="grid-item">
          <div className="item-header">
            <h4>Balance in E8s</h4>
          </div>
          <div className="item-content">
            <div className="balance-display">
              <span className="amount-e8s">
                {formatBalanceInE8s(treasuryBalance)}
              </span>
              <span className="currency">E8s</span>
            </div>
            <div className="balance-details">
              <span className="label">Raw ledger balance</span>
            </div>
          </div>
        </div>

        <div className="grid-item">
          <div className="item-header">
            <h4>Status</h4>
          </div>
          <div className="item-content">
            <div className="status-indicator">
              <span className="status-dot active"></span>
              <span className="status-text">Active</span>
            </div>
            <div className="balance-details">
              <span className="label">Treasury is operational</span>
            </div>
          </div>
        </div>

        <div className="grid-item">
          <div className="item-header">
            <h4>Last Updated</h4>
          </div>
          <div className="item-content">
            <div className="time-display">
              <span className="time">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="balance-details">
              <span className="label">Real-time data</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryBalanceGrid;
