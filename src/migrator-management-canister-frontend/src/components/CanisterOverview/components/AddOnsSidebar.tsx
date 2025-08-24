import React from "react";
import ExtensionIcon from "@mui/icons-material/Extension";
import InfoIcon from "@mui/icons-material/Info";
import SecurityIcon from "@mui/icons-material/Security";
import PaymentIcon from "@mui/icons-material/Payment";
import SupportIcon from "@mui/icons-material/Support";
import ScheduleIcon from "@mui/icons-material/Schedule";
import "./AddOnsSidebar.css";
import { AddonView } from "./AddonSelector";

interface AddOnsSidebarProps {
  currentView: AddonView;
}

export const AddOnsSidebar: React.FC<AddOnsSidebarProps> = ({
  currentView,
}) => {
  if (currentView === "my-addons") {
    return (
      <div className="addons-sidebar">
        <div className="info-card">
          <div className="info-card-header">
            <h4>
              <ExtensionIcon className="header-icon-small" />
              My Add-ons
            </h4>
          </div>
          <div className="info-content">
            <div className="tip-item">
              <div className="tip-icon">
                <SecurityIcon />
              </div>
              <div className="tip-content">
                <h5>Active Services</h5>
                <p>
                  View and manage your currently active add-on services and
                  their subscription status.
                </p>
              </div>
            </div>

            <div className="tip-item">
              <div className="tip-icon">
                <ScheduleIcon />
              </div>
              <div className="tip-content">
                <h5>Expiry Management</h5>
                <p>
                  Keep track of when your add-ons expire and renew them before
                  they become inactive.
                </p>
              </div>
            </div>

            <div className="tip-item">
              <div className="tip-icon">
                <InfoIcon />
              </div>
              <div className="tip-content">
                <h5>Service Details</h5>
                <p>
                  Access detailed information about each add-on including
                  creation dates and usage statistics.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-header">
            <h4>
              <InfoIcon className="header-icon-small" />
              Quick Actions
            </h4>
          </div>
          <div className="info-content">
            <div className="process-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h5>Monitor Status</h5>
                <p>
                  Check the status of your active add-ons and identify any that
                  need attention
                </p>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h5>Track Expiry</h5>
                <p>
                  Monitor expiration dates and plan renewals to avoid service
                  interruptions
                </p>
              </div>
            </div>

            <div className="process-step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h5>Manage Services</h5>
                <p>
                  View detailed information and manage your add-on subscriptions
                  efficiently
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="addons-sidebar">
      <div className="info-card">
        <div className="info-card-header">
          <h4>
            <ExtensionIcon className="header-icon-small" />
            About Add-ons
          </h4>
        </div>
        <div className="info-content">
          <div className="tip-item">
            <div className="tip-icon">
              <SecurityIcon />
            </div>
            <div className="tip-content">
              <h5>Enhanced Security</h5>
              <p>
                Add-ons provide additional security features and domain
                management capabilities for your projects.
              </p>
            </div>
          </div>

          <div className="tip-item">
            <div className="tip-icon">
              <PaymentIcon />
            </div>
            <div className="tip-content">
              <h5>Flexible Pricing</h5>
              <p>
                Pay only for what you need with our flexible pricing model.
                Credits are deducted from your account balance.
              </p>
            </div>
          </div>

          <div className="tip-item">
            <div className="tip-icon">
              <SupportIcon />
            </div>
            <div className="tip-content">
              <h5>24/7 Support</h5>
              <p>
                Get dedicated support for all add-on services with priority
                assistance for paid subscribers.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="info-card-header">
          <h4>
            <InfoIcon className="header-icon-small" />
            How It Works
          </h4>
        </div>
        <div className="info-content">
          <div className="process-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h5>Select Service</h5>
              <p>
                Choose from our available add-on services based on your project
                requirements
              </p>
            </div>
          </div>

          <div className="process-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h5>Payment</h5>
              <p>
                Pay using your account credits or deposit ICP to purchase the
                service
              </p>
            </div>
          </div>

          <div className="process-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h5>Activation</h5>
              <p>
                Your add-on service will be activated immediately after
                successful payment
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="info-card-header">
          <h4>
            <ScheduleIcon className="header-icon-small" />
            Coming Soon
          </h4>
        </div>
        <div className="info-content">
          <div className="coming-soon-item">
            <div className="coming-soon-icon">
              <ScheduleIcon />
            </div>
            <div className="coming-soon-content">
              <h5>Advanced Analytics</h5>
              <p>
                Real-time performance metrics, user behavior tracking, and
                custom dashboards for deep insights into your applications.
              </p>
              <span className="release-timeline">Q2 2025</span>
            </div>
          </div>

          <div className="coming-soon-item">
            <div className="coming-soon-icon">
              <ScheduleIcon />
            </div>
            <div className="coming-soon-content">
              <h5>Multi-Region Deployment</h5>
              <p>
                Global CDN distribution with region-specific optimization and
                automatic failover for maximum performance and reliability.
              </p>
              <span className="release-timeline">Q3 2025</span>
            </div>
          </div>

          <div className="coming-soon-note">
            <p>
              <strong>Note:</strong> Coming soon features are marked with a
              special badge and estimated release dates. These services are
              currently in development and will be available for purchase once
              released.
            </p>
          </div>
        </div>
      </div>

      <div className="info-card">
        <div className="info-card-header">
          <h4>
            <InfoIcon className="header-icon-small" />
            Service Details
          </h4>
        </div>
        <div className="info-content">
          <div className="service-detail">
            <h5>Domain Registration</h5>
            <p>
              Register custom domains with advanced DNS management and SSL
              certificates included.
            </p>
          </div>

          <div className="service-detail">
            <h5>Subdomain Services</h5>
            <p>
              Get professional subdomains on worldcloud.app with automatic
              configuration and monitoring.
            </p>
          </div>

          <div className="service-detail">
            <h5>Premium Support</h5>
            <p>
              Access to priority support channels and dedicated account managers
              for enterprise needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
