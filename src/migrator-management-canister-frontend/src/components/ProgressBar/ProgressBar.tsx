import React, { useEffect, useState } from "react";
import { Accordion } from "react-bootstrap";
import "./ProgressBar.css";
import { StaticFile } from "../../utility/compression";

interface ProgressBarProps {
  progress: number;
  status: string;
  isLoading: boolean;
  isError?: boolean;
  showPercentage?: boolean;
  files?: StaticFile[] | null;
  totalBytes?: number;
  uploadedSize?: number;
}

function ProgressBar({
  status,
  isLoading,
  isError = false,
  showPercentage = true,
  files,
  totalBytes,
  uploadedSize,
}: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!uploadedSize || !totalBytes) {
      return;
    }

    setDisplayProgress(Math.round((uploadedSize / totalBytes) * 100));
  }, [uploadedSize]);

  useEffect(() => {
    const animateProgress = () => {
      if (displayProgress < progress) {
        setDisplayProgress((prev) => Math.min(prev + 1, progress));
        requestAnimationFrame(animateProgress);
      }
    };

    if (isLoading) {
      requestAnimationFrame(animateProgress);
    }
  }, [progress, isLoading]);

  return (
    <div className="progress-container">
      {isLoading && (
        <div className="progress-bar-wrapper">
          <div
            className={`progress-bar ${isError ? "error" : ""}`}
            style={{ width: `${displayProgress}%` }}
          />
        </div>
      )}

      {showPercentage && (
        <div className="progress-info">
          <div className={`progress-status ${isError ? "error" : ""}`}>
            {status} {displayProgress > 0 && `(${displayProgress}%)`}
          </div>
        </div>
      )}

      {files && files.length > 0 && (
        <Accordion style={{ color: "black" }} className="files-accordion mt-2">
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <div
                style={{
                  color: "black",
                  zIndex: "10000",
                  fontFamily: "times new roman",
                }}
                className="files-accordion-title"
              >
                <span style={{ color: "black" }}>
                  Copying Files ({files.length})
                </span>
              </div>
            </Accordion.Header>
            <Accordion.Body className="files-accordion-body">
              <div className="files-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    {file.path}
                  </div>
                ))}
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}
    </div>
  );
}

export default ProgressBar;
