import { useEffect, useState } from "react";
import { Toast } from "react-bootstrap";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

import InfoIcon from "@mui/icons-material/Info";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import "./Toaster.css";
import IconTextRowView from "../IconTextRowView/IconTextRowView";

export interface ToasterData {
  headerContent: string;
  toastStatus: boolean;
  toastData: string;
  textColor: string;
  timeout?: number;
}

interface ToasterProps {
  headerContent: string;
  toastStatus: boolean;
  toastData: string;
  textColor: string;
  show: boolean;
  onHide: () => void;
  timeout: number;
  link: string;
  overrideTextStyle: string;
}

export default function Toaster({
  headerContent,
  toastStatus,
  toastData,
  textColor,
  show,
  onHide,
  timeout,
  link,
  overrideTextStyle,
}: ToasterProps) {
  const header = headerContent;
  const backgroundColor = "#260B50";

  const [fadeOut, setFadeOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (show) {
      setFadeOut(false);
      setMounted(false);
      requestAnimationFrame(() => setMounted(true));
    } else {
      setFadeOut(true);
      const timer = setTimeout(onHide, 500);
      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  useEffect(() => {
    if (show && timeout) {
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(onHide, 500);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [show, timeout, onHide]);

  if (!show && !fadeOut) return null;

  return (
    <Toast
      className={`${
        mounted ? "toast-slide-in no-user-select" : "no-user-select"
      } ${fadeOut ? "toast-slide-out" : ""}`}
      style={{
        maxWidth: "clamp(300px, 20vw, 600px)",
        position: "fixed",
        left: "2%",
        top: "10%",
        backgroundColor: backgroundColor,
        zIndex: 200000,
        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.4)",
        transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: !mounted && !fadeOut ? "translateX(-150%)" : undefined,
      }}
      onClose={() => setFadeOut(true)}
      show={true}
    >
      <Toast.Header style={{ backgroundColor: backgroundColor }}>
        {toastStatus ? (
          <IconTextRowView
            text={headerContent}
            IconComponent={CheckCircleOutlineIcon}
            iconColor={"#50FF97"}
          />
        ) : (
          <IconTextRowView
            text={headerContent}
            IconComponent={WarningAmberIcon}
            iconColor={"#FF3131"}
          />
        )}
        <small style={{ color: "white" }}>{"now"}</small>
      </Toast.Header>
      <Toast.Body
        style={{ maxWidth: "35vw", backgroundColor: backgroundColor }}
      >
        <div className="flexbox-row space-between">
          <p style={{ margin: "0" }}>{toastData}</p>
          {link?.length > 0 && (
            <a href={link} target="_blank" rel="noreferrer">
              {link.includes("metamask")
                ? "Install Metamask"
                : "View transaction"}
            </a>
          )}
          <div style={{ wordBreak: "break-word" }}></div>
        </div>
      </Toast.Body>
    </Toast>
  );
}
