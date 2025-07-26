import Nat "mo:base/Nat";

/** Error Types */
module ErrorType {
    /** System */
    public func NotFound(resource : Text) : Text = resource # " not found.";
    public func NotInitialized(resource : Text) : Text = resource # " is not initialized";
    public func NotFoundWasm() : Text = "Asset canister WASM code is not installed.";
    public func NotAllowedOperation() : Text = "Operation not permitted.";

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

    public func NoCanisterInProject() : Text = "No canister linked to project";
    public func NotFoundSharedCanister() : Text = "Deployment not found";
    public func NotFoundSlot() : Text = "Slot not found";
    public func FailedCreateSlot() : Text = "Failed to create slot";
    public func NotFoundLog() : Text = "Usage log does not exist";
    public func MaxSlotsReached() : Text = "Maxmium number of runners reached.";
    public func SlotUnavailable() : Text = "Slot is busy.";
    public func IndexOutOfBounds() : Text = "Index out of bounds";
    public func AlreadyCreated() : Text = "Resource already created";

};
