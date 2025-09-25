export const preset_tiers = [
    {
        id: BigInt(0),
        name: "Basic",
        slots: BigInt(1),
        min_deposit: {
            e8s: BigInt(50_000_000),
        },
        price: { e8s: BigInt(0) }, // Free tier
        features: [
            "1 Canister",
            "Basic Support",
            "Manual Deployments",
            "GitHub Integration",
        ],
    },
    {
        id: BigInt(1),
        name: "Pro",
        slots: BigInt(5),
        min_deposit: { e8s: BigInt(200_000_000) }, // 2 ICP
        price: { e8s: BigInt(500_000_000) }, // 5 ICP
        features: [
            "5 Canisters",
            "Priority Support",
            "Automated Deployments",
            "Custom Domains",
            "Deployment History",
            "Advanced Analytics",
        ],
    },
    {
        id: BigInt(2),
        name: "Enterprise",
        slots: BigInt(25),
        min_deposit: { e8s: BigInt(500_000_000) }, // 5 ICP
        price: { e8s: BigInt(2_500_000_000) }, // 25 ICP
        features: [
            "25 Canisters",
            "24/7 Support",
            "Team Management",
            "Advanced Analytics",
            "Priority Queue",
            "Custom Branding",
            "API Access",
        ],
    },
    {
        id: BigInt(3),
        name: "Freemium",
        slots: BigInt(1),
        min_deposit: { e8s: BigInt(0) },
        price: { e8s: BigInt(0) }, // Free tier
        features: [
            "1 Canister",
            "Manual Deployments",
            "GitHub Integration",
            "4hrs Demo Hosting Trial",
            "3 Free Trials per day",
        ],
    },
]