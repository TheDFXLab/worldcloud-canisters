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
  isDangerous?: boolean;
  description: string;
  onClick?: () => void;
}

interface QuickActionsProps {
  onActionClick?: (action: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onActionClick }) => {
  const commonActions: QuickAction[] = [
    {
      title: "Visit Site",
      icon: LaunchIcon,
      description: "Browse site deployed for this project",
      onClick: () => onActionClick?.("visit"),
    },
    {
      title: "Deploy from Github",
      icon: GitHubIcon,
      description: "Deploy a new build from your Github repository",
      onClick: () => onActionClick?.("deploy"),
    },
    {
      title: "Add Cycles",
      icon: AddCircleOutlineIcon,
      description: "Top up canister cycles",
      onClick: () => onActionClick?.("cycles"),
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
    },
  ];

  const renderActionGrid = (actions: QuickAction[]) => (
    <div className="quick-actions-grid">
      {actions.map((action, index) => (
        <Tooltip key={index} title={action.description}>
          <div
            className={`quick-action-item ${
              action.isDangerous ? "dangerous" : ""
            }`}
            onClick={action.onClick}
            role="button"
            tabIndex={0}
          >
            <action.icon className="quick-action-icon" />
            <div className="quick-action-content">
              <div className="quick-action-title">{action.title}</div>
            </div>
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
