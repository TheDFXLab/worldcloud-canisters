import React from "react";
import "./RotatingGlass.css";
import glassObjectImg from "../../../assets/images/glass-object.png";

interface RotatingGlassProps {
  size?: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

const RotatingGlass: React.FC<RotatingGlassProps> = ({
  size = 400,
  duration = 20,
  className = "",
  style = {},
}) => {
  // For very large sizes, use viewport dimensions
  const isFullScreen = size > 1000;
  const fullScreenClass = isFullScreen ? "fullscreen" : "";

  return (
    <div
      className={`rotating-glass ${className} ${fullScreenClass}`}
      style={{
        width: isFullScreen ? `200vw` : `${size}px`,
        height: isFullScreen ? `200vh` : `${size}px`,
        animationDuration: `${duration}s`,
        animationName: isFullScreen
          ? "fullScreenElliptical"
          : "ellipticalRotation",
        position: "absolute",
        zIndex: -1,
        pointerEvents: "none",
        ...style,
      }}
    >
      <img
        src={glassObjectImg}
        alt="Glass Object"
        className="glass-image"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};

export default RotatingGlass;
