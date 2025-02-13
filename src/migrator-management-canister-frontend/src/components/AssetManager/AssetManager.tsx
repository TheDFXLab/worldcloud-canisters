import React, { useState } from "react";
import { Badge, Button, Table, Form, Pagination } from "react-bootstrap";
import { useAsset } from "../../context/AssetContext/AssetContext";
import { formatFileSize, getTypeBadgeColor } from "../../utility/formatter";
import { getCanisterUrl } from "../../config/config";
import { FaDownload } from "react-icons/fa";
import "./AssetManager.css";
import { DirectoryView } from "../DirectoryView/DirectoryView";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";

export const AssetManager: React.FC<{ canisterId: string }> = ({
  canisterId,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { assets } = useAsset();
  const { identity } = useIdentity();
  const [viewMode, setViewMode] = useState<"table" | "directory">("table");

  const handleDownload = (assetPath: string) => {
    const baseUrl = getCanisterUrl(canisterId);
    const downloadUrl = `${baseUrl}${assetPath}`;
    window.open(downloadUrl, "_blank");
  };

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssets = assets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(assets.length / itemsPerPage);

  // Generate page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="asset-manager">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Form.Select
          style={{ width: "auto" }}
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
        >
          <option value="5">5 per page</option>
          <option value="10">10 per page</option>
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
        </Form.Select>

        <Button
          variant="outline-primary"
          onClick={() =>
            setViewMode((prev) => (prev === "table" ? "directory" : "table"))
          }
        >
          {viewMode === "table" ? "Grid View" : "Table View"}
        </Button>
      </div>

      {viewMode === "table" ? (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Path</th>
              <th>Type</th>
              <th>Size</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentAssets.map((asset) => (
              <tr key={asset.key}>
                <td>{asset.key}</td>
                <td>
                  <Badge bg={getTypeBadgeColor(asset.content_type)}>
                    {asset.content_type}
                  </Badge>
                </td>
                <td>
                  {formatFileSize(Number(asset.encodings[0]?.length || 0))}
                </td>
                <td className="text-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleDownload(asset.key)}
                    title="Download file"
                  >
                    <FaDownload />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <DirectoryView
          assets={assets}
          onDownload={handleDownload}
          canisterId={canisterId}
          identity={identity}
        />
      )}

      <div className="d-flex justify-content-between align-items-center">
        <span>
          Showing {indexOfFirstItem + 1} to{" "}
          {Math.min(indexOfLastItem, assets.length)} of {assets.length} entries
        </span>
        <Pagination>
          <Pagination.First
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          />
          <Pagination.Prev
            onClick={() => setCurrentPage((prev) => prev - 1)}
            disabled={currentPage === 1}
          />

          {pageNumbers.map((number) => (
            <Pagination.Item
              key={number}
              active={number === currentPage}
              onClick={() => setCurrentPage(number)}
            >
              {number}
            </Pagination.Item>
          ))}

          <Pagination.Next
            onClick={() => setCurrentPage((prev) => prev + 1)}
            disabled={currentPage === totalPages}
          />
          <Pagination.Last
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          />
        </Pagination>
      </div>
    </div>
  );
};
