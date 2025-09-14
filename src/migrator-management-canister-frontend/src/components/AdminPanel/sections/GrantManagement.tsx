import React, { useState, useEffect } from "react";
import { useAdminLogic } from "../../../hooks/useAdminLogic";
import { useSubscriptionLogic } from "../../../hooks/useSubscriptionLogic";
import { useProjectsLogic } from "../../../hooks/useProjectsLogic";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import { useConfirmationModal } from "../../../context/ConfirmationModalContext/ConfirmationModalContext";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Add,
  CreditCard,
  Extension,
  Person,
  CheckCircle,
  Warning,
  ContentCopy,
  Refresh,
  Delete,
  Language,
} from "@mui/icons-material";
import "./GrantManagement.css";
import { SimpleConfirmationModal } from "../../ConfirmationPopup/SimpleConfirmationModal";

interface GrantSubscriptionForm {
  user_principal: string;
  subscription_tier_id: number;
}

interface GrantAddonForm {
  project_id: number;
  addon_id: number;
  expiry_in_ms: number;
}

interface FreemiumDomainForm {
  canister_id: string;
  subdomain_name: string;
}

const GrantManagement: React.FC = () => {
  const {
    handleGrantSubscription,
    handleGrantAddon,
    handleAdminSetupFreemiumDomain,
    isLoadingGrantSubscription,
    isLoadingGrantAddon,
  } = useAdminLogic();
  const { tiers, loadSubscriptionData } = useSubscriptionLogic();
  const { addOnsList, handleFetchAddOnsList } = useProjectsLogic();
  const { setToasterData, setShowToaster } = useToaster();
  const { setShowModal, showModal } = useConfirmationModal();

  // Form states
  const [subscriptionForm, setSubscriptionForm] =
    useState<GrantSubscriptionForm>({
      user_principal: "",
      subscription_tier_id: 0,
    });

  const [addonForm, setAddonForm] = useState<GrantAddonForm>({
    project_id: 0,
    addon_id: 0,
    expiry_in_ms: 0,
  });

  const [freemiumDomainForm, setFreemiumDomainForm] =
    useState<FreemiumDomainForm>({
      canister_id: "",
      subdomain_name: "",
    });

  // Loading states
  const [isGrantingSubscription, setIsGrantingSubscription] = useState(false);
  const [isGrantingAddon, setIsGrantingAddon] = useState(false);
  const [isSettingUpDomain, setIsSettingUpDomain] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [grantType, setGrantType] = useState<
    "subscription" | "addon" | "freemium-domain"
  >("subscription");
  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        await Promise.all([
          loadSubscriptionData(true), // Load tiers
          handleFetchAddOnsList(), // Load addon types
        ]);
      } catch (error) {
        console.error("Failed to load grant management data:", error);
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Failed to load subscription tiers and addon types",
          textColor: "red",
          timeout: 5000,
        });
        setShowToaster(true);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [
    loadSubscriptionData,
    handleFetchAddOnsList,
    setToasterData,
    setShowToaster,
  ]);

  // Transform tiers data for the component
  const subscriptionTiers = tiers
    ? tiers.map((tier) => ({
        id: Number(tier.id),
        name: tier.name,
        slots: Number(tier.slots),
        price: Number(tier.price.e8s) / 100_000_000, // Convert from e8s to ICP
        features: tier.features,
      }))
    : [];

  // Transform addon types data for the component
  const addonTypes = addOnsList
    ? addOnsList.map((addon) => ({
        id: Number(addon.id),
        name: addon.name,
        type: addon.type,
        price: Number(addon.price) / 100_000_000, // Convert from e8s to ICP
        features: addon.features,
      }))
    : [];

  // Expiry duration options (in milliseconds)
  const expiryOptions = [
    { label: "1 Hour", value: 60 * 60 * 1000 },
    { label: "1 Day", value: 24 * 60 * 60 * 1000 },
    { label: "1 Week", value: 7 * 24 * 60 * 60 * 1000 },
    { label: "1 Month", value: 30 * 24 * 60 * 60 * 1000 },
    { label: "3 Months", value: 90 * 24 * 60 * 60 * 1000 },
    { label: "6 Months", value: 180 * 24 * 60 * 60 * 1000 },
    { label: "1 Year", value: 365 * 24 * 60 * 60 * 1000 },
  ];

  // Validation functions
  const validatePrincipal = (principal: string): boolean => {
    // Basic principal validation - should be a valid principal string
    return principal.length > 0 && principal.includes("-");
  };

  const validateProjectId = (projectId: number): boolean => {
    return projectId > 0;
  };

  const validateCanisterId = (canisterId: string): boolean => {
    // Basic canister ID validation - should be a valid principal string
    return canisterId.length > 0 && canisterId.includes("-");
  };

  const validateSubdomainName = (subdomain: string): boolean => {
    // Subdomain validation - alphanumeric and hyphens only, 3-63 characters
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    return (
      subdomain.length >= 3 &&
      subdomain.length <= 63 &&
      subdomainRegex.test(subdomain)
    );
  };

  // Copy to clipboard function
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
        toastStatus: false,
        toastData: "Failed to copy to clipboard",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    }
  };

  // Grant subscription handler
  const handleGrantSubscriptionSubmit = async () => {
    if (!validatePrincipal(subscriptionForm.user_principal)) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter a valid principal ID",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    setIsGrantingSubscription(true);
    try {
      const result = await handleGrantSubscription(
        subscriptionForm.user_principal,
        subscriptionForm.subscription_tier_id
      );

      if (result.status) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: result.message,
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);

        // Reset form
        setSubscriptionForm({
          user_principal: "",
          subscription_tier_id: 0,
        });
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
    } catch (error: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to grant subscription",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      setIsGrantingSubscription(false);
    }
  };

  // Freemium domain setup handler
  const handleFreemiumDomainSubmit = async () => {
    if (!validateCanisterId(freemiumDomainForm.canister_id)) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter a valid canister ID",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    if (!validateSubdomainName(freemiumDomainForm.subdomain_name)) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData:
          "Please enter a valid subdomain name (3-63 characters, alphanumeric and hyphens only)",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    setIsSettingUpDomain(true);
    try {
      // Convert string to Principal
      const { Principal } = await import("@dfinity/principal");
      const canisterPrincipal = Principal.fromText(
        freemiumDomainForm.canister_id
      );

      const result = await handleAdminSetupFreemiumDomain(
        canisterPrincipal,
        freemiumDomainForm.subdomain_name
      );

      if (result.status) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: result.message,
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);

        // Reset form
        setFreemiumDomainForm({
          canister_id: "",
          subdomain_name: "",
        });
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
    } catch (error: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to setup freemium domain",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      setIsSettingUpDomain(false);
    }
  };

  const handleConfirm = async () => {
    if (grantType === "subscription") {
      await handleGrantSubscriptionSubmit();
    } else if (grantType === "addon") {
      await handleGrantAddonSubmit();
    } else if (grantType === "freemium-domain") {
      await handleFreemiumDomainSubmit();
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  // Grant addon handler
  const handleGrantAddonSubmit = async () => {
    if (!validateProjectId(addonForm.project_id)) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter a valid project ID",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    if (addonForm.expiry_in_ms <= 0) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please select a valid expiry duration",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    setIsGrantingAddon(true);
    try {
      const result = await handleGrantAddon(
        addonForm.project_id,
        addonForm.addon_id,
        addonForm.expiry_in_ms
      );

      if (result.status) {
        setToasterData({
          headerContent: "Success",
          toastStatus: true,
          toastData: result.message,
          textColor: "green",
          timeout: 3000,
        });
        setShowToaster(true);

        // Reset form
        setAddonForm({
          project_id: 0,
          addon_id: 0,
          expiry_in_ms: 0,
        });
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
    } catch (error: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message || "Failed to grant addon",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      setIsGrantingAddon(false);
    }
  };

  // Confirmation handlers
  const handleGrantSubscriptionClick = () => {
    setGrantType("subscription");
    if (subscriptionTiers.length === 0) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Subscription tiers not loaded yet",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    const selectedTier = subscriptionTiers.find(
      (tier) => tier.id === subscriptionForm.subscription_tier_id
    );
    setShowModal(true);
  };

  const handleGrantAddonClick = () => {
    setGrantType("addon");
    if (addonTypes.length === 0) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Addon types not loaded yet",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    const selectedAddon = addonTypes.find(
      (addon) => addon.id === addonForm.addon_id
    );
    const selectedExpiry = expiryOptions.find(
      (option) => option.value === addonForm.expiry_in_ms
    );
    setShowModal(true);
    // Note: The actual modal configuration would be handled by the ConfirmationModalContext
  };

  const handleFreemiumDomainClick = () => {
    setGrantType("freemium-domain");
    if (!validateCanisterId(freemiumDomainForm.canister_id)) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter a valid canister ID first",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    if (!validateSubdomainName(freemiumDomainForm.subdomain_name)) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: "Please enter a valid subdomain name first",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    setShowModal(true);
  };

  // Show loading state while data is being fetched
  if (isLoadingData) {
    return (
      <div className="grant-management">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Grant Management
          </Typography>
          <Typography variant="body1">
            Grant subscriptions and addons to users and projects
          </Typography>
        </Box>
        <div className="admin-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Loading Grant Management Data...</h2>
            <p>Please wait while we load subscription tiers and addon types.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no data is available
  if (subscriptionTiers.length === 0 || addonTypes.length === 0) {
    return (
      <div className="grant-management">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Grant Management
          </Typography>
          <Typography variant="body1">
            Grant subscriptions and addons to users and projects
          </Typography>
        </Box>
        <div className="admin-loading">
          <div className="loading-content">
            <h2>Unable to Load Data</h2>
            <p>
              {subscriptionTiers.length === 0 && addonTypes.length === 0
                ? "Failed to load subscription tiers and addon types. Please try refreshing the page."
                : subscriptionTiers.length === 0
                ? "Failed to load subscription tiers. Please try refreshing the page."
                : "Failed to load addon types. Please try refreshing the page."}
            </p>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grant-management">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Grant Management
        </Typography>
        <Typography variant="body1">
          Grant subscriptions and addons to users and projects
        </Typography>
      </Box>

      <div className="grant-management-grid">
        {/* Grant Subscription Section */}
        <div className="grant-section">
          <Card className="grant-card">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <CreditCard sx={{ mr: 2, color: "var(--color-primary)" }} />
                <Typography variant="h5" component="h2">
                  Grant Subscription
                </Typography>
              </Box>

              <div className="grant-form-fields">
                <div className="grant-field">
                  <TextField
                    fullWidth
                    label="User Principal ID"
                    value={subscriptionForm.user_principal}
                    onChange={(e) =>
                      setSubscriptionForm((prev) => ({
                        ...prev,
                        user_principal: e.target.value,
                      }))
                    }
                    placeholder="Enter user principal ID"
                    error={
                      subscriptionForm.user_principal.length > 0 &&
                      !validatePrincipal(subscriptionForm.user_principal)
                    }
                    helperText={
                      subscriptionForm.user_principal.length > 0 &&
                      !validatePrincipal(subscriptionForm.user_principal)
                        ? "Invalid principal format"
                        : ""
                    }
                    InputProps={{
                      endAdornment: subscriptionForm.user_principal && (
                        <InputAdornment position="end">
                          <Tooltip title="Copy Principal">
                            <IconButton
                              onClick={() =>
                                handleCopyToClipboard(
                                  subscriptionForm.user_principal
                                )
                              }
                              edge="end"
                            >
                              <ContentCopy />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                </div>

                <div className="grant-field">
                  <FormControl fullWidth>
                    <InputLabel>Subscription Tier</InputLabel>
                    <Select
                      value={subscriptionForm.subscription_tier_id}
                      onChange={(e) =>
                        setSubscriptionForm((prev) => ({
                          ...prev,
                          subscription_tier_id: Number(e.target.value),
                        }))
                      }
                      label="Subscription Tier"
                    >
                      {subscriptionTiers.map((tier) => (
                        <MenuItem key={tier.id} value={tier.id}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                            }}
                          >
                            <Typography variant="body1" fontWeight="bold">
                              {tier.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {tier.slots} slots • ${tier.price}/month
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                {/* Selected Tier Details */}
                {subscriptionForm.subscription_tier_id !== undefined && (
                  <div className="grant-field">
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {
                          subscriptionTiers.find(
                            (tier) =>
                              tier.id === subscriptionForm.subscription_tier_id
                          )?.name
                        }{" "}
                        Tier Details:
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {subscriptionTiers
                          .find(
                            (tier) =>
                              tier.id === subscriptionForm.subscription_tier_id
                          )
                          ?.features.map((feature, index) => (
                            <Chip
                              key={index}
                              label={feature}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                      </Box>
                    </Alert>
                  </div>
                )}

                <div className="grant-field">
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleGrantSubscriptionClick}
                    disabled={
                      !subscriptionForm.user_principal ||
                      !validatePrincipal(subscriptionForm.user_principal) ||
                      isGrantingSubscription ||
                      subscriptionTiers.length === 0
                    }
                    startIcon={<Add />}
                    sx={{ py: 1.5 }}
                  >
                    {isGrantingSubscription
                      ? "Granting..."
                      : "Grant Subscription"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grant Addon Section */}
        <div className="grant-section">
          <Card className="grant-card">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Extension sx={{ mr: 2, color: "var(--color-primary)" }} />
                <Typography variant="h5" component="h2">
                  Grant Addon
                </Typography>
              </Box>

              <div className="grant-form-fields">
                <div className="grant-field">
                  <TextField
                    fullWidth
                    label="Project ID"
                    type="number"
                    value={addonForm.project_id || ""}
                    onChange={(e) =>
                      setAddonForm((prev) => ({
                        ...prev,
                        project_id: Number(e.target.value),
                      }))
                    }
                    placeholder="Enter project ID"
                    error={
                      addonForm.project_id > 0 &&
                      !validateProjectId(addonForm.project_id)
                    }
                    helperText={
                      addonForm.project_id > 0 &&
                      !validateProjectId(addonForm.project_id)
                        ? "Project ID must be greater than 0"
                        : ""
                    }
                  />
                </div>

                <div className="grant-field">
                  <FormControl fullWidth>
                    <InputLabel>Addon Type</InputLabel>
                    <Select
                      value={addonForm.addon_id}
                      onChange={(e) =>
                        setAddonForm((prev) => ({
                          ...prev,
                          addon_id: Number(e.target.value),
                        }))
                      }
                      label="Addon Type"
                    >
                      {addonTypes.map((addon) => (
                        <MenuItem key={addon.id} value={addon.id}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                            }}
                          >
                            <Typography variant="body1" fontWeight="bold">
                              {addon.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              ${addon.price} • {addon.type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                <div className="grant-field">
                  <FormControl fullWidth>
                    <InputLabel>Expiry Duration</InputLabel>
                    <Select
                      value={addonForm.expiry_in_ms}
                      onChange={(e) =>
                        setAddonForm((prev) => ({
                          ...prev,
                          expiry_in_ms: Number(e.target.value),
                        }))
                      }
                      label="Expiry Duration"
                    >
                      {expiryOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </div>

                {/* Selected Addon Details */}
                {addonForm.addon_id !== undefined && (
                  <div className="grant-field">
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {
                          addonTypes.find(
                            (addon) => addon.id === addonForm.addon_id
                          )?.name
                        }{" "}
                        Details:
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {addonTypes
                          .find((addon) => addon.id === addonForm.addon_id)
                          ?.features.map((feature, index) => (
                            <Chip
                              key={index}
                              label={feature}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                      </Box>
                    </Alert>
                  </div>
                )}

                <div className="grant-field">
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleGrantAddonClick}
                    disabled={
                      !validateProjectId(addonForm.project_id) ||
                      addonForm.expiry_in_ms <= 0 ||
                      isGrantingAddon ||
                      addonTypes.length === 0
                    }
                    startIcon={<Add />}
                    sx={{ py: 1.5 }}
                  >
                    {isGrantingAddon ? "Granting..." : "Grant Addon"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Freemium Domain Setup Section */}
        <div className="grant-section">
          <Card className="grant-card">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Language sx={{ mr: 2, color: "var(--color-primary)" }} />
                <Typography variant="h5" component="h2">
                  Freemium Domain
                </Typography>
              </Box>

              <div className="grant-form-fields">
                <div className="grant-field">
                  <TextField
                    fullWidth
                    label="Canister ID"
                    value={freemiumDomainForm.canister_id}
                    onChange={(e) =>
                      setFreemiumDomainForm((prev) => ({
                        ...prev,
                        canister_id: e.target.value,
                      }))
                    }
                    placeholder="Enter canister principal ID"
                    error={
                      freemiumDomainForm.canister_id.length > 0 &&
                      !validateCanisterId(freemiumDomainForm.canister_id)
                    }
                    helperText={
                      freemiumDomainForm.canister_id.length > 0 &&
                      !validateCanisterId(freemiumDomainForm.canister_id)
                        ? "Invalid canister ID format"
                        : ""
                    }
                    InputProps={{
                      endAdornment: freemiumDomainForm.canister_id && (
                        <InputAdornment position="end">
                          <Tooltip title="Copy Canister ID">
                            <IconButton
                              onClick={() =>
                                handleCopyToClipboard(
                                  freemiumDomainForm.canister_id
                                )
                              }
                              edge="end"
                            >
                              <ContentCopy />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    }}
                  />
                </div>

                <div className="grant-field">
                  <TextField
                    fullWidth
                    label="Subdomain Name"
                    value={freemiumDomainForm.subdomain_name}
                    style={{ color: "var(--text-primary) !important" }}
                    onChange={(e) =>
                      setFreemiumDomainForm((prev) => ({
                        ...prev,
                        subdomain_name: e.target.value.toLowerCase(),
                      }))
                    }
                    placeholder="Enter subdomain name (e.g., myapp)"
                    error={
                      freemiumDomainForm.subdomain_name.length > 0 &&
                      !validateSubdomainName(freemiumDomainForm.subdomain_name)
                    }
                    helperText={
                      freemiumDomainForm.subdomain_name.length > 0 &&
                      !validateSubdomainName(freemiumDomainForm.subdomain_name)
                        ? "Invalid subdomain format (3-63 chars, alphanumeric and hyphens only)"
                        : "Will be accessible at: yoursubdomain.ic0.app"
                    }
                  />
                </div>

                {/* Domain Preview */}
                {freemiumDomainForm.subdomain_name &&
                  validateSubdomainName(freemiumDomainForm.subdomain_name) && (
                    <div className="grant-field">
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Domain Preview:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {freemiumDomainForm.subdomain_name}.worldcloud.app
                        </Typography>
                      </Alert>
                    </div>
                  )}

                <div className="grant-field">
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleFreemiumDomainClick}
                    disabled={
                      !validateCanisterId(freemiumDomainForm.canister_id) ||
                      !validateSubdomainName(
                        freemiumDomainForm.subdomain_name
                      ) ||
                      isSettingUpDomain
                    }
                    startIcon={<Language />}
                    sx={{ py: 1.5 }}
                  >
                    {isSettingUpDomain ? "Setting up..." : "Setup Domain"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Section */}
      <Box sx={{ mt: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Typography
              variant="body2"
              style={{ color: "var(--text-primary) !important" }}
              sx={{ mb: 3 }}
            >
              Common administrative operations
            </Typography>

            <div className="quick-actions-grid">
              <div className="quick-action-item">
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => {
                    setSubscriptionForm({
                      user_principal: "",
                      subscription_tier_id: 0,
                    });
                    setAddonForm({
                      project_id: 0,
                      addon_id: 0,
                      expiry_in_ms: 0,
                    });
                    setFreemiumDomainForm({
                      canister_id: "",
                      subdomain_name: "",
                    });
                  }}
                >
                  Reset Forms
                </Button>
              </div>
              <div className="quick-action-item">
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Person />}
                  onClick={() => {
                    // Generate a random principal for testing
                    const randomPrincipal = "rdmx6-jaaaa-aaaaa-aaadq-cai";
                    setSubscriptionForm((prev) => ({
                      ...prev,
                      user_principal: randomPrincipal,
                    }));
                  }}
                >
                  Fill Test Principal
                </Button>
              </div>
              <div className="quick-action-item">
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CheckCircle />}
                  onClick={() => {
                    setAddonForm((prev) => ({ ...prev, project_id: 1 }));
                  }}
                >
                  Fill Test Project ID
                </Button>
              </div>
              <div className="quick-action-item">
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Language />}
                  onClick={() => {
                    setFreemiumDomainForm((prev) => ({
                      ...prev,
                      canister_id: "rdmx6-jaaaa-aaaaa-aaadq-cai",
                      subdomain_name: "testapp",
                    }));
                  }}
                >
                  Fill Test Domain
                </Button>
              </div>
              <div className="quick-action-item">
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Warning />}
                  color="warning"
                  onClick={() => {
                    setToasterData({
                      headerContent: "Info",
                      toastStatus: true,
                      toastData: "Bulk operations coming soon!",
                      textColor: "blue",
                      timeout: 3000,
                    });
                    setShowToaster(true);
                  }}
                >
                  Bulk Operations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Box>

      <SimpleConfirmationModal
        show={showModal}
        title={`${grantType === "freemium-domain" ? "Setup" : "Grant"} ${
          grantType === "freemium-domain" ? "Freemium Domain" : grantType
        }`}
        message={
          grantType === "freemium-domain"
            ? `Are you sure you want to setup the domain "${freemiumDomainForm.subdomain_name}.ic0.app" for canister ${freemiumDomainForm.canister_id}?`
            : "Are you sure you want to perform this action?"
        }
        confirmText="Confirm"
        cancelText="Cancel"
        confirmButtonVariant="danger"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={
          isLoadingGrantSubscription || isLoadingGrantAddon || isSettingUpDomain
        }
      />
    </div>
  );
};

export default GrantManagement;
