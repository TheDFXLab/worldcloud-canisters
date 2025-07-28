
echo "===========GRANT ROLE==========="
# Usage
# sh grant_role <Principal> <Role> <Env>
# Principal: Target principal
# Role: "super_admin" or "admin"
# Env: "local" or "ic"

#$1: principal
#$2: role: "super_admin" or "admin"
PRINCIPAL=$1
ROLE=$2
ENV=$3

if [ -z "$1" ]; then
    PRINCIPAL="ocwh7-4pzdk-5d553-scdx5-lm3av-dolip-g3prg-jix42-lgucz-d4cag-3qe"
fi

if [ -z "$2" ]; then
    ROLE="admin"
fi

if [ -z "$3" ]; then
    ENV="local"
fi

if [ "$2" != "super_admin" ] && [ "$2" != "admin" ]; then
    ROLE="admin"
fi

echo "Granting role $ROLE to principal $PRINCIPAL in $ENV"

dfx canister call migrator-management-canister-backend --network $ENV grant_role '(principal "'$PRINCIPAL'", variant { "'$ROLE'" })'