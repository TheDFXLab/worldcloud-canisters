# Check args for receiver and amount
if [ -z "$1" ]; then
    TERRA_CYCLES=1.0
else
    TERRA_CYCLES="$1"
fi

# Convert Terra cycles to cycles (1 Terra cycle = 1,000,000,000,000 cycles)
AMOUNT_IN_CYCLES=$(echo "$TERRA_CYCLES * 1000000000000" | bc)

echo "TERRA CYCLES: $TERRA_CYCLES"
echo "CYCLES: $AMOUNT_IN_CYCLES"
dfx identity use visual-motion
dfx cycles top-up 7nopf-3qaaa-aaaam-aeeoq-cai $AMOUNT_IN_CYCLES --network ic