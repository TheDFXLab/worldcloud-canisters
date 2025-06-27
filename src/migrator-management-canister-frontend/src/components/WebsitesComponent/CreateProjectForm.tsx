import React, { useState } from "react";
import "./CreateProjectForm.css";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext/SubscriptionContext";
import { useToaster } from "../../context/ToasterContext/ToasterContext";
import MainApi, { PlanType } from "../../api/main";
import { useIdentity } from "../../context/IdentityContext/IdentityContext";
import { useHttpAgent } from "../../context/HttpAgentContext/HttpAgentContext";
import { useLoaderOverlay } from "../../context/LoaderOverlayContext/LoaderOverlayContext";
import { useLoadBar } from "../../context/LoadBarContext/LoadBarContext";

const MAX_TAGS = 5;
const MAX_DESC = 100;

const planOptions = [
  { label: "Freemium", value: "freemium" },
  { label: "Paid", value: "paid" },
];

const CreateProjectForm: React.FC = () => {
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [plan, setPlan] = useState("freemium");
  const [error, setError] = useState("");
  const { setShowToaster, setToasterData } = useToaster();
  const { summon, destroy } = useLoaderOverlay();
  const { setShowLoadBar, setCompleteLoadBar } = useLoadBar();
  const { identity } = useIdentity();
  const { agent } = useHttpAgent();

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
  const handleSubmit = async (e: React.FormEvent) => {
    console.log(`SUbmiting..`);
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

    console.log(`Creating project...`, {
      projectName,
      description,
      tags,
      plan: `#${plan}`,
    });
    // TODO: Next step in deployment flow

    if (!agent) {
      console.log(`HttpAgent not initialized, relog.`);
      return;
    }

    try {
      summon("Creating Project...");
      setShowLoadBar(true);
      const mainApi = await MainApi.create(identity, agent);
      const create_res = await mainApi?.createProject(
        projectName,
        description,
        tags,
        plan as PlanType
      );
      console.log(`Created project: `, create_res);
      navigate(`/dashboard/deploy/${create_res?.canister_id}`);
    } catch (error) {
      console.error(`Failed to create project.`, error);
      setToasterData({
        headerContent: "Error",
        toastData: `Failed to create project. Please try again.`,
        toastStatus: false,
        timeout: 3000,
      });
      setShowToaster(true);
      return;
    } finally {
      setCompleteLoadBar(true);
      destroy();
    }
  };

  const isPaidPlan = plan === "paid";
  const isFreemiumUser = !!subscription && Number(subscription.tier_id) === 3;
  const disableSubmit = isPaidPlan && isFreemiumUser;

  return (
    <div className="create-project-page">
      <div className="create-project-card">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>Create New Project</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Project Name<span className="required">*</span>
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
          {error && <div className="form-error">{error}</div>}
          {disableSubmit && (
            <div className="form-error">
              You need a paid plan to create a paid project.{" "}
              <a href="/dashboard/billing">Upgrade your plan</a>
            </div>
          )}
          <button
            className="submit-btn"
            type="submit"
            disabled={false}
            // {
            //   disableSubmit ||
            //   !projectName.trim() || description.length > MAX_DESC
            // }
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectForm;
