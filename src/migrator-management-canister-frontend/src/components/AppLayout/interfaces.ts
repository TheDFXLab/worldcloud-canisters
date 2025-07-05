import { Principal } from "@dfinity/principal";
import { SerializedDeployment, DeserializedDeployment } from "../../utility/principal";

export type CanisterDeploymentStatus =
    | "uninitialized"
    | "installing"
    | "installed"
    | "failed";

// Re-export the deployment types
export type { SerializedDeployment, DeserializedDeployment };
export type Deployment = DeserializedDeployment;