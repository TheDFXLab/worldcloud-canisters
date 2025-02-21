import { Tooltip } from "@mui/material";
import { useRef, useState, useEffect } from "react";

const TruncatedTooltip: React.FC<{ text: string; className?: string }> = ({
  text,
  className,
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    }
  }, [text]);

  return (
    <Tooltip title={text} placement="bottom">
      <div ref={textRef} className={className}>
        {text}
      </div>
    </Tooltip>
  );
};

export default TruncatedTooltip;
