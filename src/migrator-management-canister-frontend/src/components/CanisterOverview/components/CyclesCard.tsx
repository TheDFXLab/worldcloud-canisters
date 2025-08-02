import React, { useEffect } from "react";
import { CircularProgress } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { cyclesToTerra, fromE8sStable } from "../../../utility/e8s";
import { useCyclesLogic } from "../../../hooks/useCyclesLogic";

interface CyclesCardProps {
  isFreemium: boolean;
  isLoadingBalance: boolean;
  isLoadingAddCycles: boolean;
  balance: bigint | null | undefined;
  isLoadingCycles: boolean;
  cyclesStatus: any;
  isLoadingEstimateCycles: boolean;
  maxCyclesExchangeable: number;
}

export const CyclesCard: React.FC<CyclesCardProps> = ({
  isFreemium,
  isLoadingBalance,
  isLoadingAddCycles,
  balance,
  isLoadingCycles,
  cyclesStatus,
  isLoadingEstimateCycles,
  maxCyclesExchangeable,
}) => {
  const renderPaidContent = () => {
    return (
      <>
        {!isFreemium && (
          <div className="info-row">
            <div className="info-label">Add Cycles</div>
            <div className="info-value">
              {isLoadingAddCycles ? (
                <CircularProgress size={20} />
              ) : (
                `${fromE8sStable(balance || 0n)} ICP`
              )}
            </div>
          </div>
        )}
      </>
    );
  };
  return (
    <div className="overview-card">
      <div className="card-header">
        <AccountBalanceWalletIcon />
        <h3>Cycles Information</h3>
      </div>
      <div className="card-content">
        <div className="info-table">
          <div className="info-row">
            <div className="info-label">Wallet Balance</div>
            <div className="info-value">
              {isLoadingBalance ? (
                <CircularProgress size={20} />
              ) : (
                `${fromE8sStable(balance || 0n)} ICP`
              )}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Canister Cycles</div>
            <div className="info-value">
              {isLoadingCycles ? (
                <CircularProgress size={20} />
              ) : (
                `${cyclesToTerra(cyclesStatus?.cycles) || 0} T Cycles`
              )}
            </div>
          </div>
          <div className="info-row">
            <div className="info-label">Max Exchangeable</div>
            <div className="info-value">
              {isLoadingEstimateCycles ? (
                <CircularProgress size={20} />
              ) : (
                `${cyclesToTerra(maxCyclesExchangeable) || 0} T Cycles`
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
