#!/usr/bin/env bash
# This script performs a transfer of ICP tokens from the default identity to a receiver principal
# It does the following:
# 1. Shows the funder (default identity) principal and balance
# 2. Shows the receiver principal
# 3. Shows the receiver's balance before funding
# 4. Transfers 1 ICP from default identity to the receiver principal
# 5. Shows updated balances after funding

# Usage:
# ./fund_wallet.sh

# Requirements:
# - dfx must be installed and running
# - User must have default identity with ICP balance
# - FlipCoin_backend canister must be deployed
# - icp_ledger_canister must be deployed

# $1: receiver principal
# $2: deposit amount in ICP

echo "===========FUND WALLET==========="
RECEIVER_PRINCIPAL="kt6u4-grx3c-eswp4-undf4-rdrrg-udzxn-odbjz-wwzuj-rhqkd-537yl-eqe"
DEPOSIT_AMOUNT_ICP=10

# Check args for receiver and amount
if [ $1 != "" ]; then
    RECEIVER_PRINCIPAL=$1
fi
if [ $2 != "" ]; then
    DEPOSIT_AMOUNT_ICP=$2
fi

# Get funder principal and balance
echo ""
echo "===========DEPOSITOR==========="
PRINCIPAL=$(dfx identity --identity default get-principal)
ACCOUNT_ID=$(dfx ledger account-id --of-principal $PRINCIPAL)
BALANCE=$(dfx canister call icp_ledger_canister account_balance '(record { account = '$(python3 -c 'print("vec{" + ";".join([str(b) for b in bytes.fromhex("'$ACCOUNT_ID'")]) + "}")')'})'| grep -o "e8s = [0-9_]*" | sed 's/e8s = //; s/_//g')
ICP_BALANCE=$(echo "scale=4; $BALANCE / 10^8" | bc)

echo ">Principal: $PRINCIPAL"
echo ">Balance: $ICP_BALANCE ICP"

# Get receiver ID and ID in bytes
echo ""
echo "===========RECEIVER==========="
RECEIVER_ID=$(dfx ledger account-id --of-principal $RECEIVER_PRINCIPAL)
RECEIVER_ID_IN_BYTES="$(python3 -c 'print("vec{" + ";".join([str(b) for b in bytes.fromhex("'$RECEIVER_ID'")]) + "}")')"

echo ">Principal: $RECEIVER_PRINCIPAL"
echo ">ID: $RECEIVER_ID_IN_BYTES"

# Get receiver balance before funding
echo ""
echo "===========RECEIVER BALANCE BEFORE==========="
RECEIVER_BALANCE_BEFORE_E8S=$(dfx canister call icp_ledger_canister account_balance '(record { account = '$(python3 -c 'print("vec{" + ";".join([str(b) for b in bytes.fromhex("'$RECEIVER_ID'")]) + "}")')'})'| grep -o "e8s = [0-9_]*" | sed 's/e8s = //; s/_//g')
RECEIVER_BALANCE_BEFORE=$(echo "scale=4; $RECEIVER_BALANCE_BEFORE_E8S / 10^8" | bc)

echo ">Balance: $RECEIVER_BALANCE_BEFORE ICP"

# Deposit 1 ICP from default identity to receiver principal using the ledger canister
echo ""
echo "===========DEPOSITING==========="
DEPOSIT_AMOUNT_E8S=$(echo "$DEPOSIT_AMOUNT_ICP * 10^8" | bc)
dfx canister --identity default call icp_ledger_canister transfer "(record { to = ${RECEIVER_ID_IN_BYTES}; memo = 1; amount = record { e8s = $DEPOSIT_AMOUNT_E8S }; fee = record { e8s = 10_000 }; })"

# Get receiver balance after the funding
echo ""
echo "===========RECEIVER BALANCE AFTER==========="
RECEIVER_BALANCE_AFTER_E8S=$(dfx canister call icp_ledger_canister account_balance '(record { account = '$(python3 -c 'print("vec{" + ";".join([str(b) for b in bytes.fromhex("'$RECEIVER_ID'")]) + "}")')'})'| grep -o "e8s = [0-9_]*" | sed 's/e8s = //; s/_//g')
RECEIVER_BALANCE_AFTER=$(echo "scale=4; $RECEIVER_BALANCE_AFTER_E8S / 10^8" | bc)

echo ">Balance: $RECEIVER_BALANCE_AFTER ICP"
