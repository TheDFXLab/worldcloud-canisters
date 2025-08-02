import React, { useState, useEffect } from "react";
import {
  AccountBalance,
  People,
  AttachMoney,
  Refresh,
  NavigateNext,
  NavigateBefore,
} from "@mui/icons-material";
import { useAdminLogic } from "../../../hooks/useAdminLogic";
import "./BookManagement.css";
import { e8sToIcp } from "../../../utility/e8s";

const BookManagement: React.FC = () => {
  const { bookEntries, isLoadingBookEntries, refreshBookEntriesAll } =
    useAdminLogic();

  // Pagination state
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);

  // Fetch book entries on component mount and when pagination changes
  useEffect(() => {
    const payload = {
      limit: limit,
      page: page,
    };
    refreshBookEntriesAll(payload);
  }, [refreshBookEntriesAll, page, limit]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(event.target.value);
    setLimit(newLimit);
    setPage(0); // Reset to first page when changing limit
  };

  const handleRefresh = () => {
    const payload = {
      limit: limit,
      page: page,
    };
    refreshBookEntriesAll(payload);
  };

  // Calculate total balance for a user
  const calculateTotalBalance = (balances: { [token: string]: number }) => {
    return e8sToIcp(
      Object.values(balances).reduce((sum, balance) => sum + balance, 0)
    );
  };

  // Format principal for display
  const formatPrincipal = (principal: string) => {
    return principal.length > 20
      ? `${principal.substring(0, 20)}...`
      : principal;
  };

  return (
    <div className="book-management-container">
      <div className="book-management-header">
        <h2 className="book-management-title">
          <AccountBalance className="book-management-icon" />
          Book Management
        </h2>
        <p className="book-management-description">
          Manage user balances and token deposits
        </p>
      </div>

      {/* Summary Cards */}
      <div className="book-summary-cards">
        <div className="book-summary-card">
          <div className="book-summary-icon">
            <People />
          </div>
          <div className="book-summary-content">
            <h3 className="book-summary-title">Total Users</h3>
            <p className="book-summary-value">{bookEntries.length}</p>
          </div>
        </div>

        <div className="book-summary-card">
          <div className="book-summary-icon">
            <AttachMoney />
          </div>
          <div className="book-summary-content">
            <h3 className="book-summary-title">Total Balances</h3>
            <p className="book-summary-value">
              {bookEntries
                .reduce((total, entry) => {
                  return total + calculateTotalBalance(entry.balances);
                }, 0)
                .toLocaleString()}
            </p>
          </div>
        </div>

        <div className="book-summary-card">
          <div className="book-summary-icon">
            <Refresh />
          </div>
          <div className="book-summary-content">
            <h3 className="book-summary-title">Last Updated</h3>
            <p className="book-summary-value">Just now</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="book-controls">
        <div className="book-controls-left">
          <button
            className="book-refresh-btn"
            onClick={handleRefresh}
            disabled={isLoadingBookEntries}
          >
            <Refresh />
            Refresh
          </button>
        </div>

        <div className="book-controls-right">
          <label className="book-limit-label">
            Show:
            <select
              className="book-limit-select"
              value={limit}
              onChange={handleLimitChange}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </div>

      {/* Book Entries Table */}
      <div className="book-table-container">
        {isLoadingBookEntries ? (
          <div className="book-loading">
            <div className="book-loading-spinner"></div>
            <p>Loading book entries...</p>
          </div>
        ) : (
          <>
            <table className="book-table">
              <thead>
                <tr>
                  <th className="book-table-header">User Principal</th>
                  <th className="book-table-header">Token Balances</th>
                  <th className="book-table-header">Total Balance</th>
                  <th className="book-table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookEntries.length > 0 ? (
                  bookEntries.map((entry, index) => (
                    <tr key={index} className="book-table-row">
                      <td className="book-table-cell">
                        <div className="book-principal-container">
                          <span className="book-principal-id">
                            {formatPrincipal(entry.principal)}
                          </span>
                          <span className="book-principal-full">
                            {entry.principal}
                          </span>
                        </div>
                      </td>
                      <td className="book-table-cell">
                        <div className="book-balances-container">
                          {Object.entries(entry.balances).map(
                            ([token, balance]) => (
                              <div key={token} className="book-balance-item">
                                <span className="book-token-id">
                                  {formatPrincipal(token)}
                                </span>
                                <span className="book-balance-amount">
                                  {e8sToIcp(balance)} ICP
                                </span>
                              </div>
                            )
                          )}
                          {Object.keys(entry.balances).length === 0 && (
                            <span className="book-no-balances">
                              No balances
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="book-table-cell">
                        <span className="book-total-balance">
                          {calculateTotalBalance(entry.balances)}
                        </span>
                      </td>
                      <td className="book-table-cell">
                        <div className="book-actions">
                          <button
                            className="book-action-btn book-view-btn"
                            title="View Details"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="book-no-data">
                      No book entries found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="book-pagination">
              <div className="book-pagination-info">
                Showing {page * limit + 1} to{" "}
                {Math.min((page + 1) * limit, bookEntries.length)} of{" "}
                {bookEntries.length} entries
              </div>
              <div className="book-pagination-controls">
                <button
                  className="book-pagination-btn"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 0}
                >
                  <NavigateBefore />
                  Previous
                </button>
                <span className="book-page-info">Page {page + 1}</span>
                <button
                  className="book-pagination-btn"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={bookEntries.length < limit}
                >
                  Next
                  <NavigateNext />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookManagement;
