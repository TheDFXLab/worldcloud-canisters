interface IconTextRowViewProps {
  IconComponent: React.ElementType;
  text: string;
  iconColor: string;
  overrideContainerStyle?: React.CSSProperties;
  overrideTextStyle?: React.CSSProperties;
  clickHandler?: () => void;
}

function IconTextRowView({
  IconComponent,
  text,
  iconColor,
  overrideContainerStyle = {},
  overrideTextStyle = {},
  clickHandler,
}: IconTextRowViewProps) {
  const textMutedStyle = {
    color: "grey",
    fontStyle: "italic",
    fontSize: "16px",
    textAlign: "right" as const,
    margin: "0",
  };
  const containerStyleDefault = {
    display: "flex",
    flexDirection: "row" as const,
    justifyContent: "flex-start",
    flexWrap: "nowrap" as const,
    alignItems: "center",
    columnGap: "10px",
    width: "100%",
  };
  const containerStyle = {
    ...containerStyleDefault,
    ...overrideContainerStyle,
  };

  const textStyle = { ...textMutedStyle, ...overrideTextStyle };

  return (
    <div onClick={clickHandler} style={containerStyle}>
      <IconComponent
        className="clickable"
        sx={{ fontSize: 16 }}
        style={{ color: iconColor }}
      />
      <p style={textStyle}>{text}</p>
    </div>
  );
}
export default IconTextRowView;
