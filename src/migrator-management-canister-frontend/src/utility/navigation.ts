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

export const mapRouteToKey = (pathname: string): string => {
    if (pathname.startsWith("/dashboard/admin")) {
        return "admin";
    } else if (pathname.startsWith("/dashboard/billing")) {
        return "billing";
    } else if (pathname.startsWith("/dashboard/settings")) {
        return "settings";
    } else if (pathname.startsWith("/dashboard/new-project")) {
        return "publish";
    } else if (pathname.startsWith("/dashboard/websites")) {
        return "websites";
    } else if (pathname.startsWith("/dashboard/projects")) {
        return "projects";
    } else if (pathname.startsWith("/dashboard")) {
        return "home";
    }
    return "home";
}