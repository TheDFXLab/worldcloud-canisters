import { Link } from "react-router-dom";
import "./Footer.css";

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
      </div>
    </footer>
  );
};

export default Footer;
