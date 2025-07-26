import React from "react";
import "./ActionBar.css";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";

interface ActionBarProps {
  icon?: string;
  text: string;
  buttonText: string;
  onButtonClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isButtonDisabled?: boolean;
  isHidden?: boolean;
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
          <button
            className="next-button"
            disabled={isButtonDisabled}
            onClick={onButtonClick}
          >
            {buttonText} →
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionBar;
