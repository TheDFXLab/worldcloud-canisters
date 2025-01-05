import React, { useState, useEffect } from "react";
// import { FileList } from "./FileList";
import "./AssetManager.css";
import FileUploader from "../FileUploader/FileUploader";
import { Button } from "react-bootstrap";

export const AssetManager: React.FC<{ canisterId: string }> = ({
  canisterId,
}) => {
  const [files, setFiles] = useState<Array<any>>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleUpload = async (file: File) => {
    // Implement upload logic
  };

  const handleClearAll = async () => {
    // Implement clear all logic
  };

  return (
    <div className="asset-manager">
      <div className="asset-manager__controls">
        {/* <SearchInput
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search files..."
        /> */}
        {/* <FileUploader onUpload={handleUpload} /> */}
        <Button variant="warning" onClick={handleClearAll}>
          Clear All Files
        </Button>
      </div>
      {/* <FileList files={files} searchQuery={searchQuery} /> */}
    </div>
  );
};
