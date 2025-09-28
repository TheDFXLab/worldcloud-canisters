module {
  public let LEDGER_ID : Text = "ryjl3-tyaaa-aaaaa-aaaba-cai";
  public let IC_MANAGEMENT_CANISTER = "aaaaa-aa"; // Production
  public let BASE_CANISTER_START_CYCLES = 230_949_972_000;

  public let XDR_PRICE : Float = 1.3;
  public let E8S_PER_ICP : Nat = 100_000_000;
  public let CYCLES_PER_XDR : Float = 1_000_000_000_000;
  public let REFRESH_PRICE_INTERVAL_SECONDS = 3600;

  public let DEFAULT_DURATION_MS : Nat = 180_000; // 3 mins
  public let RATE_LIMIT_WINDOW_MS = 86_400_000; // 1 day
  public let MAX_USES_THRESHOLD = 3; // 3 uses per day
  public let MAX_SHAREABLE_CANISTERS = 10;
  public let MIN_CYCLES_INIT_E8S = 200_000_000;
  public let MIN_CYCLES_INIT = 1_000_000_000_000;
};
