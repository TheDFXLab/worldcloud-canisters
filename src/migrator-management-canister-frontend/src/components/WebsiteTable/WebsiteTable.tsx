import React from "react";
import { useNavigate } from "react-router-dom";
import "./WebsiteTable.css";
import { Table } from "../Table/Table";
import { Deployment } from "../AppLayout/interfaces";

export interface Website {
  canisterId: string;
  status: string;
  size: number;
  date_created: number;
  date_updated: number;
}

interface WebsiteTableProps {
  websites: Deployment[];
  isLoading?: boolean;
  error?: string;
}

export const WebsiteTable: React.FC<WebsiteTableProps> = ({
  websites,
  isLoading = false,
  error,
}) => {
  const navigate = useNavigate();

  const handleRowClick = (website: Website) => {
    navigate(`/canister/${website.canisterId}`);
  };

  if (isLoading) {
    return <div className="website-table__loading">Loading...</div>;
  }

  if (error) {
    return <div className="website-table__error">{error}</div>;
  }

  return (
    <div className="website-table">
      <Table
        data={websites}
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Canister ID", accessor: "canisterId" },
          { header: "Status", accessor: "status" },
        ]}
        onRowClick={handleRowClick}
      />
    </div>
  );
};
