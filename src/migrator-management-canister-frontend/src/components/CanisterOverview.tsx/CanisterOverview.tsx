import { Spinner } from "react-bootstrap";
import "./CanisterOverview.css";
import { CanisterDeploymentStatus, Deployment } from "../AppLayout/interfaces";
import { backend_canister_id, getCanisterUrl } from "../../config/config";
import { useAuthority } from "../../context/AuthorityContext/AuthorityContext";
import { cyclesToTerra } from "../../utility/e8s";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import IconTextRowView from "../IconTextRowView/IconTextRowView";
import CyclesApi from "../../api/cycles";
import { Principal } from "@dfinity/principal";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useCallback, useRef, useState } from "react";
import { useLedger } from "../../context/LedgerContext/LedgerContext";
import { ConfirmationModal } from "../ConfirmationPopup/ConfirmationModal";
import MainApi from "../../api/main";
import ProjectDeployment from "../ProjectDeployment/ProjectDeployment";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { useParams } from "react-router-dom";
import { useLoadBar } from "../../context/LoadBarContext/LoadBarContext";

interface CanisterOverviewProps {}

export const CanisterOverview = ({}: CanisterOverviewProps) => {
  /** Hooks */
  const { status, refreshStatus } = useAuthority();
  const { transfer } = useLedger();
  const { identity } = useIdentity();
  const { actionBar, setActionBar } = useActionBar();
  const { toasterData, setToasterData, setShowToaster } = useToaster();
  const { canisterId, dateCreated, dateUpdated, size, canisterStatus } =
    useParams();
  const { showLoadBar, setShowLoadBar, completeLoadBar, setCompleteLoadBar } =
    useLoadBar();

  /** State */
  const isTransferringRef = useRef(false);
  const [icpToDeposit, setIcpToDeposit] = useState<string>("0");

  const [showConfirmation, setShowConfirmation] = useState(false);

  const deployment: Deployment | null = {
    canister_id: Principal.fromText(canisterId || ""),
    date_created: Number(dateCreated),
    date_updated: Number(dateUpdated),
    size: Number(size),
    status: canisterStatus
      ? (canisterStatus as CanisterDeploymentStatus)
      : "failed",
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAddCycles = useCallback(async () => {
    setShowLoadBar(true);

    // Prevent concurrent executions
    if (isTransferringRef.current) return;
    isTransferringRef.current = true;

    try {
      if (!canisterId) {
        console.log("canisterId not found");
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Canister ID not found",
          textColor: "white",
        });
        setShowToaster(true);
        return;
      }

      if (!identity) {
        console.log("identity not found");
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Identity not found",
          textColor: "white",
        });
        setShowToaster(true);
        return;
      }

      /** Transfer icp from user to backend canister */
      const amountInIcp = Number(icpToDeposit);
      const destination = backend_canister_id;
      const isTransferred = await transfer(amountInIcp, destination);

      if (!isTransferred) {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Transfer failed",
          textColor: "white",
        });
        setShowToaster(true);
        return;
      }

      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Successfully transferred ${amountInIcp} ICP.`,
        textColor: "white",
      });
      setShowToaster(true);

      const mainApi = await MainApi.create(identity);
      const isDeposited = await mainApi?.deposit();

      if (!isDeposited) {
        setToasterData({
          headerContent: "Error",
          toastStatus: false,
          toastData: "Deposit failed",
          textColor: "white",
        });
        setShowToaster(true);
        return;
      }

      /** Trigger add cycles for user's canister id*/
      const cyclesApi = new CyclesApi(Principal.fromText(canisterId), identity);

      await cyclesApi.addCycles(Principal.fromText(canisterId));
      setCompleteLoadBar(true);

      refreshStatus();
      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: "Cycles added successfully",
        textColor: "white",
      });
      setShowToaster(true);
      setCompleteLoadBar(true);
    } catch (error: any) {
      console.log("error adding cycles", error);
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: error.message,
        textColor: "white",
      });
      setShowToaster(true);
    } finally {
      isTransferringRef.current = false;
    }
  }, [identity, canisterId, setToasterData, setShowToaster]);

  if (!deployment) return <div>Loading...</div>;

  return (
    <div className="final-step">
      <ConfirmationModal
        show={showConfirmation}
        amountState={[icpToDeposit, setIcpToDeposit]}
        onHide={() => setShowConfirmation(false)}
        onConfirm={() => {
          setIcpToDeposit(icpToDeposit);
          handleAddCycles();
          setShowConfirmation(false);
        }}
        title="Add Cycles"
        message="Are you sure you want to add cycles to this canister? This will transfer 0.1 ICP."
      />

      <div className="canister-details">
        <div className="detail-row">
          <span className="label">Canister ID:</span>
          <span className="value">
            <span className="value">
              <a
                href={getCanisterUrl(canisterId || "")}
                target="_blank"
                rel="noopener noreferrer"
              >
                {canisterId}
              </a>
            </span>

            <button
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(canisterId || "")}
              title="Copy to clipboard"
            >
              📋
            </button>
          </span>
        </div>

        <div className="detail-row">
          <span className="label">Total Size:</span>
          <span className="value">{formatBytes(deployment?.size || 0)}</span>
        </div>

        <div className="detail-row">
          <span className="label">Deployed On:</span>
          <span className="value">
            {deployment?.date_created
              ? formatDate(new Date(deployment.date_created / 1000000))
              : "N/A"}
          </span>
        </div>

        <div className="detail-row">
          <span className="label">Website URL:</span>
          <span className="value">
            <a
              href={getCanisterUrl(canisterId || "")}
              target="_blank"
              rel="noopener noreferrer"
            >
              {getCanisterUrl(canisterId || "")}

              <span className="external-link">↗</span>
            </a>
          </span>
        </div>
        <div className="detail-row">
          <span className="label">Available Cycles:</span>
          <span className="value">
            {status?.cycles ? (
              <>
                {/* {`${terraToCycles(status.cycles)} T cycles`} */}

                <div onClick={() => setShowConfirmation(true)}>
                  <IconTextRowView
                    onClickIcon={() => setShowConfirmation(true)}
                    IconComponent={AddCircleOutlineIcon}
                    iconColor="green"
                    text={`${cyclesToTerra(status?.cycles || 0).toFixed(
                      2
                    )} T cycles`}
                  />
                </div>
              </>
            ) : (
              <Spinner animation="border" variant="primary" />
            )}
          </span>
        </div>
      </div>
      {deployment && deployment.status === "uninitialized" && (
        <div className="upload-section mt-4">
          <span className="label">Pending Actions:</span>
          <br />
          <span className="label">
            You have pending actions. Please upload your website files.
          </span>

          <ProjectDeployment />
        </div>
      )}
    </div>
  );
};
