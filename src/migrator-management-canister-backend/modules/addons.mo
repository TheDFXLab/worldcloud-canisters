import Types "../types";
module {
  public let addons : [Types.AddOnVariant] = [
    {
      id = 0;
      name = "WorldCloud Subdomain";
      type_ = #register_subdomain;
      expiry = #month;
      expiry_duration = 1;
      price = 50_000_000; // 0.5 icp
      features = ["Custom Subdomain Name", "Host Website on WorldCloud Domain", "Renew Monthly"];
      is_available = true;
    },
    {
      id = 0;
      name = "Private Domain";
      type_ = #register_domain;
      expiry = #month;
      expiry_duration = 1;
      price = 100_000_000; // 1 icp
      features = ["Custom Domain", "Bring Your Own Name Servers", "Renew Monthly"];
      is_available = false;
    },
  ];

  public let tiers : Types.TiersList = [
    {
      id = 0;
      name = "Basic";
      slots = 1;
      min_deposit = { e8s = 50_000_000 }; // 0.5 ICP
      price = { e8s = 0 }; // Free tier
      features = [
        "1 Canister",
        "Basic Support",
        "Manual Deployments",
        "GitHub Integration",
      ];
    },
    {
      id = 1;
      name = "Pro";
      slots = 5;
      min_deposit = { e8s = 200_000_000 }; // 2 ICP
      price = { e8s = 500_000_000 }; // 5 ICP
      features = [
        "5 Canisters",
        "Priority Support",
        "Automated Deployments",
        "Custom Domains",
        "Deployment History",
        "Advanced Analytics",
      ];
    },
    {
      id = 2;
      name = "Enterprise";
      slots = 25;
      min_deposit = { e8s = 500_000_000 }; // 5 ICP
      price = { e8s = 2_500_000_000 }; // 25 ICP
      features = [
        "25 Canisters",
        "24/7 Support",
        "Team Management",
        "Advanced Analytics",
        "Priority Queue",
        "Custom Branding",
        "API Access",
      ];
    },
    {
      id = 3;
      name = "Freemium";
      slots = 1;
      min_deposit = { e8s = 0 };
      price = { e8s = 0 }; // Free tier
      features = [
        "1 Canister",
        "Manual Deployments",
        "GitHub Integration",
        "4hrs Demo Hosting Trial",
        "3 Free Trials per day",
      ];
    },
  ];
};
