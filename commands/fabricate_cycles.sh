
echo "===========FABRICATE CYCLES==========="

# AMOUNT
echo ""
echo "===========AMOUNT IN ICP==========="

CANISTER_ID=$(dfx canister id migrator-management-canister-backend)
echo "CANISTER_ID: $CANISTER_ID"
AMOUNT_IN_ICP_TOKEN="100"
dfx ledger fabricate-cycles --canister $CANISTER_ID --amount $AMOUNT_IN_ICP_TOKEN
