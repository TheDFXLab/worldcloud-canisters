import { SvgIconComponent } from "@mui/icons-material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GitHubIcon from "@mui/icons-material/GitHub";
import LaunchIcon from "@mui/icons-material/Launch";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import StorageIcon from "@mui/icons-material/Storage";
import "./QuickActions.css";
import { Tooltip } from "@mui/material";

interface QuickAction {
  title: string;
  icon: SvgIconComponent;
  isDangerous: boolean;
  plan: "any" | "paid" | "free";
  description: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  type?: "default" | "billing" | "deployment";
  gridColumns?: number;
  gridItems?: number;
  headerSize?: "small" | "medium" | "large";
  showCta?: boolean;
  onActionClick?: (action: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  type = "default",
  gridColumns = 2,
  gridItems = 4,
  onActionClick,
}) => {
  const quick_actions_options: QuickAction[] = [
    {
      title: "Visit Site",
      icon: LaunchIcon,
      plan: "any",
      isDangerous: false,
      description: "Browse site deployed for this project.",
      onClick: () => onActionClick?.("visit"),
    },
    {
      title: "Deploy from Github",
      icon: GitHubIcon,
      plan: "any",
      isDangerous: false,
      description:
        "Deploy a new build from your Github repository. This will create a new workflow in your repo's Actions.",
      onClick: () => onActionClick?.("deploy"),
    },
    {
      title: "Add Cycles",
      icon: AddCircleOutlineIcon,
      plan: "paid",
      isDangerous: false,
      description: "Top up canister cycles.",
      onClick: () => onActionClick?.("cycles"),
    },
    {
      title: "Delete Project",
      icon: DeleteOutlineIcon,
      plan: "any",
      isDangerous: true,
      description: "Delete this project.",
      onClick: () => onActionClick?.("delete"),
    },
    {
      title: "Clear Canister",
      icon: StorageIcon,
      plan: "any",
      isDangerous: true,
      description: "Delete all assets from this project's canister.",
      onClick: () => onActionClick?.("clear"),
    },
  ];

  const regularActions = quick_actions_options.filter(
    (action) => !action.isDangerous
  );
  const dangerousActions = quick_actions_options.filter(
    (action) => action.isDangerous
  );

  const renderActionGrid = (actions: QuickAction[]) => (
    <div
      className="quick-actions-grid"
      style={
        {
          "--grid-cols": gridColumns,
        } as React.CSSProperties
      }
    >
      {actions.map((action, key) => (
        <Tooltip key={key} title={action.description}>
          <div
            key={action.title}
            className={`quick-action-item ${
              action.isDangerous ? "dangerous" : ""
            }`}
            onClick={action.onClick}
            role="button"
            tabIndex={0}
          >
            <span className="quick-action-icon">
              <action.icon />
            </span>
            <span className="quick-action-title">{action.title}</span>
          </div>
        </Tooltip>
      ))}
    </div>
  );

  return (
    <div className="quick-actions">
      <h3 className="quick-actions-title">Quick Actions</h3>

      <div className="quick-actions-section">
        <h4 className="section-title">Common Actions</h4>
        {renderActionGrid(regularActions)}
      </div>

      {dangerousActions.length > 0 && (
        <div className="quick-actions-section">
          <h4 className="section-title">Danger Zone</h4>
          {renderActionGrid(dangerousActions)}
        </div>
      )}
    </div>
  );
};

export default QuickActions;
