import React, { useEffect, useState } from "react";
import "./ProgressBarTop.css";
import { useProgress } from "../../context/ProgressBarContext/ProgressBarContext";

interface ProgressBarProps {}

export const ProgressBar: React.FC<ProgressBarProps> = () => {
  const { isLoadingProgress, isEnded } = useProgress();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalTimer: NodeJS.Timeout | undefined;
    let resetTimer: NodeJS.Timeout | undefined;

    const resetProgress = () => {
      resetTimer = setTimeout(() => {
        setProgress(0);
      }, 500);
    };

    if (isLoadingProgress && !isEnded) {
      // Start from 10% immediately when loading starts
      setProgress(10);
      intervalTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(intervalTimer);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
    } else if (isEnded) {
      // When ended, go to 100% then reset
      if (intervalTimer) clearInterval(intervalTimer);
      setProgress(100);
      resetProgress();
    } else if (!isLoadingProgress) {
      // When loading stops without ending, reset immediately
      if (intervalTimer) clearInterval(intervalTimer);
      resetProgress();
    }

    return () => {
      if (intervalTimer) clearInterval(intervalTimer);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [isLoadingProgress, isEnded]);

  // Only render if we're loading or have progress
  if (progress === 0) return null;

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
