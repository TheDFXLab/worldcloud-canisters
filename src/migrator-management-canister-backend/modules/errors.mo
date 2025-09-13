import Nat "mo:base/Nat";
import Types "../types";

/** Error Types */
module ErrorType {
  /** System */
  public func NotFound(resource : Text) : Text = resource # " not found.";
  public func NotInitialized(resource : Text) : Text = resource # " is not initialized";
  public func NotFoundWasm() : Text = "Asset canister WASM code is not installed.";
  public func NotAllowedOperation() : Text = "Operation not permitted.";
  public func InvalidInput(message : Text) : Text = "Invalid input: " # message;
  public func CloudflareNotConfigured() : Text = "Cloudflare API credentials are not configured. Please set email and API key first.";
  public func InsufficientCycleAmount(amount : Nat, minimum : Nat) : Text = "Insufficient amount provided " # Nat.toText(amount) # " T cycles. Need minimum " # Nat.toText(minimum) # " T cycles.";
  public func FailedToPurge(amount : Nat) : Text = "Failed to purge " # Nat.toText(amount) # " sessions";
  public func UnexpectedError(action : Text) : Text = "Unexpected error occured while " # action;
  public func MissingParameter(param : Text) : Text = "Missing required parameter " # param;
  /** Timer */
  public func NotFoundTimer() : Text = "Timer not found";
  /** Balance */
  public func InsufficientFunds() : Text = "Insufficient ICP balance";
  public func PaymentProcessingFailure() : Text = "Payment processing failed";
  public func TreasuryNotSet() : Text = "Treasury not set";
  public func TransferFailed() : Text = "Transfer failed.";
  public func FailedDeposit() : Text = "Deposit failed unexpectedly.";

  /** Subscription */
  public func SubscriptionNotFound() : Text = "Subscription not found";
  public func SubscriptionAlreadyExists() : Text = "Already subscribed";
  public func InvalidTier() : Text = "Unidentified tier";
  public func SubscriptionLimitReached() : Text = "You have reached the maximum number of premium projects for your subscription tier.";
  public func QuotaReached(max : Nat) : Text = "You have reached your maximum quota of " # Nat.toText(max) # " sessions.";
  public func SubscriptionRequired() : Text = "Premium subscription required.";
  public func FreemiumSubscriptionRequired() : Text = "Freemium subscription required.";
  public func AddOnExists(id : Types.AddOnId) : Text = Nat.toText(id) # " add-on already activated for current project.";
  public func AddOnActivated() : Text = " Add-on already activated";
  public func AddOnRequired() : Text = "Please purchase an add-on";

  /** Access Control */
  public func Unauthorized() : Text = "Unauthorized";
  public func NotController() : Text = "Not controller of canister.";
  public func NotAnAdmin() : Text = "Not an admin";
  public func NotASuperAdmin() : Text = "Not a super admin";

  /** Asset canister */
  public func FailedDeployCanister() : Text = "Failed to deploy canister";
  public func NotFoundProject() : Text = "Project not found";
  public func NotFoundCanister() : Text = "Canister not found";
  public func NotFreemiumType() : Text = "Freemium project is required";
  public func NotFoundTier() : Text = "Tier not found";
  public func NoUserSession() : Text = "No current active deployment";
  public func ActiveSession() : Text = "Session already active";
  public func InactiveSession() : Text = "Session is not active";
  public func NotFoundSession() : Text = "Session not found";
  public func ZeroDuration() : Text = "Duration must be non-zero";

  public func NoCanisterInProject() : Text = "No canister linked to project";
  public func NotFoundSharedCanister() : Text = "Deployment not found";
  public func NotFoundSlot() : Text = "Slot not found";
  public func FailedCreateSlot() : Text = "Failed to create slot";
  public func NotFoundLog() : Text = "Usage log does not exist";
  public func MaxSlotsReached() : Text = "Maxmium number of runners reached.";
  public func SlotUnavailable() : Text = "Slot is busy.";
  public func IndexOutOfBounds() : Text = "Index out of bounds";
  public func AlreadyCreated() : Text = "Resource already created";

  public func PriceFeedError() : Text = "Error getting token price from price feed.";
  public func NotFoundCloudflareApiKey() : Text = "Cloudflare API is not set.";
  public func NotFoundCloudflareEmail() : Text = "Cloudflare email is not set.";
  public func NotFoundCloudflareRecord(subdomain : Text, record_type : Text) : Text = "Cloudflare " # record_type # " DNS record is not found for subdomain: " # subdomain;
  public func FailedSaveRecords() : Text = "Failed to save dns records for canister";
  public func PremiumFeature() : Text = "Feature is available for premium projects only.";
  public func NotAvailableService() : Text = "Service is currently not available";
  public func UnsupportedAction(action : Text) : Text = action # " is not supported.";
  public func NotFoundClass(class_name : Text) : Text = class_name # " class reference is not defined.";
  public func NameTaken(name : Text) : Text = "Subdomain name " # name # " is taken.";
  public func NotAttachedResourceId() : Text = "The add-on has no attached resource.";
  public func DomainRecordsExist() : Text = "The domain records already exist for this subdomain name. Please delete the resource and recreate it with another name.";
};
