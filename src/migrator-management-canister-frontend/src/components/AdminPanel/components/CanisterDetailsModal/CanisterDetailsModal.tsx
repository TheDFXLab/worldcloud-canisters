import React, { useState, useEffect } from "react";
// import { useAdminLogic } from "../../../hooks/useAdminLogic";
import { useToaster } from "../../../../context/ToasterContext/ToasterContext";
import { useConfirmationModal } from "../../../../context/ConfirmationModalContext/ConfirmationModalContext";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import { Close, Language, Edit, Add, Timer } from "@mui/icons-material";
import "./CanisterDetailsModal.css";
import { useAdminLogic } from "../../../../hooks/useAdminLogic";
import { StaticFile } from "../../../../utility/compression";

interface CanisterDetailsModalProps {
  open: boolean;
  onClose: () => void;
  canisterId: string;
  canisterData: any;
}

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
      id={`canister-tabpanel-${index}`}
      aria-labelledby={`canister-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CanisterDetailsModal: React.FC<CanisterDetailsModalProps> = ({
  open,
  onClose,
  canisterId,
  canisterData,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [subdomainName, setSubdomainName] = useState("");
  const [isSettingUpDomain, setIsSettingUpDomain] = useState(false);

  const {
    canisterDomainRegistrations,
    isLoadingCanisterDomainRegistrations,
    globalTimers,
    isLoadingGlobalTimers,
    refreshCanisterDomainRegistrations,
    refreshGlobalTimers,
    handleSetupCustomDomain,
    handleSetIcDomains,
    isLoadingEditIcDomains,
  } = useAdminLogic();

  const { setToasterData, setShowToaster } = useToaster();
  const { setShowModal, call } = useConfirmationModal();

  useEffect(() => {
    if (open && canisterId) {
      refreshCanisterDomainRegistrations(canisterId);
      refreshGlobalTimers();
    }
  }, [
    open,
    canisterId,
    refreshCanisterDomainRegistrations,
    refreshGlobalTimers,
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSetupDomain = async () => {
    if (!subdomainName.trim()) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter a subdomain name",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    setIsSettingUpDomain(true);
    try {
      const result = await handleSetupCustomDomain(canisterId, subdomainName);
      if (result.status) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: result.message,
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);
        setSubdomainName("");
        refreshCanisterDomainRegistrations(canisterId);
        refreshGlobalTimers();
      } else {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: result.message,
          textColor: "red",
          timeout: 3000,
        });
        setShowToaster(true);
      }
    } catch (error) {
      console.error("Failed to setup custom domain:", error);
    } finally {
      setIsSettingUpDomain(false);
    }
  };

  const handleIcDomainsUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let contentType = file.type;
      if (!contentType || contentType === "application/octet-stream") {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith(".json") || fileName.endsWith(".json5")) {
          contentType = "application/json";
        } else if (fileName.endsWith(".txt")) {
          contentType = "text/plain";
        } else {
          contentType = "text/plain";
        }
      }

      const staticFile: StaticFile = {
        path: "/.well-known/ic-domains",
        content_type: contentType,
        content_encoding: [],
        content: uint8Array,
        is_chunked: false,
        chunk_id: 0n,
        batch_id: 0n,
        is_last_chunk: true,
      };

      const result = await handleSetIcDomains(canisterId, staticFile);

      if (result.status) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: result.message,
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);
        event.target.value = "";
        refreshCanisterDomainRegistrations(canisterId);
      } else {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: result.message,
          textColor: "red",
          timeout: 3000,
        });
        setShowToaster(true);
      }
    } catch (error) {
      console.error("Failed to set IC domains:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Failed to set IC domains. Please try again.",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      className="canister-details-modal"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Canister Details: {canisterId.substring(0, 8)}...
          </Typography>
          <Button onClick={onClose} startIcon={<Close />}>
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Domain Management" />
            <Tab label="DNS Records" />
            <Tab label="Global Timers" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Canister Information
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography>
              <strong>Canister ID:</strong> {canisterId}
            </Typography>
            <Typography>
              <strong>Status:</strong> {canisterData?.status || "Unknown"}
            </Typography>
            <Typography>
              <strong>Size:</strong> {canisterData?.size || 0} bytes
            </Typography>
            <Typography>
              <strong>Created:</strong>{" "}
              {new Date(canisterData?.date_created || 0).toLocaleDateString()}
            </Typography>
            <Typography>
              <strong>Updated:</strong>{" "}
              {new Date(canisterData?.date_updated || 0).toLocaleDateString()}
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Domain Management
          </Typography>

          <Box className="domain-management-section" sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Setup Custom Domain
            </Typography>
            <Box
              className="domain-input-group"
              sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}
            >
              <TextField
                label="Subdomain Name"
                value={subdomainName}
                onChange={(e) => setSubdomainName(e.target.value)}
                placeholder="e.g., myapp"
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleSetupDomain}
                disabled={isSettingUpDomain || !subdomainName.trim()}
                startIcon={
                  isSettingUpDomain ? <CircularProgress size={20} /> : <Add />
                }
              >
                {isSettingUpDomain ? "Setting up..." : "Setup Domain"}
              </Button>
            </Box>
            <Typography variant="body2">
              This will create a custom domain:{" "}
              {subdomainName
                ? `${subdomainName}.worldcloud.app`
                : "subdomain.worldcloud.app"}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box className="domain-management-section" sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Upload IC Domains File
            </Typography>
            <input
              type="file"
              id="ic-domains-file-modal"
              onChange={handleIcDomainsUpload}
              disabled={isLoadingEditIcDomains}
              style={{ display: "none" }}
            />
            <label htmlFor="ic-domains-file-modal">
              <Button
                variant="outlined"
                component="span"
                disabled={isLoadingEditIcDomains}
                startIcon={<Edit />}
              >
                {isLoadingEditIcDomains ? "Uploading..." : "Choose File"}
              </Button>
            </label>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Upload a file to set the IC domains configuration for this
              canister
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            DNS Records
          </Typography>

          {isLoadingCanisterDomainRegistrations ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : canisterDomainRegistrations.length > 0 ? (
            <Box>
              {canisterDomainRegistrations.map((registration, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Domain Registration {index + 1}
                  </Typography>
                  <Typography>
                    <strong>TXT Record ID:</strong>{" "}
                    {registration.txt_domain_record_id}
                  </Typography>
                  <Typography>
                    <strong>CNAME Challenge ID:</strong>{" "}
                    {registration.cname_challenge_record_id}
                  </Typography>
                  <Typography>
                    <strong>CNAME Domain ID:</strong>{" "}
                    {registration.cname_domain_record_id}
                  </Typography>
                  {registration.ic_registration && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>IC Registration:</strong>{" "}
                        {registration.ic_registration.domain}
                        {registration.ic_registration.subdomain &&
                          ` / ${registration.ic_registration.subdomain}`}
                      </Typography>
                      <Chip
                        label={registration.ic_registration.status}
                        color={
                          registration.ic_registration.status === "complete"
                            ? "success"
                            : "warning"
                        }
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Alert severity="info">
              No domain registrations found for this canister.
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Global Timers
          </Typography>

          {isLoadingGlobalTimers ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : globalTimers.length > 0 ? (
            <Box>
              {globalTimers.map((timer, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    Timer {index + 1}
                  </Typography>
                  <Typography>
                    <strong>Timer Key:</strong> {timer.id}
                  </Typography>
                  <Typography>
                    <strong>Time Id:</strong> {timer.timer_id}
                  </Typography>
                  <Chip
                    icon={<Timer />}
                    label="Active"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
              ))}
            </Box>
          ) : (
            <Alert severity="info">No active global timers found.</Alert>
          )}
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
};

export default CanisterDetailsModal;
