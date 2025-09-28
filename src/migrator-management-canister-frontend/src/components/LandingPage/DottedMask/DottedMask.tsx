import React from "react";
import "./DottedMask.css";
import dotted_bg from "../../../../assets/images/dotted_background.png";

interface DottedMaskProps {
  size?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DottedMask: React.FC<DottedMaskProps> = ({
  size = 400,
  duration = 20,
  className = "",
  style = {},
}) => {
  const isFullScreen = size > 1000;
  const fullScreenClass = isFullScreen ? "fullscreen" : "";

  return (
    <div
      className={`dotted-mask ${className} ${fullScreenClass}`}
      style={{
        width: isFullScreen ? "200vw" : `${size}px`,
        height: isFullScreen ? "200vw" : `${size}px`,
        ...style,
      }}
    >
      <img
        src={dotted_bg}
        alt="Dotted Background"
        className="dotted-image"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
};

export default DottedMask;
