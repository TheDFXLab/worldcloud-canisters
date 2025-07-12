import { formatDate } from "../../../utility/formatter";
import { bigIntToDate } from "../../../utility/bigint";

interface Project {
  id: bigint;
  name: string;
  description: string;
  canister_id: string;
  plan: { freemium: null } | { paid: null };
  date_created: bigint;
  tags: string[];
}

interface ProjectInfoCardProps {
  project: Project;
  cyclesStatus: any;
}

export const ProjectInfoCard: React.FC<ProjectInfoCardProps> = ({
  project,
  cyclesStatus,
}) => {
  const getPlanDisplay = (plan: Project["plan"]) => {
    return "freemium" in plan ? "Freemium" : "Paid";
  };

  return (
    <div className="card project-details">
      <span className="card-title">Project Information</span>
      <div className="content">
        <div className="detail-row">
          <span className="label">Name:</span>
          <span className="value">{project.name}</span>
        </div>
        <div className="detail-row">
          <span className="label">Description:</span>
          <span className="value">{project.description}</span>
        </div>

        {project.canister_id && (
          <div className="detail-row">
            <span className="label">Canister ID:</span>
            <span className="value">{project.canister_id}</span>
          </div>
        )}

        {cyclesStatus && (
          <div className="detail-row">
            <span className="label">Cycles Available:</span>
            <span className="value">{cyclesStatus.cycles.toString()}</span>
          </div>
        )}

        <div className="detail-row">
          <span className="label">Plan:</span>
          <span className="value">{getPlanDisplay(project.plan)}</span>
        </div>
        <div className="detail-row">
          <span className="label">Created:</span>
          <span className="value">
            {formatDate(bigIntToDate(project.date_created))}
          </span>
        </div>
        <div className="tags">
          {project.tags.map((tag: string, index: number) => (
            <span key={index} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
