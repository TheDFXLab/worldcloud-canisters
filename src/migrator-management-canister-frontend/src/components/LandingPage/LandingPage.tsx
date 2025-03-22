import { useNavigate } from "react-router-dom";
import "./LandingPage.css";
import { useEffect, useRef, useState } from "react";
import Footer from "../Footer/Footer";
import { useTheme } from "../../context/ThemeContext/ThemeContext";
import GitHubIcon from "@mui/icons-material/GitHub";
import reactLogo from "../../../assets/images/reactLogo.svg";
// import reactLogoDark from "../../../assets/images/reactLogo.png";
import vueLogo from "../../../assets/images/vueLogo.png";
import angularLogo from "../../../assets/images/angularLogo.png";
import { usePricing } from "../../context/PricingContext/PricingContext";
import { Spinner } from "react-bootstrap";
import NonSubbed from "../BillingPage/NonSubbed/NonSubbed";

function LandingPage() {
  const navigate = useNavigate();
  const mouseTrailRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0); // handle navbar visibility on scroll
  const { logo, isDarkMode } = useTheme();
  const handleLaunchApp = () => {
    navigate("/dashboard");
  };
  const { tiers } = usePricing();

  useEffect(() => {
    // Mouse trail effect
    const particles: HTMLDivElement[] = [];
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "mouse-particle";
      document.body.appendChild(particle);
      particles.push(particle);
    }

    let mouseX = 0;
    let mouseY = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    document.addEventListener("mousemove", handleMouseMove);

    // Intersection Observer for step animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".step").forEach((step) => {
      observer.observe(step);
    });

    // Animate particles
    let animationFrame: number;
    const animateParticles = () => {
      const dx = mouseX - prevMouseX;
      const dy = mouseY - prevMouseY;
      const speed = Math.sqrt(dx * dx + dy * dy);

      particles.forEach((particle, i) => {
        const x = mouseX - dx * (i / particleCount);
        const y = mouseY - dy * (i / particleCount);
        const size = Math.max(3, Math.min(10, speed));

        particle.style.transform = `translate(${x}px, ${y}px)`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.opacity = `${1 - i / particleCount}`;
      });

      prevMouseX = mouseX;
      prevMouseY = mouseY;
      animationFrame = requestAnimationFrame(animateParticles);
    };

    animateParticles();

    const container = document.querySelector(".hero .container") as HTMLElement;

    const handleMouseMoveContainer = (e: MouseEvent) => {
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Update the flashlight position
      container.style.setProperty("--mouse-x", `${x}px`);
      container.style.setProperty("--mouse-y", `${y}px`);

      const spotlight = container.querySelector("::after") as HTMLElement;
      if (spotlight) {
        spotlight.style.left = `${x}px`;
        spotlight.style.top = `${y}px`;
      }
    };

    if (container) {
      container.addEventListener("mousemove", handleMouseMoveContainer);
    }

    const navLinks = document.querySelectorAll(".nav-links a");

    navLinks.forEach((link) => {
      link.addEventListener("mousemove", (e: Event) => {
        const mouseEvent = e as MouseEvent;
        const rect = (link as HTMLElement).getBoundingClientRect();
        const x = mouseEvent.clientX - rect.left;
        const y = mouseEvent.clientY - rect.top;

        (link as HTMLElement).style.setProperty("--mouse-x", `${x}px`);
        (link as HTMLElement).style.setProperty("--mouse-y", `${y}px`);
      });
    });

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrame);
      particles.forEach((particle) => particle.remove());
      observer.disconnect();
      if (container) {
        container.removeEventListener("mousemove", handleMouseMoveContainer);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const navLinks = document.querySelector(".nav-links");
      const hamburger = document.querySelector(".hamburger");

      if (
        isMenuOpen &&
        navLinks &&
        hamburger &&
        !navLinks.contains(event.target as Node) &&
        !hamburger.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const controlNavbar = () => {
      const navContainer = document.querySelector(".nav-container");
      if (!navContainer) return;

      if (window.scrollY > lastScrollY) {
        // scrolling down
        navContainer.classList.add("nav-hidden");
        navContainer.classList.remove("nav-visible");
      } else {
        // scrolling up
        navContainer.classList.add("nav-visible");
        navContainer.classList.remove("nav-hidden");
      }

      setLastScrollY(window.scrollY);
    };

    // Add some debouncing to avoid too many updates
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(controlNavbar, 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [lastScrollY]);

  return (
    <div id="main" className="landing-page">
      <div className="nav-container">
        <nav className="navbar">
          <button
            className="hamburger"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <span>☰</span>
          </button>
          <div className="container">
            <div className="logo-container">
              <div className="logo">
                <img src={logo}></img>

                <a href="#main">
                  <span className="logo-text-parent">
                    <span className="logo-text-child">World</span>
                    <span className="logo-text-child">{"("}</span>
                    <span className="logo-text-child">cloud</span>
                    <span className="logo-text-child">{" )"}</span>
                    <span className="logo-text-child">{";"}</span>
                    <span className="logo-text-child beta-text">{" beta"}</span>
                  </span>
                </a>
              </div>
            </div>

            <div className={`nav-links ${isMenuOpen ? "active" : ""}`}>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#pricing">Pricing</a>
              {/* <a href="#docs">Documentation</a> */}
              <a href="/dashboard" className="action-button">
                Launch App
              </a>
            </div>
          </div>
        </nav>
      </div>

      <section className="hero">
        <div className="hero-shapes">
          <div className="hero-shape"></div>
          <div className="hero-shape"></div>
          <div className="hero-shape"></div>
        </div>
        <div className="container">
          <h1>Seamless Website Migration</h1>
          <p>
            Deploy and manage your websites to the Internet Computer with a
            click of a button. Experience the future of web hosting with
            unparalleled security and scalability.
          </p>
          <a href="#beta" className="hero-cta">
            Get Started
          </a>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <div className="features-shapes">
            <div className="feature-shape"></div>
            <div className="feature-shape"></div>
            <div className="feature-shape"></div>
          </div>
          <h2>Why use WORLDCLOUD?</h2>
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

      <section>
        <div className="tech-stack">
          <div className="icon-container">
            <GitHubIcon className="icon" />
            <img
              className="icon"
              src={isDarkMode ? reactLogo : reactLogo}
            ></img>
            <img className="icon" src={vueLogo}></img>
            <img className="icon" src={angularLogo}></img>
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
              <p>
                Build your frontend app with GitHub or upload your static files
              </p>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <h3>Deploy</h3>
              <p>Launch your website canister with one click</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-container">
        <h2>Pricing</h2>
        <div>
          {tiers ? (
            <NonSubbed
              hideButtons={true}
              subscription={null}
              tiers={tiers}
              handleSelectPlan={() => {}}
              pricingState={[false, () => {}]}
            />
          ) : (
            <Spinner />
          )}
        </div>
      </section>

      <section id="beta">
        <div className="container">
          <div className="hero-shapes">
            <div className="hero-shape"></div>
            <div className="hero-shape"></div>
            <div className="hero-shape"></div>
          </div>
          <h2>Try Our Beta</h2>
          <p className="section-description">
            Experience the future of canister deployment. Join our beta testing
            program.
          </p>
          <button onClick={handleLaunchApp}>Launch App</button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default LandingPage;
