# World Cloud API Methods Documentation

## Overview

This document outlines the main API methods used in the World Cloud platform for managing projects, subscriptions, deployments, and freemium sessions. The platform enables developers to deploy static web applications to the Internet Computer (ICP) with custom domains and various subscription tiers.

## Core API Methods

### 1. Project Management

#### `createProject(project_name, description, tags, plan)`

**Purpose**: Creates a new project with specified details and plan type.

**Parameters**:

- `project_name` (string): Name of the project
- `description` (string): Project description
- `tags` (string[]): Array of tags for categorization
- `plan` (PlanType): Either "freemium" or "paid"

**Returns**: `DeserializedProject` object with project details

**Backend Method**: `create_project(payload: CreateProjectPayload)`

#### `getUserProjects(page?, limit?)`

**Purpose**: Retrieves all projects belonging to the authenticated user.

**Parameters**:

- `page` (number, optional): Page number for pagination
- `limit` (number, optional): Number of projects per page

**Returns**: Array of `DeserializedProject` objects

**Backend Method**: `get_projects_by_user(payload: GetProjectsByUserPayload)`

#### `deleteProject(projectId)`

**Purpose**: Deletes a project and all associated data.

**Parameters**:

- `projectId` (number): ID of the project to delete

**Returns**: Boolean indicating success

**Backend Method**: `delete_project(project_id: ProjectId)`

### 2. Asset Deployment and Upload

#### `deployAssetCanister(project_id)`

**Purpose**: Deploys an asset canister for the specified project.

**Parameters**:

- `project_id` (bigint): ID of the project

**Returns**: Deployment result

**Backend Method**: `deployAssetCanister(project_id: Nat)`

#### `uploadAssetsToProject(project_id, files, current_batch, total_batch_count, workflowRunDetails?)`

**Purpose**: Uploads static files to the project's canister in batches.

**Parameters**:

- `project_id` (bigint): ID of the project
- `files` (StaticFile[]): Array of files to upload
- `current_batch` (number): Current batch number
- `total_batch_count` (number): Total number of batches
- `workflowRunDetails` (WorkflowRunDetails, optional): GitHub Actions workflow details

**Returns**: Upload result with status and message

**Backend Method**: `upload_assets_to_project(payload: StoreAssetInCanisterPayload)`

#### `storeInAssetCanister(project_id, files, current_batch, total_batch_count, workflowRunDetails?)`

**Purpose**: Wrapper method for uploading assets to project canister.

**Parameters**: Same as `uploadAssetsToProject`

**Returns**: Upload result

### 3. Freemium Session Management

#### `getUserFreemiumUsage()`

**Purpose**: Retrieves the current freemium slot usage for the authenticated user.

**Returns**: Freemium slot details including:

- `project_id`: Associated project ID
- `canister_id`: Deployed canister ID
- `start_timestamp`: Session start time
- `duration`: Session duration in milliseconds
- `status`: Current slot status
- `url`: Accessible URL for the site

**Backend Method**: `get_user_slot()`

#### `requestFreemiumSession(project_id)`

**Purpose**: Requests a freemium session for deployment (4-hour limit).

**Parameters**:

- `project_id` (bigint): ID of the project

**Returns**: Session creation result

**Backend Method**: `deployAssetCanister(project_id: Nat)` (for freemium projects)

### 4. Subscription Management

#### `getCreditsAvailable()`

**Purpose**: Gets the available credits for the authenticated user.

**Returns**: Credit balance

**Backend Method**: `getMyCredits()`

#### `deposit()`

**Purpose**: Processes ICP deposits to user's account.

**Returns**: Deposit result

**Backend Method**: `depositIcp()`

### 5. Add-on Management

#### `getAddOnsList()`

**Purpose**: Retrieves all available add-ons.

**Returns**: Array of available add-ons

**Backend Method**: `get_add_ons_list()`

#### `subscribeAddOn(project_id, add_on_id)`

**Purpose**: Subscribes a project to a specific add-on.

**Parameters**:

- `project_id` (number): ID of the project
- `add_on_id` (number): ID of the add-on

**Returns**: Subscription result

**Backend Method**: `subscribe_add_on(project_id: ProjectId, add_on_id: AddOnId)`

#### `getAddOnsByProject(project_id)`

**Purpose**: Gets all add-ons subscribed to by a project.

**Parameters**:

- `project_id` (number): ID of the project

**Returns**: Array of subscribed add-ons

**Backend Method**: `get_add_ons_by_project(project_id: ProjectId)`

### 6. Custom Domain Management

#### `setupCustomDomainByProject(projectId, subdomainName, add_on_id)`

**Purpose**: Sets up a custom domain for a project.

**Parameters**:

- `projectId` (number): ID of the project
- `subdomainName` (string): Desired subdomain name
- `add_on_id` (number): ID of the domain add-on

**Returns**: Domain registration result

**Backend Method**: `setup_custom_domain_by_project(project_id: ProjectId, subdomain_name: Text, add_on_id: AddOnId)`

#### `getDomainRegistrationsByProject(projectId)`

**Purpose**: Gets all domain registrations for a project.

**Parameters**:

- `projectId` (number): ID of the project

**Returns**: Array of domain registrations

**Backend Method**: `get_domain_registrations_by_canister(project_id: ProjectId)`

#### `isSubdomainAvailable(subdomain, project_id, addon_id)`

**Purpose**: Checks if a subdomain is available for registration.

**Parameters**:

- `subdomain` (string): Subdomain to check
- `project_id` (number): ID of the project
- `addon_id` (number): ID of the add-on

**Returns**: Boolean indicating availability

**Backend Method**: `is_available_subdomain(project_id: ProjectId, subdomain: Text, addon_id: AddOnId)`

## Timer Management

### Session End Timers

The system uses timers to automatically end freemium sessions after 4 hours:

```motoko
// Timer setup for session cleanup
let timer_id = Timer.setTimer<system>(
  #seconds duration,
  func() : async () {
    await cleanup_session(slot_id, canister_id);
  }
);
```

### Domain Registration Timers

Timers are used to schedule and manage domain registration processes:

```motoko
// Schedule domain registration with retry logic
private func schedule_register_domain(
  project_id: ProjectId,
  canister_id: Principal,
  domain_name: Text,
  subdomain_name: Text,
  duration_seconds: Nat,
  domain_registration_id: DomainRegistrationId
) : () {
  let timer_id = Timer.setTimer<system>(
    #seconds duration_seconds,
    func<system>() : async () {
      // Domain registration logic with retry mechanism
    }
  );
}
```

### Global Timers

System-wide timers for quota resets and maintenance:

```motoko
// Quota reset timer (daily)
let initial_timer_id = Timer.setTimer<system>(
  #seconds(schedule.seconds_until_next_midnight),
  func() : async () {
    // Reset user quotas
  }
);
```

## Error Handling

All methods return structured responses with either:

- `#ok(data)` for successful operations
- `#err(error_message)` for failed operations

Common error types:

- `Unauthorized`: User not authenticated or lacks permissions
- `NotFound`: Resource not found
- `MaxSlotsReached`: User has reached subscription limit
- `ValidationError`: Invalid input parameters

## Authentication

All methods require user authentication through Internet Identity. The system validates:

- User identity is not anonymous
- User has appropriate permissions for the operation
- Project ownership for project-specific operations
