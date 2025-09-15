# World Cloud Admin API Methods Documentation

## Overview

This document outlines the administrative API methods available in the World Cloud platform. These methods are restricted to users with admin privileges and provide system-wide management capabilities.

## Admin Authentication

All admin methods require the caller to have admin privileges, verified through the `access_control.is_authorized(msg.caller)` check.

## Admin API Methods

### 1. User and Subscription Management

#### `adminGrantSubscription(user_principal, subscription_tier_id)`

**Purpose**: Grants a subscription tier to a specific user.

**Parameters**:

- `user_principal` (Principal): User's principal ID
- `subscription_tier_id` (Nat): ID of the subscription tier

**Returns**: `Response<Subscription>` with granted subscription details

**Backend Method**: `admin_grant_subscription(user_principal: Principal, subscription_tier_id: Nat)`

#### `adminGetAdminUsers(payload)`

**Purpose**: Retrieves all admin users with pagination.

**Parameters**:

- `payload` (PaginationPayload): Pagination parameters

**Returns**: Paginated list of admin users

**Backend Method**: `admin_get_admins(payload: PaginationPayload)`

### 2. Slot and Canister Management

#### `adminSetCanisterToSlot(canister_id, slot_id)`

**Purpose**: Assigns a canister to a specific slot.

**Parameters**:

- `canister_id` (Principal): Canister principal ID
- `slot_id` (Nat): Slot ID to assign

**Returns**: `Response<()>` indicating success

**Backend Method**: `admin_set_canister_to_slot(canister_id: Principal, slot_id: Nat)`

#### `adminGetUserSlotId(user)`

**Purpose**: Gets the slot ID for a specific user.

**Parameters**:

- `user` (Principal): User's principal ID

**Returns**: `Response<?ShareableCanister>` with slot details

**Backend Method**: `admin_get_user_slot_id(user: Principal)`

#### `adminResetProjectSlot(projectId)`

**Purpose**: Resets a project's slot assignment.

**Parameters**:

- `projectId` (number): ID of the project

**Returns**: Reset result

**Backend Method**: `reset_project_slot(project_id: ProjectId)`

### 3. Domain Management

#### `adminSetupCustomDomain(project_id, canisterId, subdomainName, add_on_id)`

**Purpose**: Sets up a custom domain for a project (admin override).

**Parameters**:

- `project_id` (number): ID of the project
- `canisterId` (string): Canister ID
- `subdomainName` (string): Desired subdomain
- `add_on_id` (number): Domain add-on ID

**Returns**: `Response<DomainRegistration>` with registration details

**Backend Method**: `admin_setup_custom_domain(project_id: ProjectId, canister_id: Principal, subdomain_name: Text, add_on_id: AddOnId)`

#### `adminSetupFreemiumSubdomain(canister_id, subdomain_name)`

**Purpose**: Sets up a freemium subdomain for a canister.

**Parameters**:

- `canister_id` (Principal): Canister principal ID
- `subdomain_name` (string): Subdomain name

**Returns**: `Response<FreemiumDomainRegistration>` with registration details

**Backend Method**: `admin_setup_freemium_subdomain(canister_id: Principal, subdomain_name: Text)`

#### `adminGetDomainRegistrations()`

**Purpose**: Retrieves all domain registrations.

**Returns**: `Response<[(DomainRegistrationId, DomainRegistration)]>` with all registrations

**Backend Method**: `admin_get_domain_registrations()`

#### `adminGetDomainRegistrationsPaginated(limit, page)`

**Purpose**: Gets paginated domain registrations.

**Parameters**:

- `limit` (number): Number of records per page
- `page` (number): Page number

**Returns**: Paginated domain registrations

**Backend Method**: `admin_get_domain_registrations_paginated(limit: ?Nat, page: ?Nat)`

#### `adminDeleteDomainRegistration(registration_id, type)`

**Purpose**: Deletes a domain registration.

**Parameters**:

- `registration_id` (number): ID of the registration
- `type` (ProjectPlan): Type of project (freemium/paid)

**Returns**: `Response<()>` indicating success

**Backend Method**: `admin_delete_domain_registration(registration_id: DomainRegistrationId, type_: ProjectPlan)`

### 4. Add-on Management

#### `adminGrantAddon(project_id, addon_id, expiry_in_ms)`

**Purpose**: Grants an add-on to a project with expiration.

**Parameters**:

- `project_id` (number): ID of the project
- `addon_id` (number): ID of the add-on
- `expiry_in_ms` (number): Expiration time in milliseconds

**Returns**: `Response<[AddOnService]>` with granted add-on details

**Backend Method**: `admin_grant_addon(project_id: ProjectId, addon_id: AddOnId, expiry_in_ms: Nat)`

### 5. System Configuration

#### `adminSetTreasury(treasuryPrincipal)`

**Purpose**: Sets the treasury account for the system.

**Parameters**:

- `treasuryPrincipal` (string): Treasury principal ID

**Returns**: `Response<()>` indicating success

**Backend Method**: `admin_set_treasury(treasury_principal: Principal)`

#### `adminGetTreasuryBalance()`

**Purpose**: Gets the current treasury balance.

**Returns**: `Response<Nat>` with balance amount

**Backend Method**: `admin_get_treasury_balance()`

#### `adminSetCloudflareConfig(email, api_key, zone_id)`

**Purpose**: Configures Cloudflare settings for DNS management.

**Parameters**:

- `email` (string): Cloudflare account email
- `api_key` (string): Cloudflare API key
- `zone_id` (string): Cloudflare zone ID

**Returns**: `Response<()>` indicating success

**Backend Method**: `admin_set_clouflare_config(email: Text, api_key: Text, zone_id: Text)`

### 6. Quota and Usage Management

#### `adminResetQuotas()`

**Purpose**: Resets all user quotas.

**Returns**: `Response<()>` indicating success

**Backend Method**: `admin_reset_quotas()`

#### `adminSetAllSlotDuration(newDurationMs)`

**Purpose**: Sets the duration for all freemium slots.

**Parameters**:

- `newDurationMs` (number): New duration in milliseconds

**Returns**: `Response<()>` indicating success

**Backend Method**: `admin_set_all_slot_duration(newDurationMs: Nat)`

### 7. Timer Management

#### `adminGetGlobalTimers()`

**Purpose**: Retrieves all active global timers.

**Returns**: `[(Text, Nat)]` with timer names and IDs

**Backend Method**: `admin_get_global_timers()`

#### `adminGetDomainRegistrationTimers()`

**Purpose**: Gets all active domain registration timers.

**Returns**: `[(Text, DomainRegistrationTimer)]` with timer details

**Backend Method**: `admin_get_domain_registration_timers()`

#### `adminCancelDomainRegistrationTimer(subdomain_name)`

**Purpose**: Cancels a domain registration timer.

**Parameters**:

- `subdomain_name` (string): Subdomain name

**Returns**: `Response<Bool>` indicating success

**Backend Method**: `admin_cancel_domain_registration_timer(subdomain_name: Text)`

### 8. Data Management

#### `adminGetActivityLogsAll(payload)`

**Purpose**: Retrieves all activity logs with pagination.

**Parameters**:

- `payload` (DeserializedPaginationPayload): Pagination parameters

**Returns**: Paginated activity logs

**Backend Method**: `admin_get_activity_logs_all(payload: DeserializedPaginationPayload)`

#### `adminGetWorkflowRunHistoryAll(payload)`

**Purpose**: Gets all workflow run history with pagination.

**Parameters**:

- `payload` (DeserializedPaginationPayload): Pagination parameters

**Returns**: Paginated workflow history

**Backend Method**: `admin_get_workflow_run_history_all(payload: DeserializedPaginationPayload)`

#### `adminGetUsageLogsAll(payload)`

**Purpose**: Retrieves all usage logs with pagination.

**Parameters**:

- `payload` (DeserializedPaginationPayload): Pagination parameters

**Returns**: Paginated usage logs

**Backend Method**: `admin_get_usage_logs_all(payload: DeserializedPaginationPayload)`

#### `adminDeleteUsageLogs()`

**Purpose**: Deletes all usage logs.

**Returns**: `Response<()>` indicating success

**Backend Method**: `admin_delete_usage_logs()`

#### `adminDeleteAllLogs()`

**Purpose**: Deletes all system logs.

**Returns**: `Response<()>` indicating success

**Backend Method**: `admin_delete_all_logs()`

### 9. Role Management

#### `grantRole(principal, role)`

**Purpose**: Grants a role to a user.

**Parameters**:

- `principal` (string): User's principal ID
- `role` (any): Role to grant

**Returns**: Role grant result

**Backend Method**: `grant_role(principal: Principal, role: Role)`

#### `revokeRole(principal)`

**Purpose**: Revokes a user's role.

**Parameters**:

- `principal` (string): User's principal ID

**Returns**: Role revocation result

**Backend Method**: `revoke_role(principal: Principal)`

#### `checkRole(principal)`

**Purpose**: Checks a user's role.

**Parameters**:

- `principal` (string): User's principal ID

**Returns**: User's role information

**Backend Method**: `check_role(principal: Principal)`

### 10. System Maintenance

#### `purgeExpiredSessions()`

**Purpose**: Removes expired freemium sessions.

**Returns**: Purge result

**Backend Method**: `purge_expired_sessions()`

#### `resetSlots()`

**Purpose**: Resets all slots to available state.

**Returns**: Reset result

**Backend Method**: `reset_slots()`

#### `deleteProjects()`

**Purpose**: Deletes all projects (use with caution).

**Returns**: Deletion result

**Backend Method**: `delete_projects()`

## Error Handling

All admin methods return structured responses:

- `#ok(data)` for successful operations
- `#err(error_message)` for failed operations

Common admin errors:

- `Unauthorized`: Caller lacks admin privileges
- `NotFound`: Resource not found
- `ValidationError`: Invalid parameters
- `SystemError`: Internal system error

## Security Considerations

- All admin methods require explicit admin authorization
- Sensitive operations like data deletion should be used with extreme caution
- Treasury and configuration changes should be audited
- Role management should follow principle of least privilege
