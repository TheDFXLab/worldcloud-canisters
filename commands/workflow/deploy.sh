#!/bin/bash

# $1 "environemnt": "production", "develop"
# $2 "canister": "all", "frontend", "backend"

ENVIRONMENT=$1  # e.g., "mainnet" or "develop"
CANISTER=$2
if [ $# -eq 0 ]; then
    echo "Deploying to default environment: develop"
    ENVIRONMENT="develop"
    CANISTER="all"
fi

if [ "$ENVIRONMENT" = "production" ]; then
    # cp src/assets/.well-known/ii-alternative-origins.mainnet src/assets/.well-known/ii-alternative-origins
    echo "Using production cycles wallet."
    dfx identity use visual-motion
    if [ "$CANISTER" = "all" ]; then
        dfx deploy --network ic
    elif [ "$CANISTER" = "frontend" ]; then
        dfx deploy migrator-management-canister-frontend --network ic
    elif [ "$CANISTER" = "backend" ]; then
        dfx deploy migrator-management-canister-backend --network ic
    fi
elif [ "$ENVIRONMENT" = "develop" ]; then
    # cp src/assets/.well-known/ii-alternative-origins.develop src/assets/.well-known/ii-alternative-origins
    echo "Using default cycles wallet."
    dfx identity use default
    if [ "$CANISTER" = "all" ]; then
        dfx deploy
    elif [ "$CANISTER" = "frontend" ]; then
        dfx deploy migrator-management-canister-frontend 
    elif [ "$CANISTER" = "backend" ]; then
        dfx deploy migrator-management-canister-backend
    else
        echo "No canister selected"
    fi
else
    echo "Please specify environment: production or develop"
    exit 1
fi