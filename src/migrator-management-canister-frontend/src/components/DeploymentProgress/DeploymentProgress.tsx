import React from "react";
import "./DeploymentProgress.css";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CircleIcon from "@mui/icons-material/Circle";

export type DeploymentStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "error";
  timeEstimate?: string;
};

interface DeploymentProgressProps {
  steps: DeploymentStep[];
  currentStep: string;
}

const DeploymentProgress: React.FC<DeploymentProgressProps> = ({
  steps,
  currentStep,
}) => {
  return (
    <div className="deployment-progress">
      <div className="progress-timeline">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`progress-step ${step.status} ${
              currentStep === step.id ? "current" : ""
            }`}
          >
            <div className="step-indicator">
              {step.status === "completed" ? (
                <TaskAltIcon className="status-icon completed" />
              ) : step.status === "error" ? (
                <ErrorOutlineIcon className="status-icon error" />
              ) : step.status === "in-progress" ? (
                <div className="loading-dots">...</div>
              ) : (
                <CircleIcon className="status-icon pending" />
              )}
            </div>
            <div className="step-content">
              <h4>{step.title}</h4>
              <p>{step.description}</p>
              {step.timeEstimate && step.status === "in-progress" && (
                <span className="time-estimate">~{step.timeEstimate}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeploymentProgress;
