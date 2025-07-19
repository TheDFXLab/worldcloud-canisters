export const mapKeyToRoute = (key: string) => {
    let navigateToPath = "/";
    switch (key) {
        case "billing":
            navigateToPath = "/dashboard/billing";
            break;
        case "settings":
            navigateToPath = "/dashboard/settings";
            break;
        case "home":
            navigateToPath = "/dashboard";
            break;
        case "publish":
            navigateToPath = "/dashboard/new-project"; // Updated to use new flow
            break;
        case "websites":
            navigateToPath = "/dashboard/websites";
            break;
        case "projects":
            navigateToPath = "/dashboard/projects";
            break;
        case "admin":
            navigateToPath = "/dashboard/admin";
            break;
    }
    return navigateToPath;
}