import React from "react";
import "./LoaderOverlay.css";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";

interface LoaderOverlayProps {}

const LoaderOverlay: React.FC<LoaderOverlayProps> = () => {
  const { isLoading, message } = useLoaderOverlay();
  if (!isLoading) return null;

  return (
    <div className="loader-overlay">
      <div className="loader-content">
        <div className="loader">
          <div className="shape"></div>
          <div className="shape"></div>
          <div className="shape"></div>
          <div className="shape"></div>
        </div>
        <p className="loader-message">{message}</p>
      </div>
    </div>
  );
};

export default LoaderOverlay;
