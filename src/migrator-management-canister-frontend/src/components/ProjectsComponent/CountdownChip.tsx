import React, { useEffect, useState } from "react";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

interface CountdownChipProps {
  startTimestamp: bigint | number;
  duration: bigint | number;
  className?: string;
  onExpire?: () => void;
}

function formatTimeLeft(secondsLeft: number): string {
  const h = Math.floor(secondsLeft / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((secondsLeft % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(secondsLeft % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const CountdownChip: React.FC<CountdownChipProps> = ({
  startTimestamp,
  duration,
  className = "",
  onExpire,
}) => {
  // Convert nanoseconds to milliseconds
  const startMs =
    typeof startTimestamp === "bigint"
      ? Number(startTimestamp) / 1_000_000
      : Number(startTimestamp) / 1_000_000;
  const durationSec = Number(duration);
  const expiryMs = startMs + durationSec * 1000;

  const [timeLeft, setTimeLeft] = useState(
    Math.max(0, Math.floor((expiryMs - Date.now()) / 1000))
  );

  useEffect(() => {
    if (timeLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && onExpire) onExpire();
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, onExpire]);

  if (timeLeft <= 0) return null;

  return (
    <span
      className={`chip countdown-chip ${className}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      <AccessTimeIcon style={{ fontSize: 16, verticalAlign: "middle" }} />
      {formatTimeLeft(timeLeft)}
    </span>
  );
};

export default CountdownChip;
