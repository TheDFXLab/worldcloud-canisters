
echo "===========FABRICATE CYCLES==========="

# AMOUNT
echo ""
echo "===========AMOUNT IN ICP==========="

CANISTER_ID="be2us-64aaa-aaaaa-qaabq-cai"
AMOUNT_IN_ICP_TOKEN="100"
dfx ledger fabricate-cycles --canister $CANISTER_ID --amount $AMOUNT_IN_ICP_TOKEN
