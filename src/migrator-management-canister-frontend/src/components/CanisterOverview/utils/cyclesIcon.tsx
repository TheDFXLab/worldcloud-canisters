import BatteryAlertIcon from "@mui/icons-material/BatteryAlert";
import Battery20Icon from "@mui/icons-material/Battery20";
import Battery30Icon from "@mui/icons-material/Battery30";
import Battery50Icon from "@mui/icons-material/Battery50";
import Battery60Icon from "@mui/icons-material/Battery60";
import Battery80Icon from "@mui/icons-material/Battery80";
import Battery90Icon from "@mui/icons-material/Battery90";
import BatteryFullIcon from "@mui/icons-material/BatteryFull";
import { fromE8sStable } from "../../../utility/e8s";

export const renderCyclesIcon = (cyclesStatus: any) => {
  const recommendedMaxTCycles = 1; // 1T

  if (cyclesStatus?.cycles) {
    const tCyclesInCanister = fromE8sStable(BigInt(cyclesStatus?.cycles), 12);
    if (tCyclesInCanister >= recommendedMaxTCycles) {
      return {
        Component: <BatteryFullIcon className="info-icon" />,
        tooltipMessage: "Cycles above recommended values.",
      };
    } else if (tCyclesInCanister >= 0.9 * recommendedMaxTCycles) {
      return {
        Component: <Battery90Icon className="info-icon" />,
        tooltipMessage: `Cycles above 90% recommended values.`,
      };
    } else if (tCyclesInCanister >= 0.8 * recommendedMaxTCycles) {
      return {
        Component: <Battery80Icon className="info-icon" />,
        tooltipMessage: `Cycles above 80% recommended values.`,
      };
    } else if (tCyclesInCanister >= 0.6 * recommendedMaxTCycles) {
      return {
        Component: <Battery60Icon className="info-icon" />,
        tooltipMessage: `Cycles above 60% recommended values.`,
      };
    } else if (tCyclesInCanister >= 0.5 * recommendedMaxTCycles) {
      return {
        Component: <Battery50Icon className="info-icon" />,
        tooltipMessage: `Cycles above 50% recommended values.`,
      };
    } else if (tCyclesInCanister >= 0.3 * recommendedMaxTCycles) {
      return {
        Component: <Battery30Icon className="info-icon" />,
        tooltipMessage: `Cycles above 30% recommended values.`,
      };
    } else if (tCyclesInCanister >= 0.2 * recommendedMaxTCycles) {
      return {
        Component: <Battery20Icon className="info-icon" />,
        tooltipMessage: `Cycles above 20% recommended values.`,
      };
    }
  }
  return {
    Component: <BatteryAlertIcon className="info-icon" />,
    tooltipMessage: `Cycles level is below recommended values. Top up cycles to avoid downtime on your website.`,
  };
};
