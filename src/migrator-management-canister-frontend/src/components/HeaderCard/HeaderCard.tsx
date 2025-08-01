import React from "react";
import "./HeaderCard.css";
import { useSideBar } from "../../context/SideBarContext/SideBarContext";

interface HeaderCardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

const HeaderCard: React.FC<HeaderCardProps> = ({
  title,
  description,
  children,
  className = "",
}) => {
  const { isSidebarCollapsed } = useSideBar();

  return (
    <div className="header-card-wrapper">
      <div
        className={`header-card
        ${className ? className : "header-card-layout-default"} ${
          isSidebarCollapsed ? "collapsed" : ""
        }
        `}
      >
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
      </div>
      <div className="header-card-spacer"></div>
    </div>
  );
};

export default HeaderCard;
