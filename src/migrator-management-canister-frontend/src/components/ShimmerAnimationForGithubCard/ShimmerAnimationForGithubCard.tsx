import React from "react";
import "./ShimmerAnimationForGithubCard.css";

const ShimmerAnimationForGithubCard: React.FC = () => (
  <div className="shimmer-card">
    <div className="shimmer-avatar shimmer-animate" />
    <div className="shimmer-line shimmer-animate" style={{ width: "60%" }} />
    <div className="shimmer-line shimmer-animate" style={{ width: "40%" }} />
    <div className="shimmer-line shimmer-animate" style={{ width: "80%" }} />
  </div>
);

export default ShimmerAnimationForGithubCard;
