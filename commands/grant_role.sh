
echo "===========GRANT ROLE==========="

#$1: principal
#$2: role: "super_admin" or "admin"

if [ -z "$1" ]; then
    PRINCIPAL="ehxcm-jn7zo-4c6av-wnmv6-vgck3-yynmq-k22ho-guzre-ena2y-r7k5v-5qe"
fi

if [ -z "$2" ]; then
    ROLE="admin"
fi

if [ "$2" != "super_admin" ] && [ "$2" != "admin" ]; then
    ROLE="admin"
fi

echo "Granting role $ROLE to principal $PRINCIPAL"

dfx canister call migrator-management-canister-backend grant_role '(principal "'$PRINCIPAL'", variant { "'$ROLE'" })'
