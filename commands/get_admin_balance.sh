#!/usr/bin/env bash
# This script fetches the balance of the admin principal
# It does the following:
# 1. Shows the admin (default identity) principal and balance

# Usage:
# ./get_admin_balance.sh

# Requirements:
# - dfx must be installed and running
# - User must have default identity with ICP balance
# - icp_ledger_canister must be deployed

echo "===========ADMIN BALANCE==========="

# Get principal and balance
echo ""
echo "===========ADMIN==========="
PRINCIPAL=$(dfx identity --identity default get-principal)
ACCOUNT_ID=$(dfx ledger account-id --of-principal $PRINCIPAL)
BALANCE=$(dfx canister call icp_ledger_canister account_balance '(record { account = '$(python3 -c 'print("vec{" + ";".join([str(b) for b in bytes.fromhex("'$ACCOUNT_ID'")]) + "}")')'})'| grep -o "e8s = [0-9_]*" | sed 's/e8s = //; s/_//g')
ICP_BALANCE=$(echo "scale=4; $BALANCE / 10^8" | bc)

echo ">Principal: $PRINCIPAL"
echo ">Balance: $ICP_BALANCE ICP"
