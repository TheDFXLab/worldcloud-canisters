/** Error Types */
module ErrorType {
    /** Balance */
    public func InsufficientFunds() : Text = "Insufficient ICP balance";
    public func PaymentProcessingFailure() : Text = "Payment processing failed";
    public func TreasuryNotSet() : Text = "Treasury not set";
    /** Subscription */
    public func SubscriptionNotFound() : Text = "Subscription not found";
    public func SubscriptionAlreadyExists() : Text = "Already subscribed";
    public func InvalidTier() : Text = "Unidentified tier";

    /** Access Control */
    public func Unauthorized() : Text = "Unauthorized";
    public func NotAnAdmin() : Text = "Not an admin";
    public func NotASuperAdmin() : Text = "Not a super admin";
};
