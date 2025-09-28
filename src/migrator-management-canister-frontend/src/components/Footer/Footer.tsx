import { Link } from "react-router-dom";
import "./Footer.css";
import ICPLogo from "../../../assets/images/socials/internet-computer-icp-logo.svg";

const Footer = () => {
  const currentDate = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          <Link to="/">WORLDCLOUD</Link>
        </div>
        <div className="footer-info">
          <p>
            © {currentDate} | Built by{" "}
            <a
              href="https://thedfxlab.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              TheDFXLab
            </a>
          </p>
        </div>
        <div className="footer-powered">
          <p className="powered-by">
            Powered by the Internet Computer{" "}
            <img
              src={ICPLogo}
              alt="Internet Computer Protocol"
              className="icp-logo"
            />
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
