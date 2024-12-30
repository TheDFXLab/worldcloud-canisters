import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

  const handleLaunchApp = () => {
    navigate("/app");
  };

  return (
    <div id="main" className="landing-page">
      <nav className="navbar">
        <div className="container">
          <div className="logo">
            <a href="#main">INTERCLOUD</a>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#beta">App</a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <h1>Seamless Website Migration</h1>
          <p>
            Deploy and manage your websites to the Internet Computer with a
            click of a button
          </p>
          <a href="#beta" className="hero-cta">
            Get Started
          </a>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <h2>Why use INTERCLOUD?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Simple Deployment</h3>
              <p>Deploy canisters with just a few clicks</p>
            </div>
            <div className="feature-card">
              <h3>Secure Migration</h3>
              <p>Enterprise-grade security for your assets</p>
            </div>
            <div className="feature-card">
              <h3>Cost-effective</h3>
              <p>
                Website deployment to the Internet Computer for a fraction of
                the cost of traditional hosting
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Connect</h3>
              <p>Connect to your Internet Computer network</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Configure</h3>
              <p>Upload your static website files</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Deploy</h3>
              <p>Launch your website canister with one click</p>
            </div>
          </div>
        </div>
      </section>

      <section id="beta">
        <div className="container">
          <h2>Try Our Beta</h2>
          <p className="section-description">
            Experience the future of canister deployment. Join our beta testing
            program.
          </p>
          <button onClick={handleLaunchApp}>Launch App</button>
        </div>
        {/* <CanisterDeployer /> */}
      </section>
    </div>
  );
}

export default LandingPage;
