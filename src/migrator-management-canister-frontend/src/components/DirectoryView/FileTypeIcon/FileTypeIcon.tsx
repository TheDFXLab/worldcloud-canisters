import React from "react";
import {
  FaFileImage,
  FaFileAudio,
  FaFileVideo,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileCode,
  FaFileAlt,
} from "react-icons/fa";
import "./FileTypeIcon.css";

interface FileTypeIconProps {
  type: string;
  size?: number;
}

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  type,
  size = 48,
}) => {
  const getIcon = () => {
    const mimeType = type.toLowerCase();

    // Images
    if (mimeType.startsWith("image/")) {
      return <FaFileImage color="#36B37E" />;
    }

    // Audio
    if (mimeType.startsWith("audio/")) {
      return <FaFileAudio color="#FF5630" />;
    }

    // Video
    if (mimeType.startsWith("video/")) {
      return <FaFileVideo color="#FF8B00" />;
    }

    // Documents
    if (mimeType === "application/pdf") {
      return <FaFilePdf color="#FF5630" />;
    }
    if (mimeType.includes("word") || mimeType.includes("msword")) {
      return <FaFileWord color="#0052CC" />;
    }
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) {
      return <FaFileExcel color="#36B37E" />;
    }
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) {
      return <FaFilePowerpoint color="#FF8B00" />;
    }

    // Archives
    if (
      mimeType.includes("zip") ||
      mimeType.includes("rar") ||
      mimeType.includes("tar")
    ) {
      return <FaFileArchive color="#6554C0" />;
    }

    // Code
    if (
      mimeType.includes("javascript") ||
      mimeType.includes("json") ||
      mimeType.includes("html") ||
      mimeType.includes("css")
    ) {
      return <FaFileCode color="#0052CC" />;
    }

    // Default
    return <FaFileAlt color="#6B778C" />;
  };

  return (
    <div className="file-type-icon" style={{ fontSize: size }}>
      {getIcon()}
    </div>
  );
};
