import { Skeleton } from "@mui/material";
import "./LoadingView.css";

interface LoadingViewProps {
  type?: "default" | "billing" | "deployment";
  gridColumns?: number;
  gridItems?: number;
  headerSize?: "small" | "medium" | "large";
  showCta?: boolean;
}

const LoadingView: React.FC<LoadingViewProps> = ({
  type = "default",
  gridColumns = 4,
  gridItems = 4,
  headerSize = "medium",
  showCta = true,
}) => {
  // Header size mappings
  const headerSizes = {
    small: { title: "30%", subtitle: "40%" },
    medium: { title: "40%", subtitle: "50%" },
    large: { title: "50%", subtitle: "60%" },
  };

  return (
    <div className="beta-test-section">
      <div className="container">
        <div className="canister-deployer">
          {/* Header Skeleton */}
          <div className="header">
            <Skeleton
              variant="text"
              width={headerSizes[headerSize].title}
              height={60}
              sx={{ margin: "0 auto" }}
            />
            <Skeleton
              variant="text"
              width={headerSizes[headerSize].subtitle}
              height={24}
              sx={{ margin: "0.5rem auto" }}
            />
          </div>

          {/* Info Grid Skeleton */}
          <div
            className="info-grid"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
            }}
          >
            {Array(gridItems)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="info-card">
                  {type === "billing" ? (
                    // Billing card layout
                    <>
                      <Skeleton
                        variant="text"
                        width="40%"
                        height={32}
                        sx={{ margin: "0 auto 1rem" }}
                      />
                      <Skeleton
                        variant="text"
                        width="60%"
                        height={48}
                        sx={{ margin: "0 auto" }}
                      />
                      <Skeleton
                        variant="text"
                        width="80%"
                        height={24}
                        sx={{ margin: "1rem auto" }}
                      />
                      {Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton
                            key={i}
                            variant="text"
                            width="85%"
                            height={20}
                            sx={{ margin: "0.5rem auto" }}
                          />
                        ))}
                    </>
                  ) : (
                    // Default/Deployment card layout
                    <>
                      <Skeleton
                        variant="circular"
                        width={48}
                        height={48}
                        sx={{ margin: "0 auto 1rem" }}
                      />
                      <Skeleton
                        variant="text"
                        width="80%"
                        height={28}
                        sx={{ margin: "0 auto" }}
                      />
                      <Skeleton
                        variant="text"
                        width="90%"
                        height={20}
                        sx={{ margin: "0.5rem auto" }}
                      />
                      <Skeleton
                        variant="text"
                        width="85%"
                        height={20}
                        sx={{ margin: "0.25rem auto" }}
                      />
                    </>
                  )}
                </div>
              ))}
          </div>

          {/* CTA Section Skeleton */}
          {showCta && (
            <div className="subscribe-cta">
              <Skeleton
                variant="text"
                width="30%"
                height={40}
                sx={{ margin: "0 auto 1rem" }}
              />
              <Skeleton
                variant="text"
                width="50%"
                height={24}
                sx={{ margin: "0 auto 1.5rem" }}
              />
              <Skeleton
                variant="rectangular"
                width={240}
                height={48}
                sx={{
                  margin: "0 auto",
                  borderRadius: "8px",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingView;
