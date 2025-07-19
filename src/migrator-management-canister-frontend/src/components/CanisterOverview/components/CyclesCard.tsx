import React from "react";
import { CircularProgress } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { fromE8sStable } from "../../../utility/e8s";

interface CyclesCardProps {
  isLoadingBalance: boolean;
  balance: bigint | null | undefined;
  isLoadingCycles: boolean;
  cyclesStatus: any;
  isLoadingEstimateCycles: boolean;
  maxCyclesExchangeable: number;
}

export const CyclesCard: React.FC<CyclesCardProps> = ({
  isLoadingBalance,
  balance,
  isLoadingCycles,
  cyclesStatus,
  isLoadingEstimateCycles,
  maxCyclesExchangeable,
}) => {
  return (
    <div className="overview-card">
      <div className="card-header">
        <AccountBalanceWalletIcon />
        <h3>Cycles Information</h3>
      </div>
      <div className="card-content">
        <div className="info-table">
          <div className="info-row">
            <div className="info-label">Available Balance</div>
            <div className="info-value">
              {isLoadingBalance ? (
                <CircularProgress size={20} />
              ) : (
                `${fromE8sStable(balance || 0n)} ICP`
              )}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Current Cycles</div>
            <div className="info-value">
              {isLoadingCycles ? (
                <CircularProgress size={20} />
              ) : (
                `${cyclesStatus?.cycles || 0} T Cycles`
              )}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Max Exchangeable</div>
            <div className="info-value">
              {isLoadingEstimateCycles ? (
                <CircularProgress size={20} />
              ) : (
                `${maxCyclesExchangeable || 0} T Cycles`
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
