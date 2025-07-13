import React from "react";
import "./HeaderCard.css";

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
  return (
    <div
      className={`header-card 
        ${className ? className : "header-card-layout-default"}
        `}
    >
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
};

export default HeaderCard;
