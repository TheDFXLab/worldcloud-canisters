import { SvgIconComponent } from "@mui/icons-material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GitHubIcon from "@mui/icons-material/GitHub";
import LaunchIcon from "@mui/icons-material/Launch";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import StorageIcon from "@mui/icons-material/Storage";
import TimerIcon from "@mui/icons-material/Timer";
import ExtensionIcon from "@mui/icons-material/Extension";
import "./QuickActions.css";
import { CircularProgress, Tooltip } from "@mui/material";
import { SerializedProject } from "../../utility/bigint";
import CountdownChip from "../ProjectsComponent/CountdownChip";
import { useFreemiumLogic } from "../../hooks/useFreemiumLogic";
import { useProjectsLogic } from "../../hooks/useProjectsLogic";

interface QuickAction {
  title: string;
  icon: SvgIconComponent;
  isDangerous?: boolean;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  hide?: boolean;
}

interface QuickActionsProps {
  onActionClick?: (action: string) => void;
  project: SerializedProject;
  hasCanister: boolean;
  isFreemium: boolean;
  deploymentStatus?: string;
  showAddOns?: boolean;
  onToggleAddOns?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onActionClick,
  project,
  hasCanister,
  isFreemium,
  deploymentStatus = "uninitialized",
  showAddOns = false,
  onToggleAddOns,
}) => {
  const { usageData: freemiumSlot, fetchUsage } = useFreemiumLogic();
  const { isLoadingClearAssets, isLoadingDeleteProject, refreshProjects } =
    useProjectsLogic();

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
      hide: !isFreemium,
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
      disabled: !hasCanister || isFreemium,
      disabledReason: isFreemium
        ? "This feature is available for paid projects."
        : !isFreemium && !hasCanister
        ? "No runner attached."
        : "This feature is temporarily disabled.",
    },
    {
      title: showAddOns ? "Hide Add-ons" : "Add-ons",
      icon: ExtensionIcon,
      isDangerous: false,
      description: showAddOns
        ? "Hide available add-on services"
        : "View and subscribe to add-on services",
      onClick: onToggleAddOns,
      disabled: isFreemium,
      disabledReason: isFreemium
        ? "Add-ons are available for paid projects only"
        : undefined,
      hide: isFreemium,
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
      title: "Clear Runner",
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
      {actions.map(
        (action, index) =>
          !action.hide && (
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
                onClick={!action.disabled ? action.onClick : () => {}}
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
                      onExpire={() => {
                        refreshProjects();
                      }}
                    />
                  )}
                {renderSpinner(action)}
              </div>
            </Tooltip>
          )
      )}
    </div>
  );

  const renderSpinner = (action: QuickAction) => {
    // Render spinner for clear canister assets button
    if (action.title === "Clear Runner") {
      return (
        <>
          {action.isDangerous && isLoadingClearAssets && (
            <CircularProgress size={20} className="circular-progress" />
          )}
        </>
      );
    }

    // Render spinner for delete project button
    if (action.title === "Delete Project") {
      return (
        <>
          {action.isDangerous && isLoadingDeleteProject && (
            <CircularProgress size={20} className="circular-progress" />
          )}
        </>
      );
    }
  };

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
