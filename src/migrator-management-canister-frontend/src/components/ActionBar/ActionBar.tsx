import React from "react";
import "./ActionBar.css";
import { Tooltip } from "@mui/material";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";

interface ActionBarProps {
  icon?: string;
  text: string;
  buttonText: string;
  onButtonClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isButtonDisabled?: boolean;
  isHidden?: boolean;
  disabledReason?: string;
  customButton?: React.ReactNode;
}

export interface ActionBarConfig {
  icon?: string;
  text: string;
  buttonText: string;
  onButtonClick: () => void;
  isButtonDisabled?: boolean;
  isHidden?: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({
  icon = "🚀",
  text,
  buttonText,
  onButtonClick,
  isButtonDisabled = false,
  disabledReason,
  isHidden = false,
  customButton,
}) => {
  const { isSidebarCollapsed } = useSideBar();

  return (
    <div
      className={`action-bar visible ${isHidden ? "hidden" : ""} ${
        isSidebarCollapsed ? "sidebar-collapsed" : ""
      }`}
    >
      <div className="action-bar-content">
        <div className="selected-repo">
          <span className="repo-icon">{icon}</span>
          <span className="action-bar-text">{text}</span>
        </div>

        {customButton ? (
          customButton
        ) : (
          <Tooltip title={disabledReason ? disabledReason : ""}>
            <button
              className="next-button"
              disabled={isButtonDisabled}
              onClick={onButtonClick}
            >
              {buttonText} →
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default ActionBar;
