import React from "react";
import "./ThemeToggle.css";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useTheme } from "../../context/ThemeContext/ThemeContext";

const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
    >
      {isDarkMode ? (
        <LightModeIcon
          style={{ margin: "auto auto", width: "15px", height: "15px" }}
        />
      ) : (
        <DarkModeIcon
          style={{ margin: "auto auto", width: "15px", height: "15px" }}
        />
      )}
    </button>
  );
};

export default ThemeToggle;
