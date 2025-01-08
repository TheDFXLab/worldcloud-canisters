import React from "react";

interface IconTextRowViewProps {
  text: string;
  IconComponent: React.ElementType;
  iconColor: string;
  onClickIcon: () => void;
}

const IconTextRowView: React.FC<IconTextRowViewProps> = ({
  text,
  IconComponent,
  iconColor,
  onClickIcon,
}) => {
  return (
    <div
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
      onClick={onClickIcon}
    >
      <IconComponent style={{ color: iconColor }} />
      <span>{text}</span>
    </div>
  );
};

export default IconTextRowView;
export type { IconTextRowViewProps };
