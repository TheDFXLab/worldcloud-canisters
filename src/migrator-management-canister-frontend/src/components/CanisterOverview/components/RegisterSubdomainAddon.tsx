import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  Alert,
  Tooltip,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Language,
  Add,
  CheckCircle,
  Info,
  ContentCopy,
  Delete,
} from "@mui/icons-material";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import { useLoaderOverlay } from "../../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useIdentity } from "../../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../../context/HttpAgentContext/HttpAgentContext";
//
import "./RegisterSubdomainAddon.css";
//
import { useProjectsLogic } from "../../../hooks/useProjectsLogic";
import { SerializedAddOn } from "../../../serialization/addons";
import {
  SerializedDomainRegistration,
  SerializedIcDomainRegistrationStatus,
} from "../../../serialization/admin";
import { FaClock } from "react-icons/fa";
import { useTheme } from "../../../context/ThemeContext/ThemeContext";
import { SimpleConfirmationModal } from "../../ConfirmationPopup/SimpleConfirmationModal";

interface RegisterSubdomainAddonProps {
  projectId: string;
  canisterId?: string;
  addonId: number;
  addon: SerializedAddOn;
}

export const RegisterSubdomainAddon: React.FC<RegisterSubdomainAddonProps> = ({
  projectId,
  canisterId,
  addonId,
  addon,
}) => {
  const { setToasterData, setShowToaster } = useToaster();
  const { summon, destroy } = useLoaderOverlay();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { isDarkMode } = useTheme();

  const {
    parsedMyAddons,
    handleGetParsedMyAddons,
    handleSetupCustomDomainByProject,
    handleCheckSubdomainNameAvailability,
    handleDeleteDomainRegistration,
    refreshProjectAddOns,
  } = useProjectsLogic();

  const [subdomainName, setSubdomainName] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [domainStatus, setDomainStatus] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [timeoutReference, setTimeoutReference] =
    useState<NodeJS.Timeout | null>(null);

  const [isAvailableDomain, setIsAvailableDomain] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const matchedDomainAddon = useMemo(() => {
    const list = parsedMyAddons?.domain_addons || [];
    const match = list.find((item) => item.addon.id === addonId);
    return match ? match : null;
  }, [parsedMyAddons, addonId]);

  const findDomainRegistrationForAddOn = () => {
    const sub = matchedDomainAddon?.resource.ic_registration.subdomain;
    if (!sub) return;
    setSubdomainName(sub);
    return sub;
  };

  useEffect(() => {
    handleGetParsedMyAddons(parseInt(projectId));
  }, [handleGetParsedMyAddons, projectId]);

  useEffect(() => {
    if (matchedDomainAddon) {
      findDomainRegistrationForAddOn();
    }
  }, [matchedDomainAddon]);

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

    if (!canisterId) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Canister must be deployed before setting up domains",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    setIsSettingUp(true);
    summon("Setting up custom domain...");

    try {
      const result = await handleSetupCustomDomainByProject(
        parseInt(projectId),
        subdomainName,
        addonId
      );

      if (result) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: `Domain ${subdomainName}.worldcloud.app setup successfully!`,
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);
        setCurrentDomain(subdomainName);
        setDomainStatus("pending");
        setSubdomainName("");
        handleGetParsedMyAddons(parseInt(projectId));
      } else {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Failed to setup domain",
          textColor: "red",
          timeout: 3000,
        });
        setShowToaster(true);
      }
    } catch (error: any) {
      console.error("Failed to setup custom domain:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to setup domain",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      setIsSettingUp(false);
      destroy();
      handleGetParsedMyAddons(parseInt(projectId));
    }
  };

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

  const renderAlertColor = (
    addon_initialized: boolean,
    status: SerializedIcDomainRegistrationStatus
  ) => {
    if (!addon_initialized) return "info";
    if (status === "complete") return "success";
    return "info";
  };

  const renderAddonIcon = (
    addon_initialized: boolean,
    status: SerializedIcDomainRegistrationStatus
  ) => {
    if (!addon_initialized) {
      return <Info />;
    }

    if (status === "complete") return <CheckCircle />;
    if (status === "pending") return <FaClock />;
    return <Info />;
  };

  const handleChangeSubdomainName = async (e: any) => {
    setSubdomainName(e.target.value);

    if (timeoutReference) clearTimeout(timeoutReference);

    let timeout = setTimeout(async () => {
      const isAvailable = await handleCheckSubdomainNameAvailability(
        parseInt(projectId),
        e.target.value as string,
        addon.id
      );

      setIsAvailableDomain(isAvailable);
      console.log(`Domain name is available?`, isAvailable);
    }, 1000);
    setTimeoutReference(timeout);
  };

  const handleDeleteDomain = () => {
    if (!matchedDomainAddon) return;
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    await confirmDeleteDomain();
    setShowDeleteModal(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const confirmDeleteDomain = async () => {
    if (!matchedDomainAddon) return;

    setIsDeleting(true);
    summon("Deleting domain registration...");

    try {
      const result = await handleDeleteDomainRegistration(
        parseInt(projectId),
        addonId
      );

      if (result) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: "Domain registration deleted successfully!",
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);
        setCurrentDomain(null);
        setDomainStatus(null);
        setSubdomainName("");

        // Refresh the parsed addons data first
        console.log("Refreshing parsed addons after deletion...");
        await handleGetParsedMyAddons(parseInt(projectId));
        console.log("Parsed addons refreshed:", parsedMyAddons);

        // Then refresh the project addons
        console.log("Refreshing project addons after deletion...");
        await refreshProjectAddOns(parseInt(projectId));
      } else {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Failed to delete domain registration",
          textColor: "red",
          timeout: 3000,
        });
        setShowToaster(true);
      }
    } catch (error: any) {
      console.error("Failed to delete domain registration:", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to delete domain registration",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      setIsDeleting(false);
      destroy();
    }
  };

  const renderAddonBody = (
    addon: SerializedAddOn,
    item: SerializedDomainRegistration
  ) => {
    const ic_registration = item.ic_registration;
    if (!ic_registration?.status) return null;

    const url = `${ic_registration.subdomain}.${item.ic_registration.domain}`;
    return (
      <div className="addon-container">
        <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
          Status:{" "}
          <Tooltip
            title={getIcRegistrationStatusDetails(
              ic_registration.status as SerializedIcDomainRegistrationStatus
            )}
          >
            <Chip
              label={getStatusText(
                ic_registration.status as SerializedIcDomainRegistrationStatus
              )}
              color={
                getStatusColor(
                  ic_registration.status as SerializedIcDomainRegistrationStatus
                ) as any
              }
              size="small"
              variant="outlined"
            />
          </Tooltip>
        </Typography>

        {ic_registration.status === "complete" ? (
          <Typography variant="body2">
            <strong>Domain: </strong>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://${url}`}
            >
              {url}
            </a>
          </Typography>
        ) : ic_registration.status === "inactive" ? (
          <Typography variant="body2">
            <strong>Domain: </strong> <span>No domain registration yet.</span>
          </Typography>
        ) : (
          <Typography variant="body2">
            <strong>Domain:</strong> {ic_registration.subdomain}.worldcloud.app
          </Typography>
        )}

        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {getRegistrationStatusDetails(
            ic_registration.status as SerializedIcDomainRegistrationStatus
          )}
        </Typography>

        {item.error && (
          <Alert severity="warning" variant="outlined">
            <Typography variant="body2">
              <strong>Error: </strong>
              {item.error}
            </Typography>
          </Alert>
        )}

        <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
          <Button size="small" onClick={() => setShowDetails((s) => !s)}>
            {showDetails ? "Hide details" : "View details"}
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDeleteDomain}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </Box>

        {showDetails && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Registration Details
            </Typography>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>Registration ID:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {item.id}
              </Typography>
              <IconButton
                size="small"
                style={{ color: isDarkMode ? "white" : "" }}
                aria-label="Copy registration id"
                onClick={() => navigator.clipboard.writeText(String(item.id))}
              >
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Box>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>Add-on ID:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {item.add_on_id}
              </Typography>
              <IconButton
                size="small"
                style={{ color: isDarkMode ? "white" : "" }}
                aria-label="Copy addon id"
                onClick={() =>
                  navigator.clipboard.writeText(String(item.add_on_id))
                }
              >
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Box>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>TXT Record ID:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {item.txt_domain_record_id}
              </Typography>
              <IconButton
                size="small"
                style={{ color: isDarkMode ? "white" : "" }}
                aria-label="Copy TXT id"
                onClick={() =>
                  navigator.clipboard.writeText(item.txt_domain_record_id)
                }
              >
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Box>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>CNAME Challenge ID:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {item.cname_challenge_record_id}
              </Typography>
              <IconButton
                size="small"
                style={{ color: isDarkMode ? "white" : "" }}
                aria-label="Copy CNAME challenge id"
                onClick={() =>
                  navigator.clipboard.writeText(item.cname_challenge_record_id)
                }
              >
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Box>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>CNAME Domain ID:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {item.cname_domain_record_id}
              </Typography>
              <IconButton
                size="small"
                style={{ color: isDarkMode ? "white" : "" }}
                aria-label="Copy CNAME domain id"
                onClick={() =>
                  navigator.clipboard.writeText(item.cname_domain_record_id)
                }
              >
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Box>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>IC Request ID:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {ic_registration.request_id}
              </Typography>
              <IconButton
                size="small"
                aria-label="Copy IC request id"
                style={{ color: isDarkMode ? "white" : "" }}
                onClick={() =>
                  navigator.clipboard.writeText(ic_registration.request_id)
                }
              >
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Box>

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Domain
            </Typography>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>Domain:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {ic_registration.domain}
              </Typography>
              <IconButton
                size="small"
                style={{ color: isDarkMode ? "white" : "" }}
                aria-label="Copy domain"
                onClick={() =>
                  navigator.clipboard.writeText(ic_registration.domain)
                }
              >
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Box>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>Subdomain:</strong>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                {ic_registration.subdomain}
              </Typography>
              <IconButton
                size="small"
                style={{ color: isDarkMode ? "white" : "" }}
                aria-label="Copy subdomain"
                onClick={() =>
                  navigator.clipboard.writeText(ic_registration.subdomain)
                }
              >
                <ContentCopy fontSize="inherit" />
              </IconButton>
            </Box>

            <Box
              className="kv-row"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ minWidth: 170 }}>
                <strong>Is Apex:</strong>
              </Typography>
              <Typography variant="body2">
                {ic_registration.is_apex ? "Yes" : "No"}
              </Typography>
            </Box>
          </Box>
        )}
      </div>
    );
  };

  return (
    <div className="register-subdomain-addon">
      <div className="addon-header">
        <div className="addon-icon">
          <Language />
        </div>
        <div className="addon-info">
          <h4>
            {addon.initialized ? (
              <span>Custom Subdomain</span>
            ) : (
              <span>Register Subdomain</span>
            )}
          </h4>
          {!addon.initialized && (
            <p>Create a custom subdomain for your project</p>
          )}
        </div>
        <div className="addon-status">
          <Tooltip
            title={
              addon.status === "frozen"
                ? "Check your billing for service renewal."
                : "Add-on service is active."
            }
          >
            <Chip
              label={currentDomain ? "Active" : "Available"}
              color={currentDomain ? "success" : "default"}
              variant="outlined"
              size="small"
            />
          </Tooltip>
        </div>
      </div>

      {matchedDomainAddon && (
        <div className="domain-info">
          <Alert
            // severity={addon.initialized ? "success" : "info"}
            severity={renderAlertColor(
              matchedDomainAddon.addon.initialized,
              matchedDomainAddon.resource.ic_registration.status
            )}
            icon={renderAddonIcon(
              matchedDomainAddon.addon.initialized,
              matchedDomainAddon.resource.ic_registration.status
            )}
          >
            {renderAddonBody(addon, matchedDomainAddon.resource)}
          </Alert>
        </div>
      )}
      {(!matchedDomainAddon?.addon.initialized ||
        matchedDomainAddon.resource.ic_registration.status === "inactive") && (
        <div className="domain-setup">
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter a subdomain name to create a custom domain for your project.
          </Typography>

          <Box className="domain-input-group">
            <TextField
              label="Subdomain Name"
              value={subdomainName}
              onChange={handleChangeSubdomainName}
              placeholder="e.g., myapp"
              size="small"
              fullWidth
              disabled={!canisterId}
              helperText={
                !canisterId ? "Deploy your project first to setup domains" : ""
              }
            />
            <Button
              variant="contained"
              onClick={handleSetupDomain}
              disabled={isSettingUp || !subdomainName.trim() || !canisterId}
              startIcon={isSettingUp ? <CheckCircle /> : <Add />}
              size="small"
            >
              {isSettingUp ? "Setting up..." : "Setup Domain"}
            </Button>
          </Box>

          {subdomainName && (
            <div>
              <Typography variant="body2" sx={{ mt: 1 }}>
                This will create:{" "}
                <strong>{subdomainName}.worldcloud.app</strong>
              </Typography>
              {!isAvailableDomain && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Subdomain name is taken.
                </Typography>
              )}
            </div>
          )}
        </div>
      )}

      {!canisterId && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            You need to deploy your project first before you can setup custom
            domains.
          </Typography>
        </Alert>
      )}

      <SimpleConfirmationModal
        show={showDeleteModal}
        title="Delete Domain Registration"
        message={
          matchedDomainAddon
            ? `Are you sure you want to delete the domain registration for "${matchedDomainAddon.resource.ic_registration.subdomain}.${matchedDomainAddon.resource.ic_registration.domain}"? This action cannot be undone.`
            : "Are you sure you want to delete this domain registration? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};
