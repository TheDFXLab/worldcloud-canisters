import React, { useState, useEffect } from "react";
import { useAdminLogic } from "../../../hooks/useAdminLogic";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import {
  SerializedDomainRegistration,
  SerializedFreemiumDomainRegistration,
  SerializedIcDomainRegistrationStatus,
} from "../../../serialization/admin";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Pagination,
  Button,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Divider,
} from "@mui/material";
import {
  Language,
  Search,
  Refresh,
  ContentCopy,
  CheckCircle,
  Error,
  Pending,
  Cancel,
  Refresh as Retry,
  Delete,
  Visibility,
  MoreVert,
} from "@mui/icons-material";
import "./DomainManagement.css";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`domain-tabpanel-${index}`}
      aria-labelledby={`domain-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DomainManagement: React.FC = () => {
  const {
    domainRegistrationsPaginated,
    freemiumDomainRegistrationsPaginated,
    refreshDomainRegistrationsPaginated,
    refreshFreemiumDomainRegistrationsPaginated,
    isLoadingDomainRegistrationsPaginated,
    isLoadingFreemiumDomainRegistrationsPaginated,
    handleDeleteDomainRegistration,
    isLoadingDeleteDomainRegistration,
  } = useAdminLogic();

  const { setToasterData, setShowToaster } = useToaster();

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data on mount and when tab changes
  useEffect(() => {
    const loadData = async () => {
      const payload = { page: currentPage - 1, limit: pageSize };

      if (activeTab === 0) {
        await refreshDomainRegistrationsPaginated(payload);
      } else {
        await refreshFreemiumDomainRegistrationsPaginated(payload);
      }
    };

    loadData();
  }, [
    activeTab,
    currentPage,
    refreshDomainRegistrationsPaginated,
    refreshFreemiumDomainRegistrationsPaginated,
  ]);

  // Update pagination info when data changes
  useEffect(() => {
    const data =
      activeTab === 0
        ? domainRegistrationsPaginated
        : freemiumDomainRegistrationsPaginated;
    setTotalItems(data.length);
    setTotalPages(Math.ceil(data.length / pageSize));
  }, [
    activeTab,
    domainRegistrationsPaginated,
    freemiumDomainRegistrationsPaginated,
    pageSize,
  ]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setCurrentPage(1);
    setSearchTerm("");
  };

  // Handle page change
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    setCurrentPage(page);
  };

  // Copy to clipboard
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "Copied to clipboard",
        textColor: "green",
        timeout: 2000,
      });
      setShowToaster(true);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: "Failed to copy to clipboard",
        textColor: "red",
        timeout: 2000,
      });
      setShowToaster(true);
    }
  };

  // Retry failed domain registration
  const handleRetryRegistration = async (registrationId: number) => {
    try {
      // This would need to be implemented in the backend
      setToasterData({
        headerContent: "Info",
        toastStatus: true,
        toastData: "Retry functionality not yet implemented",
        textColor: "blue",
        timeout: 3000,
      });
      setShowToaster(true);
    } catch (error) {
      console.error("Failed to retry registration:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: "Failed to retry registration",
        textColor: "red",
        timeout: 2000,
      });
      setShowToaster(true);
    }
  };

  // Delete domain registration
  const handleDeleteRegistration = async (registrationId: number) => {
    console.log("Delete registration called with ID:", registrationId);
    console.log("Selected registration:", selectedRegistration);
    console.log("Active tab:", activeTab);

    setIsDeleting(true);
    try {
      // Determine the type based on active tab
      const type = activeTab === 0 ? "paid" : "freemium";

      console.log("Deleting with type:", type);
      const result = await handleDeleteDomainRegistration(registrationId, type);

      if (result.status) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: result.message,
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);

        // Refresh the data after successful deletion
        const payload = { page: currentPage - 1, limit: pageSize };
        if (activeTab === 0) {
          await refreshDomainRegistrationsPaginated(payload);
        } else {
          await refreshFreemiumDomainRegistrationsPaginated(payload);
        }
      } else {
        setToasterData({
          headerContent: "Error",
          toastStatus: true,
          toastData: result.message,
          textColor: "red",
          timeout: 3000,
        });
        setShowToaster(true);
      }

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete registration:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: "Failed to delete registration",
        textColor: "red",
        timeout: 2000,
      });
      setShowToaster(true);
      setDeleteDialogOpen(false);
      setSelectedRegistration(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Menu handlers
  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    registration: any
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedRegistration(registration);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedRegistration here - only clear it when dialogs close
  };

  const handleRetryClick = () => {
    setRetryDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleViewDetails = () => {
    setDetailsDialogOpen(true);
    handleMenuClose();
  };

  // Helper functions for status handling
  const getStatusColor = (status: SerializedIcDomainRegistrationStatus) => {
    switch (status) {
      case "complete":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "error";
      case "inactive":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusText = (
    status: SerializedIcDomainRegistrationStatus
  ): string => {
    switch (status) {
      case "complete":
        return "Active";
      case "pending":
        return "Pending";
      case "failed":
        return "Failed";
      case "inactive":
        return "Inactive";
      default:
        return "Unknown";
    }
  };

  const getRegistrationStatusDetails = (
    status: SerializedIcDomainRegistrationStatus
  ) => {
    if (status === "complete") return "Your website is being served.";
    else if (status === "failed")
      return "Domain registration failed. Please try again later.";
    else if (status === "inactive")
      return "Start by submitting a request with your subdomain name.";
    else if (status === "pending")
      return "Domain registration in progress. Check back later for updates.";
  };

  const getIcRegistrationStatusDetails = (
    status: SerializedIcDomainRegistrationStatus
  ) => {
    if (status === "complete") return "";
    else if (status === "failed")
      return "Failed to register website with boundary nodes.";
    else if (status === "inactive") return "No pending registration.";
    else if (status === "pending")
      return "Your website will be available soon at the chosen subdomain name.";
  };

  // Get status chip
  const getStatusChip = (status: string) => {
    switch (status) {
      case "complete":
        return (
          <Chip
            icon={<CheckCircle />}
            label="Complete"
            color="success"
            size="small"
          />
        );
      case "pending":
        return (
          <Chip
            icon={<Pending />}
            label="Pending"
            color="warning"
            size="small"
          />
        );
      case "failed":
        return (
          <Chip icon={<Error />} label="Failed" color="error" size="small" />
        );
      case "inactive":
        return (
          <Chip
            icon={<Cancel />}
            label="Inactive"
            color="default"
            size="small"
          />
        );
      default:
        return <Chip label={status} size="small" />;
    }
  };

  // Filter data based on search term
  const filterData = (data: any[]) => {
    if (!searchTerm) return data;

    return data.filter((item: any) => {
      const domainRegistration =
        "domainRegistration" in item ? item.domainRegistration : item;
      const searchLower = searchTerm.toLowerCase();

      return (
        domainRegistration.ic_registration?.domain
          ?.toLowerCase()
          .includes(searchLower) ||
        domainRegistration.ic_registration?.subdomain
          ?.toLowerCase()
          .includes(searchLower) ||
        domainRegistration.ic_registration?.request_id
          ?.toLowerCase()
          .includes(searchLower)
      );
    });
  };

  // Get filtered data
  const getFilteredData = () => {
    if (activeTab === 0) {
      return filterData(domainRegistrationsPaginated);
    } else {
      return filterData(freemiumDomainRegistrationsPaginated);
    }
  };

  const filteredData = getFilteredData();
  const isLoading =
    activeTab === 0
      ? isLoadingDomainRegistrationsPaginated
      : isLoadingFreemiumDomainRegistrationsPaginated;

  // Calculate statistics
  const getStatistics = () => {
    const data =
      activeTab === 0
        ? domainRegistrationsPaginated
        : freemiumDomainRegistrationsPaginated;
    const stats = {
      total: data.length,
      complete: 0,
      pending: 0,
      failed: 0,
      inactive: 0,
    };

    data.forEach((item: any) => {
      const registration = Array.isArray(item) ? item[1] : item;
      const icReg = registration.ic_registration;
      if (icReg?.status) {
        stats[icReg.status as keyof typeof stats]++;
      }
    });

    return stats;
  };

  const statistics = getStatistics();

  return (
    <div className="domain-management">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Domain Management
        </Typography>
        <Typography variant="body1">
          Manage custom domains and freemium domain registrations
        </Typography>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Card sx={{ minWidth: 120, flex: 1 }}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h4" color="primary">
              {statistics.total}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Domains
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 120, flex: 1 }}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h4" color="success.main">
              {statistics.complete}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Complete
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 120, flex: 1 }}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h4" color="warning.main">
              {statistics.pending}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Pending
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 120, flex: 1 }}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h4" color="error.main">
              {statistics.failed}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Failed
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 120, flex: 1 }}>
          <CardContent sx={{ textAlign: "center", py: 2 }}>
            <Typography variant="h4" color="text.secondary">
              {statistics.inactive}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Inactive
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Search and Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search domains, subdomains, or request IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                const payload = { page: currentPage - 1, limit: pageSize };
                if (activeTab === 0) {
                  refreshDomainRegistrationsPaginated(payload);
                } else {
                  refreshFreemiumDomainRegistrationsPaginated(payload);
                }
              }}
            >
              Refresh
            </Button>
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="domain management tabs"
          >
            <Tab
              icon={<Language />}
              label="Custom Domains"
              id="domain-tab-0"
              aria-controls="domain-tabpanel-0"
            />
            <Tab
              icon={<Language />}
              label="Freemium Domains"
              id="domain-tab-1"
              aria-controls="domain-tabpanel-1"
            />
          </Tabs>
        </CardContent>
      </Card>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Custom Domain Registrations
            </Typography>

            {isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredData.length === 0 ? (
              <Alert severity="info">
                No custom domain registrations found
              </Alert>
            ) : (
              <>
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Domain</TableCell>
                        <TableCell>Subdomain</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Request ID</TableCell>
                        <TableCell>Error</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.map((item, index) => {
                        const registration = Array.isArray(item)
                          ? item[1]
                          : "domainRegistration" in item
                          ? item.domainRegistration
                          : item;
                        const icReg = registration.ic_registration;

                        return (
                          <TableRow key={index}>
                            <TableCell>{registration.id}</TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {icReg?.domain || "N/A"}
                                {icReg?.is_apex && (
                                  <Chip
                                    label="Apex"
                                    size="small"
                                    color="primary"
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>{icReg?.subdomain || "N/A"}</TableCell>
                            <TableCell>
                              {getStatusChip(icReg?.status || "unknown")}
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ fontFamily: "monospace" }}
                                >
                                  {icReg?.request_id || "N/A"}
                                </Typography>
                                {icReg?.request_id && (
                                  <Tooltip title="Copy Request ID">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleCopyToClipboard(icReg.request_id)
                                      }
                                    >
                                      <ContentCopy fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {registration.error ? (
                                <Tooltip title={registration.error}>
                                  <Chip
                                    label="Error"
                                    color="error"
                                    size="small"
                                  />
                                </Tooltip>
                              ) : (
                                <Chip label="OK" color="success" size="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  alignItems: "center",
                                }}
                              >
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    const domain = icReg?.domain || "N/A";
                                    const subdomain = icReg?.subdomain || "N/A";
                                    const fullDomain =
                                      subdomain !== "N/A"
                                        ? `${subdomain}.${domain}`
                                        : domain;
                                    handleCopyToClipboard(fullDomain);
                                  }}
                                >
                                  Copy Domain
                                </Button>
                                <IconButton
                                  size="small"
                                  onClick={(e) =>
                                    handleMenuOpen(e, registration)
                                  }
                                >
                                  <MoreVert />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Freemium Domain Registrations
            </Typography>

            {isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : filteredData.length === 0 ? (
              <Alert severity="info">
                No freemium domain registrations found
              </Alert>
            ) : (
              <>
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Domain</TableCell>
                        <TableCell>Subdomain</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Request ID</TableCell>
                        <TableCell>Error</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredData.map((item, index) => {
                        const registration = Array.isArray(item)
                          ? item[1]
                          : item;
                        const icReg = registration.ic_registration;

                        return (
                          <TableRow key={index}>
                            <TableCell>{registration.id}</TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {icReg?.domain || "N/A"}
                                {icReg?.is_apex && (
                                  <Chip
                                    label="Apex"
                                    size="small"
                                    color="primary"
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>{icReg?.subdomain || "N/A"}</TableCell>
                            <TableCell>
                              {getStatusChip(icReg?.status || "unknown")}
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{ fontFamily: "monospace" }}
                                >
                                  {icReg?.request_id || "N/A"}
                                </Typography>
                                {icReg?.request_id && (
                                  <Tooltip title="Copy Request ID">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleCopyToClipboard(icReg.request_id)
                                      }
                                    >
                                      <ContentCopy fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {registration.error ? (
                                <Tooltip title={registration.error}>
                                  <Chip
                                    label="Error"
                                    color="error"
                                    size="small"
                                  />
                                </Tooltip>
                              ) : (
                                <Chip label="OK" color="success" size="small" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  alignItems: "center",
                                }}
                              >
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    const domain = icReg?.domain || "N/A";
                                    const subdomain = icReg?.subdomain || "N/A";
                                    const fullDomain =
                                      subdomain !== "N/A"
                                        ? `${subdomain}.${domain}`
                                        : domain;
                                    handleCopyToClipboard(fullDomain);
                                  }}
                                >
                                  Copy Domain
                                </Button>
                                <IconButton
                                  size="small"
                                  onClick={(e) =>
                                    handleMenuOpen(e, registration)
                                  }
                                >
                                  <MoreVert />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={handleViewDetails}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={handleRetryClick}
          disabled={selectedRegistration?.ic_registration?.status !== "failed"}
        >
          <Retry sx={{ mr: 1 }} />
          Retry Registration
        </MenuItem>
        <MenuItem
          onClick={handleDeleteClick}
          sx={{ color: "error.main" }}
          disabled={isDeleting}
        >
          <Delete sx={{ mr: 1 }} />
          {isDeleting ? "Deleting..." : "Delete Registration"}
        </MenuItem>
      </Menu>

      {/* Retry Dialog */}
      <Dialog
        open={retryDialogOpen}
        onClose={() => {
          setRetryDialogOpen(false);
          setSelectedRegistration(null);
        }}
      >
        <DialogTitle>Retry Domain Registration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to retry the domain registration for "
            {selectedRegistration?.ic_registration?.domain || "N/A"}"?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRetryDialogOpen(false);
              setSelectedRegistration(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedRegistration) {
                handleRetryRegistration(selectedRegistration.id);
              }
            }}
            variant="contained"
            color="primary"
          >
            Retry
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          if (!isDeleting) {
            setDeleteDialogOpen(false);
            setSelectedRegistration(null);
          }
        }}
      >
        <DialogTitle>Delete Domain Registration</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the domain registration for "
            {selectedRegistration?.ic_registration?.subdomain || "N/A"}.
            {selectedRegistration?.ic_registration?.domain || "N/A"}"? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedRegistration(null);
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              console.log("Delete button clicked");
              console.log("Selected registration:", selectedRegistration);
              if (selectedRegistration) {
                console.log("Registration ID:", selectedRegistration.id);
                handleDeleteRegistration(selectedRegistration.id);
              } else {
                console.log("No selected registration found");
              }
            }}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <Delete />}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false);
          setSelectedRegistration(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Domain Registration Details</DialogTitle>
        <DialogContent>
          {selectedRegistration && (
            <Box>
              {/* Status Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Status
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}
                >
                  <Chip
                    label={getStatusText(
                      selectedRegistration.ic_registration
                        ?.status as SerializedIcDomainRegistrationStatus
                    )}
                    color={
                      getStatusColor(
                        selectedRegistration.ic_registration
                          ?.status as SerializedIcDomainRegistrationStatus
                      ) as any
                    }
                    size="medium"
                    variant="outlined"
                  />
                  <Typography variant="body2" color="textSecondary">
                    {getRegistrationStatusDetails(
                      selectedRegistration.ic_registration
                        ?.status as SerializedIcDomainRegistrationStatus
                    )}
                  </Typography>
                </Box>
                {selectedRegistration.ic_registration?.status ===
                  "complete" && (
                  <Typography variant="body2">
                    <strong>Domain: </strong>
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://${selectedRegistration.ic_registration.subdomain}.${selectedRegistration.ic_registration.domain}`}
                    >
                      {selectedRegistration.ic_registration.subdomain}.
                      {selectedRegistration.ic_registration.domain}
                    </a>
                  </Typography>
                )}
                {selectedRegistration.ic_registration?.status ===
                  "inactive" && (
                  <Typography variant="body2">
                    <strong>Domain: </strong>{" "}
                    <span>No domain registration yet.</span>
                  </Typography>
                )}
                {selectedRegistration.ic_registration?.status === "pending" && (
                  <Typography variant="body2">
                    <strong>Domain:</strong>{" "}
                    {selectedRegistration.ic_registration.subdomain}
                    .worldcloud.app
                  </Typography>
                )}
                {selectedRegistration.ic_registration?.status === "failed" && (
                  <Typography variant="body2">
                    <strong>Domain:</strong>{" "}
                    {selectedRegistration.ic_registration.subdomain}
                    .worldcloud.app
                  </Typography>
                )}
              </Box>

              {/* Error Section */}
              {selectedRegistration.error && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="warning" variant="outlined">
                    <Typography variant="body2">
                      <strong>Error: </strong>
                      {selectedRegistration.error}
                    </Typography>
                  </Alert>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Registration Details */}
              <Typography variant="h6" gutterBottom>
                Registration Details
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>Registration ID:</strong>
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {selectedRegistration.id}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy registration id"
                  onClick={() =>
                    handleCopyToClipboard(String(selectedRegistration.id))
                  }
                >
                  <ContentCopy fontSize="inherit" />
                </IconButton>
              </Box>

              {selectedRegistration.add_on_id && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="body2" sx={{ minWidth: 170 }}>
                    <strong>Add-on ID:</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                    {selectedRegistration.add_on_id}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Copy addon id"
                    onClick={() =>
                      handleCopyToClipboard(
                        String(selectedRegistration.add_on_id)
                      )
                    }
                  >
                    <ContentCopy fontSize="inherit" />
                  </IconButton>
                </Box>
              )}

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>TXT Record ID:</strong>
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {selectedRegistration.txt_domain_record_id}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy TXT id"
                  onClick={() =>
                    handleCopyToClipboard(
                      selectedRegistration.txt_domain_record_id
                    )
                  }
                >
                  <ContentCopy fontSize="inherit" />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>CNAME Challenge ID:</strong>
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {selectedRegistration.cname_challenge_record_id}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy CNAME challenge id"
                  onClick={() =>
                    handleCopyToClipboard(
                      selectedRegistration.cname_challenge_record_id
                    )
                  }
                >
                  <ContentCopy fontSize="inherit" />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>CNAME Domain ID:</strong>
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {selectedRegistration.cname_domain_record_id}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy CNAME domain id"
                  onClick={() =>
                    handleCopyToClipboard(
                      selectedRegistration.cname_domain_record_id
                    )
                  }
                >
                  <ContentCopy fontSize="inherit" />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>IC Request ID:</strong>
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {selectedRegistration.ic_registration?.request_id}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy IC request id"
                  onClick={() =>
                    handleCopyToClipboard(
                      selectedRegistration.ic_registration?.request_id || ""
                    )
                  }
                >
                  <ContentCopy fontSize="inherit" />
                </IconButton>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Domain Details */}
              <Typography variant="h6" gutterBottom>
                Domain Information
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>Domain:</strong>
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {selectedRegistration.ic_registration?.domain}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy domain"
                  onClick={() =>
                    handleCopyToClipboard(
                      selectedRegistration.ic_registration?.domain || ""
                    )
                  }
                >
                  <ContentCopy fontSize="inherit" />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>Subdomain:</strong>
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {selectedRegistration.ic_registration?.subdomain}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy subdomain"
                  onClick={() =>
                    handleCopyToClipboard(
                      selectedRegistration.ic_registration?.subdomain || ""
                    )
                  }
                >
                  <ContentCopy fontSize="inherit" />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>Is Apex:</strong>
                </Typography>
                <Typography variant="body2">
                  {selectedRegistration.ic_registration?.is_apex ? "Yes" : "No"}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ minWidth: 170 }}>
                  <strong>Canister ID:</strong>
                </Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {selectedRegistration.canister_id}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy canister id"
                  onClick={() =>
                    handleCopyToClipboard(
                      selectedRegistration.canister_id || ""
                    )
                  }
                >
                  <ContentCopy fontSize="inherit" />
                </IconButton>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDetailsDialogOpen(false);
              setSelectedRegistration(null);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DomainManagement;
