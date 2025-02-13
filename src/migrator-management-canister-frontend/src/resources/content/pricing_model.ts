export interface Tier {
  name: string;
  slots: number;
  minDeposit: number;
  price: number;
  features: string[];
}

export const TIERS: Tier[] = [
  {
    name: "Basic",
    slots: 1,
    minDeposit: 0.5,    // ~$6 min deposit for cycles
    price: 0,           // Free tier
    features: [
      "1 Canister",
      "Basic Support",
      "Manual Deployments",
      "GitHub Integration"
    ]
  },
  {
    name: "Pro",
    slots: 5,
    minDeposit: 2,      // ~$24 min deposit for cycles
    price: 5,           // ~$60 one-time fee
    features: [
      "5 Canisters",
      "Priority Support",
      "Automated Deployments",
      "Custom Domains",
      "Deployment History",
      "Advanced Analytics"
    ]
  },
  {
    name: "Enterprise",
    slots: 25,
    minDeposit: 5,      // ~$60 min deposit for cycles
    price: 20,          // ~$240 one-time fee
    features: [
      "25 Canisters",
      "24/7 Support",
      "Team Management",
      "Advanced Analytics",
      "Priority Queue",
      "Custom Branding",
      "API Access"
    ]
  }
]