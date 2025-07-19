import { Spinner } from "react-bootstrap";
import { Tooltip, Skeleton } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import IconTextRowView from "../../IconTextRowView/IconTextRowView";
import { fromE8sStable } from "../../../utility/e8s";
import { renderCyclesIcon } from "../utils/cyclesIcon";

interface CyclesCardProps {
  isLoadingBalance: boolean;
  balance: bigint | null | undefined;
  isLoadingEstimateCycles: boolean;
  maxCyclesExchangeable: number;
  isLoadingCycles: boolean;
  cyclesStatus: any;
  onAddCycles: () => void;
}

export const CyclesCard: React.FC<CyclesCardProps> = ({
  isLoadingBalance,
  balance,
  isLoadingEstimateCycles,
  maxCyclesExchangeable,
  isLoadingCycles,
  cyclesStatus,
  onAddCycles,
}) => {
  if (isLoadingBalance) {
    return (
      <div className="cycles-loading">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={24} width={"100%"} />
        ))}
      </div>
    );
  }

  return (
    <div className="detail-card deployments-section">
      <h3 style={{ paddingBottom: "10px" }}>Cycles</h3>
      <div className="cycles-stats-container">
        <div className="stat-item">
          <div className="stat-label">
            Wallet Balance
            <Tooltip title="Your current ICP balance" arrow placement="top">
              <AccountBalanceWalletIcon className="info-icon" />
            </Tooltip>
          </div>
          <div className="stat-value">
            {balance && balance !== BigInt(0) ? (
              `${fromE8sStable(balance).toFixed(2)} ICP`
            ) : (
              <Spinner size="sm" />
            )}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">
            Convertible to Cycles
            <Tooltip
              title="Total cycles exchangeable for your ICP balance"
              arrow
              placement="top"
            >
              <SwapHorizIcon className="info-icon" />
            </Tooltip>
          </div>
          <div className="stat-value">
            {!isLoadingEstimateCycles ? (
              `${fromE8sStable(
                BigInt(Math.floor(maxCyclesExchangeable)),
                12
              ).toFixed(2)} T Cycles`
            ) : (
              <Spinner size="sm" />
            )}
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-label">
            Cycles in Canister
            <Tooltip
              title={renderCyclesIcon(cyclesStatus).tooltipMessage}
              arrow
              placement="top"
            >
              {renderCyclesIcon(cyclesStatus).Component}
            </Tooltip>
          </div>
          <span className="stat-value">
            {isLoadingCycles ? (
              <Spinner animation="border" variant="primary" />
            ) : (
              <div onClick={onAddCycles}>
                <IconTextRowView
                  onClickIcon={onAddCycles}
                  IconComponent={AddCircleOutlineIcon}
                  iconColor="green"
                  text={`${
                    cyclesStatus?.cycles
                      ? fromE8sStable(BigInt(cyclesStatus?.cycles), 12).toFixed(
                          2
                        )
                      : 0
                  } T cycles`}
                />
              </div>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
