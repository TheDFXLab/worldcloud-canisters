import React, { useEffect, useRef, useState } from "react";
import "./CreateProjectForm.css";
import { useNavigate } from "react-router-dom";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import { PlanType } from "../../api/main";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useLoadBar } from "../../context/LoadBarContext/LoadBarContext";
import { useProgress } from "../../context/ProgressBarContext/ProgressBarContext";
import { Principal } from "@dfinity/principal";
import { useDeployments } from "../../context/DeploymentContext/DeploymentContext";
import { useDispatch, useSelector } from "react-redux";
import { createProject, deployProject } from "../../state/slices/projectsSlice";
import { AppDispatch, RootState } from "../../state/store";
import MainApi from "../../api/main";
import { validateSubscription } from "../../state/slices/subscriptionSlice";
import { useFreemiumLogic } from "../../hooks/useFreemiumLogic";
import { useActionBar } from "../../context/ActionBarContext/ActionBarContext";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import { setSelectedDeployment } from "../../state/slices/deploymentSlice";
import { serializeDeployment } from "../../utility/principal";

const MAX_TAGS = 5;
const MAX_DESC = 100;

const planOptions = [
  { label: "Freemium", value: "freemium" },
  { label: "Paid", value: "paid" },
];

const useAppDispatch = () => useDispatch<AppDispatch>();

interface CreateProjectFormProps {
  onProjectCreated?: (e: any, data: any) => Promise<void>;
}

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({
  onProjectCreated,
}) => {
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [plan, setPlan] = useState("freemium");
  const [error, setError] = useState("");

  const formRef = useRef<HTMLFormElement>(null);

  // Redux selectors
  const { subscription, tiers, isLoadingSub, isLoadingTiers } = useSelector(
    (state: RootState) => state.subscription
  );

  const { fetchUsage } = useFreemiumLogic();
  const { setShowToaster, setToasterData } = useToaster();
  const { summon, destroy } = useLoaderOverlay();
  const { setShowLoadBar, setCompleteLoadBar } = useLoadBar();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();
  const { setIsLoadingProgress, setIsEnded } = useProgress();
  const { addDeployment, refreshDeployments } = useDeployments();
  const { setActionBar } = useActionBar();

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < MAX_TAGS) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  useEffect(() => {
    setActionBar({
      icon: <CreateNewFolderIcon />,
      text: projectName
        ? "Continue to code deployment."
        : "Enter a project name to continue.",
      buttonText: "Create Project",
      onButtonClick: () => {
        // // Find and click the form's submit button
        // const submitButton = document.querySelector<HTMLButtonElement>(
        //   "#project-submit-btn"
        // );
        // if (submitButton) {
        //   submitButton.click();
        // }
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      },
      isButtonDisabled: projectName.length === 0,
      isHidden: false,
    });
  }, [projectName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disableSubmit) {
      setToasterData({
        headerContent: "Warning",
        toastData: "Paid subscription required.",
        toastStatus: false,
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }
    if (!projectName.trim()) {
      setToasterData({
        headerContent: "Warning",
        toastData: "Project name is required.",
        toastStatus: false,
        timeout: 3000,
      });
      setShowToaster(true);
      setError("Project name is required.");
      return;
    }
    if (description.length > MAX_DESC) {
      setError(`Description must be at most ${MAX_DESC} characters.`);
      setToasterData({
        headerContent: "Warning",
        toastData: `Description must be at most ${MAX_DESC} characters.`,
        toastStatus: false,
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    }

    if (!agent) {
      console.log(`HttpAgent not initialized, relog.`);
      return;
    }

    try {
      summon("Creating Project...");
      setShowLoadBar(true);
      const result = await dispatch(
        createProject({
          identity,
          agent,
          name: projectName,
          description,
          tags,
          plan: plan as PlanType,
        })
      ).unwrap();

      // Use the callback when used as a component
      if (onProjectCreated) {
        await onProjectCreated(e, result.newProject);
      } else {
        // Otherwise, use handle deploy function directly
        await handleDeploy(
          BigInt(result.newProject.id),
          "freemium" in result.newProject.plan
        );
      }
    } catch (error) {
      console.error(`Failed to create project.`, error);
      setToasterData({
        headerContent: "Error",
        toastData: `Failed to create project. Please try again.`,
        toastStatus: false,
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      setCompleteLoadBar(true);
      destroy();
    }
  };

  const handleDeploy = async (projectId: bigint, isFreemium: boolean) => {
    try {
      let message: string = "";
      let title: string = "";
      if (isFreemium) {
        title = "Requesting";
        message = "Allocating freemium slot to project...";
      } else {
        title = "Deploying";
        message = "Canister deployment in progress...";
      }

      summon(message);
      setIsLoadingProgress(true);
      setIsEnded(false);
      setToasterData({
        headerContent: title,
        toastStatus: true,
        toastData: message,
        textColor: "green",
      });
      setShowToaster(true);
      const result = await dispatch(
        deployProject({
          identity,
          agent,
          projectId,
          isFreemium,
          validateSubscription: async () => {
            const validation = await dispatch(
              validateSubscription({ subscription, tiers })
            ).unwrap();
            return validation;
          },
        })
      ).unwrap();

      const newDeployment = {
        canister_id: Principal.fromText(result.canisterId),
        status: "uninitialized" as const,
        date_created: Date.now(),
        date_updated: Date.now(),
        size: 0,
      };

      setToasterData({
        headerContent: "Success",
        toastStatus: true,
        toastData: `Canister ID: ${result.canisterId}`,
        textColor: "green",
      });
      setShowToaster(true);
      // addDeployment(newDeployment);
      setSelectedDeployment(serializeDeployment(newDeployment));
      refreshDeployments(Number(projectId));

      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate(`/dashboard/projects`);
    } catch (error: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: true,
        toastData: `Error: ${error.message}`,
        textColor: "red",
        timeout: 5000,
      });
      setShowToaster(true);
      if (error.message.includes("subscription")) {
        navigate("/dashboard/billing");
      }
    } finally {
      setIsLoadingProgress(false);
      setIsEnded(true);
      destroy();
    }
  };

  const isPaidPlan = plan === "paid";
  const isFreemiumUser = !!subscription && Number(subscription.tier_id) === 3;
  const disableSubmit = isPaidPlan && isFreemiumUser;

  return (
    <div className="create-project-page">
      <div className="project-header">
        {!onProjectCreated && (
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
        )}
        <p>
          Projects let you quickly build and deploy scalable web applications on
          the Internet Computer. After creating a project, you will be prompted
          to connect your Github account to start building and deploying your
          web application.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="project-form-grid">
          <div className="project-form-card">
            <h3>Project Details</h3>
            <label>
              <span>
                Project Name<span className="required">*</span>
              </span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                maxLength={40}
                placeholder="Enter project name"
              />
            </label>
            <label>
              Tags (up to {MAX_TAGS})
              <div className="tags-input-row">
                {tags.map((tag) => (
                  <span className="tag-chip" key={tag}>
                    {tag}
                    <button
                      type="button"
                      className="remove-tag"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {tags.length < MAX_TAGS && (
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add tag"
                    maxLength={20}
                  />
                )}
                <button
                  type="button"
                  className="add-tag-btn"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= MAX_TAGS}
                >
                  Add
                </button>
              </div>
            </label>
            <label>
              Plan
              <select value={plan} onChange={(e) => setPlan(e.target.value)}>
                {planOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {plan === "freemium" &&
              subscription &&
              Number(subscription.tier_id) === 3 && (
                <div className="freemium-note">
                  You are currently on the Freemium plan.{" "}
                  <a href="/dashboard/billing">View paid plans</a>
                </div>
              )}
          </div>

          <div className="project-form-card">
            <h3>Project Description</h3>
            <label>
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={MAX_DESC}
                placeholder="Describe your project (max 100 chars)"
              />
              <span className="desc-count">
                {description.length}/{MAX_DESC}
              </span>
            </label>
          </div>
        </div>

        <div className="form-actions">
          {error && <div className="form-error">{error}</div>}
          {disableSubmit && (
            <div className="form-error">
              You need a paid plan to create a paid project.{" "}
              <a href="/dashboard/billing">Upgrade your plan</a>
            </div>
          )}
          {/* <button
            id="project-submit-btn"
            className="submit-btn"
            type="submit"
            disabled={
              disableSubmit ||
              !projectName.trim() ||
              description.length > MAX_DESC
            }
          >
            Continue
          </button> */}
        </div>
      </form>
    </div>
  );
};

export default CreateProjectForm;
