import React, { useEffect, useState } from "react";
import "./ProgressBarTop.css";

interface ProgressBarProps {
  isLoading: boolean;
  isEnded?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  isLoading,
  isEnded,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalTimer: NodeJS.Timeout | undefined;
    let resetTimer: NodeJS.Timeout | undefined;

    const resetProgress = () => {
      resetTimer = setTimeout(() => {
        setProgress(0);
      }, 500);
    };

    if (isLoading && !isEnded) {
      setProgress((prev) => (prev === 0 ? 10 : prev));
      intervalTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(intervalTimer);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
    } else if (isEnded || !isLoading) {
      if (intervalTimer) clearInterval(intervalTimer);
      setProgress(100);
      resetProgress();
    }

    return () => {
      if (intervalTimer) clearInterval(intervalTimer);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [isLoading, isEnded]);

  if (!isLoading && progress === 0) return null;

  return (
    <div className="progress-bar-container">
      <div
        className="progress-bar"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : "width 0.5s ease-in-out",
        }}
      />
    </div>
  );
};
