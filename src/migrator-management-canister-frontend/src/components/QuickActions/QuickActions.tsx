import { SvgIconComponent } from "@mui/icons-material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GitHubIcon from "@mui/icons-material/GitHub";
import LaunchIcon from "@mui/icons-material/Launch";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import StorageIcon from "@mui/icons-material/Storage";
import TimerIcon from "@mui/icons-material/Timer";
import "./QuickActions.css";
import { Tooltip } from "@mui/material";
import { SerializedProject } from "../../utility/bigint";
import CountdownChip from "../ProjectsComponent/CountdownChip";
import { useFreemiumLogic } from "../../hooks/useFreemiumLogic";

interface QuickAction {
  title: string;
  icon: SvgIconComponent;
  isDangerous?: boolean;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

interface QuickActionsProps {
  onActionClick?: (action: string) => void;
  project: SerializedProject;
  hasCanister: boolean;
  isFreemium: boolean;
  deploymentStatus?: string;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  project,
  hasCanister,
  isFreemium,
  deploymentStatus = "uninitialized",
}) => {
  const { usageData: freemiumSlot, fetchUsage } = useFreemiumLogic();

  const hasFreemiumSlot = !!freemiumSlot;
  const showCountdown =
    isFreemium &&
    hasCanister &&
    hasFreemiumSlot &&
    freemiumSlot?.status === "occupied";

  const noRunnerMessage = isFreemium
    ? "Request a freemium session to enable this action"
    : "Attach a runner to enable this action";

  const commonActions: QuickAction[] = [
    {
      title: "Request Freemium Runner",
      isDangerous: false,
      icon: TimerIcon,
      description: "Request a time slot for your freemium project",
      onClick: () => onActionClick?.("requestRunner"),
      disabled: hasCanister || !isFreemium,
      disabledReason: hasCanister
        ? "Runner already attached"
        : !isFreemium
        ? "Only available for freemium projects"
        : undefined,
    },
    {
      title: "Visit Site",
      icon: LaunchIcon,
      isDangerous: false,
      description: "Browse site deployed for this project",
      onClick: () => onActionClick?.("visit"),
      disabled: !hasCanister || deploymentStatus !== "installed",
      disabledReason: !hasCanister
        ? noRunnerMessage
        : deploymentStatus !== "installed"
        ? "Deploy your code first to enable this action"
        : undefined,
    },
    {
      title: "Deploy from Github",
      icon: GitHubIcon,
      isDangerous: false,
      description: "Deploy a new build from your Github repository",
      onClick: () => onActionClick?.("deploy"),
      disabled: !hasCanister,
      disabledReason: noRunnerMessage,
    },
    {
      title: "Add Cycles",
      isDangerous: false,
      icon: AddCircleOutlineIcon,
      description: "Top up canister cycles",
      onClick: () => onActionClick?.("cycles"),
      disabled: !hasCanister,
      disabledReason: noRunnerMessage,
    },
  ];

  const dangerActions: QuickAction[] = [
    {
      title: "Delete Project",
      icon: DeleteOutlineIcon,
      isDangerous: true,
      description: "Delete this project",
      onClick: () => onActionClick?.("delete"),
    },
    {
      title: "Clear Canister",
      icon: StorageIcon,
      isDangerous: true,
      description: "Delete all assets from this project's canister",
      onClick: () => onActionClick?.("clear"),
      disabled: !hasCanister,
      disabledReason: noRunnerMessage,
    },
  ];

  const renderActionGrid = (actions: QuickAction[]) => (
    <div className="quick-actions-grid">
      {actions.map((action, index) => (
        <Tooltip
          key={index}
          title={
            action.disabled
              ? action.disabledReason || action.description
              : action.description
          }
        >
          <div
            className={`quick-action-item ${
              action.isDangerous ? "dangerous" : ""
            } ${action.disabled ? "disabled" : ""}`}
            onClick={
              !action.disabled ? action.onClick : () => console.log("clcked")
            }
            role="button"
            tabIndex={action.disabled ? -1 : 0}
          >
            <action.icon className="quick-action-icon" />
            <div className="quick-action-content">
              <div className="quick-action-title">{action.title}</div>
            </div>
            {showCountdown &&
              freemiumSlot &&
              index === 0 &&
              action.isDangerous === false && (
                <CountdownChip
                  startTimestamp={freemiumSlot.start_timestamp}
                  duration={freemiumSlot.duration}
                />
              )}
          </div>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <div className="quick-actions">
      <div className="quick-actions-section">
        <h3 className="section-title">Common Actions</h3>
        {renderActionGrid(commonActions)}
      </div>

      <div className="quick-actions-section">
        <h3 className="section-title">Danger Zone</h3>
        {renderActionGrid(dangerActions)}
      </div>
    </div>
  );
};

export default QuickActions;
