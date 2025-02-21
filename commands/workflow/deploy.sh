#!/bin/bash

# $1 "environemnt": "production", "develop"
# $2 "canister": "all", "frontend", "backend"

ENVIRONMENT=$1  # e.g., "production" or "develop"
CANISTER=$2
if [ $# -eq 0 ]; then
    echo "Deploying to default environment: develop"
    ENVIRONMENT="develop"
    CANISTER="all"
fi

if [ -z "$CANISTER" ]; then
    CANISTER="all"
fi

if [ "$ENVIRONMENT" = "production" ]; then
    # use production cycles wallet
    echo "Using production cycles wallet."
    dfx identity use visual-motion
    
    # copy .well-known and ic-assets.json5
    echo "Using production assets source."
    cp -r environment/production/. src/assets/

    # copy production dfx config file
    echo "Using production dfx.json"
    cp dfx.production.json dfx.json


    # use deps pull for production to pull latest versions of dependencies
    echo "Pulling dependencies..."
    dfx deps pull

    # build frontend
    echo "Building frontend..."

    # Push to frontend directory
    pushd src/migrator-management-canister-frontend
    
    # Build frontend
    npm run build

    # Return to the root directory
    popd

    # Deploy selected canisters
    if [ "$CANISTER" = "all" ]; then
        dfx deploy --network ic
    elif [ "$CANISTER" = "frontend" ]; then
        dfx deploy migrator-management-canister-frontend --network ic
    elif [ "$CANISTER" = "backend" ]; then
        dfx deploy migrator-management-canister-backend --network ic
    fi
elif [ "$ENVIRONMENT" = "develop" ]; then
    # Use default cycles wallet
    echo "Using default cycles wallet."
    dfx identity use default

    # Copy .well-known and ic-assets.json5
    echo "Using develop assets source."
    cp -r environment/develop/. src/assets/

    # Copy development dfx config file
    echo "Using develop dfx.json"
    cp dfx.develop.json dfx.json

    # Build frontend
    echo "Building frontend..."

    # Push to frontend directory
    pushd src/migrator-management-canister-frontend
    npm run build

    # Return to the root directory
    popd
   
    # Deploy selected canisters
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