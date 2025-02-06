import React from "react";
import "./IconTextRowView.css";

interface IconTextRowViewProps {
  text: string;
  IconComponent: React.ElementType;
  onClickIcon?: () => void;
  className?: string;
  iconColor?: string; // This can be removed if we're using CSS variables
}

const IconTextRowView: React.FC<IconTextRowViewProps> = ({
  text,
  IconComponent,
  onClickIcon,
  className = "",
}) => {
  return (
    <div className={`icon-text-row ${className}`} onClick={onClickIcon}>
      <IconComponent />
      <span>{text}</span>
    </div>
  );
};

export default IconTextRowView;
export type { IconTextRowViewProps };
