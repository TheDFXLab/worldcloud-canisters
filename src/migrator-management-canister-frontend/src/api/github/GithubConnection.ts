import { Principal } from "@dfinity/principal";
import { GithubApi } from "./GithubApi";

class GithubConnection {
    // async connectGithub(principal: Principal) {
    //     try {
    //         const githubApi = GithubApi.getInstance();

    //         const deviceCode = req.body.deviceCode;
    //         if (!deviceCode) {
    //             res.status(400).json({ status: false, data: null, error: "Device code is required", message: "Device code is required" });
    //             return;
    //         }

    //         // Request access token from github api
    //         const data = await githubApi.requestAccessToken(deviceCode);

    //         if (!data.access_token) {
    //             res.status(200).json(data);
    //             return;
    //         }


    //         let tokenEntry = await githubTokenService.getGithubToken(principal);
    //         if (!tokenEntry) {
    //             tokenEntry = await githubTokenService.createGithubToken(principal, data.access_token);
    //             if (!tokenEntry) {
    //                 res.status(500).json({ status: false, data: null, error: "Internal server error", message: "Internal server error" });
    //                 return;
    //             }
    //         }


    //         const githubService = new GithubService(getRepositories().deploymentRepository);

    //         // Set github profile
    //         const githubUser = await githubService.getGithubUser(principal);
    //         if (githubUser) {
    //             const updatedUser = await setGithubProfile(principal, githubUser);
    //             // Return updated user as if 'me' endpoint was called
    //             res.status(200).json({ status: true, data: updatedUser, error: "", message: "Github connected" });
    //             return;
    //         }

    //         res.status(200).json({ status: true, data: null, error: "", message: "Github connected" });
    //         return;
    //     } catch (error) {
    //         console.log(`Error in connectGithub:`, error);
    //         res.status(500).json({ status: false, data: null, error: "Internal server error", message: "Internal server error" });
    //         return;
    //     }

    // }
}

export default GithubConnection;