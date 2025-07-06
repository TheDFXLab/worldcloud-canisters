import { HeaderCardData } from "../context/HeaderCardContext/HeaderCardContext";

export const mapHeaderContent = (key: string, githubUser?: any, isAdmin: boolean = false) => {
    const headerCardData: HeaderCardData = {
        title: "",
        description: "",
        className: "",
    };

    switch (key) {
        case "billing":
            headerCardData.title = "Subscription & Billing";
            headerCardData.description =
                "Manage your subscription and billing preferences.";
            break;
        case "settings":
            headerCardData.title = "Account Settings";
            headerCardData.description =
                "Manage your account preferences and connections.";
            break;
        case "home":
            headerCardData.title = "Dashboard";
            headerCardData.description = `Welcome back${githubUser?.login ? `, ${githubUser.login}.` : `.`
                }`;
            break;
        case "publish":
            headerCardData.title = "New Project";
            headerCardData.description = `Create a project to host your website.`;
            break;
        case "websites":
            headerCardData.title = "Your Websites";
            headerCardData.description = `Manage your deployed websites and canisters.`;
            break;
        case "projects":
            headerCardData.title = "Your Projects";
            headerCardData.description = `Manage your projects and deployments.`;
            break;
        case "admin":
            if (isAdmin) {
                headerCardData.title = "Admin Dashboard";
                headerCardData.description = `Priviliged operations for viewing and configuring backend data.`;
            }
            break;
    }
    console.log(`To set header card to `, headerCardData)
    return headerCardData;
};