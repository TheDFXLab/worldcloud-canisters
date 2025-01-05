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
  // progress,
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

    console.log("uploadedSize", uploadedSize);
    console.log("totalBytes", totalBytes);
    console.log("progress", Math.round((uploadedSize / totalBytes) * 100));
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
      <div className="progress-bar-wrapper">
        <div
          className={`progress-bar ${isError ? "error" : ""}`}
          style={{ width: `${displayProgress}%` }}
        />
      </div>
      {showPercentage && (
        <div className="progress-info">
          <div className={`progress-status ${isError ? "error" : ""}`}>
            {status} {displayProgress > 0 && `(${displayProgress}%)`}
          </div>
        </div>
      )}

      {files && files.length > 0 && (
        <Accordion className="files-accordion mt-2">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Copying Files ({files.length})</Accordion.Header>
            <Accordion.Body>
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  {file.path}
                </div>
              ))}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      )}
    </div>
  );
}

export default ProgressBar;
