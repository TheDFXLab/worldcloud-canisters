
echo "===========FABRICATE CYCLES==========="

# AMOUNT
echo ""
echo "===========AMOUNT IN ICP==========="

CANISTER_ID="br5f7-7uaaa-aaaaa-qaaca-cai"
AMOUNT_IN_ICP_TOKEN="10"
dfx ledger fabricate-cycles --canister $CANISTER_ID --amount $AMOUNT_IN_ICP_TOKEN
