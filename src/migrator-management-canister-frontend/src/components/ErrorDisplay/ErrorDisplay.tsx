import React from "react";
import { Card } from "react-bootstrap";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import "./ErrorDisplay.css";

export interface ErrorDisplayProps {
  title?: string;
  message?: string;
  icon?: React.ElementType;
  className?: string;
  onRetry?: () => void;
  retryText?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again or contact support if the problem persists.",
  icon: IconComponent = WarningAmberIcon,
  className = "",
  onRetry,
  retryText = "Try Again",
}) => {
  return (
    <div className={`error-display-container ${className}`}>
      <Card className="error-display-card">
        <Card.Body className="error-display-body">
          <div className="error-display-icon">
            <IconComponent className="error-icon" />
          </div>
          <div className="error-display-content">
            <h3 className="error-display-title">{title}</h3>
            <p className="error-display-message">{message}</p>
            {onRetry && (
              <button className="error-display-retry-btn" onClick={onRetry}>
                {retryText}
              </button>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ErrorDisplay;
