import Types "../types";
import Book "../book";

module {
  public class ClassesManager() {
    public var project_manager : ?Types.ProjectInterface = null;
    public var subscription_manager : ?Types.SubscriptionInterface = null;
    public var cloudflare_manager : ?Types.Cloudflare = null;
    public var index_counter_manager : ?Types.IndexCounterInterface = null;
    public var shareable_canister_manager : ?Types.ShareableCanisterInterface = null;
    public var book_manager : ?Book.Book = null;
    public var domain_manager : ?Types.DomainInterface = null;
    public var canister_manager : ?Types.CanisterInterface = null;
    public var price_feed_manager : ?Types.PriceFeedInterface = null;
    public var access_control_manager : ?Types.AccessControlInterface = null;
    public var workflow_manager : ?Types.WorkflowInterface = null;
    public var activity_manager : ?Types.ActivityInterface = null;
    public var timers_manager : ?Types.TimersInterface = null;

    public var initialized = false;

    public func init(
      project_manager_init : Types.ProjectInterface,
      subscription_manager_init : Types.SubscriptionInterface,
      cloudflare_manager_init : Types.Cloudflare,
      index_counter_init : Types.IndexCounterInterface,
      shareable_canister_init : Types.ShareableCanisterInterface,
      book_init : Types.BookInterface,
      domain_manager_init : Types.DomainInterface,
      canister_manager_init : Types.CanisterInterface,
      price_feed_manager_init : Types.PriceFeedInterface,
      access_control_init : Types.AccessControlInterface,
      workflow_manager_init : Types.WorkflowInterface,
      activity_manager_init : Types.ActivityInterface,
      timers_manager_init : Types.TimersInterface,
    ) {
      project_manager := ?project_manager_init;
      subscription_manager := ?subscription_manager_init;
      cloudflare_manager := ?cloudflare_manager_init;
      index_counter_manager := ?index_counter_init;
      shareable_canister_manager := ?shareable_canister_init;
      book_manager := ?book_init;
      domain_manager := ?domain_manager_init;
      canister_manager := ?canister_manager_init;
      price_feed_manager := ?price_feed_manager_init;
      access_control_manager := ?access_control_init;
      workflow_manager := ?workflow_manager_init;
      activity_manager := ?activity_manager_init;
      timers_manager := ?timers_manager_init;

      initialized := true;
    };
  };

};
