import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../state/store";
import { fetchTreasuryBalance } from "../../state/slices/adminSlice";
import { e8sToIcp } from "../../utility/e8s";
import "./TreasuryBalance.css";

interface TreasuryBalanceProps {
  identity: any;
  agent: any;
}

const TreasuryBalance: React.FC<TreasuryBalanceProps> = ({
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

  if (isLoadingTreasuryBalance) {
    return (
      <div className="treasury-balance">
        <div className="treasury-balance-header">
          <h3>Treasury Balance</h3>
        </div>
        <div className="treasury-balance-content">
          <div className="loading-spinner">Loading treasury balance...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="treasury-balance">
        <div className="treasury-balance-header">
          <h3>Treasury Balance</h3>
        </div>
        <div className="treasury-balance-content">
          <div className="error-message">
            Failed to load treasury balance: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="treasury-balance">
      <div className="treasury-balance-header">
        <h3>Treasury Balance</h3>
      </div>
      <div className="treasury-balance-content">
        <div className="balance-amount">
          <span className="amount">{formatBalance(treasuryBalance)}</span>
          <span className="currency">ICP</span>
        </div>
        <div className="balance-details">
          <span className="label">Available for withdrawal</span>
        </div>
      </div>
    </div>
  );
};

export default TreasuryBalance;
