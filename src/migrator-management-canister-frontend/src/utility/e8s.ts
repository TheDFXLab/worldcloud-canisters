export const e8s = 100000000n; // Use BigInt for e8s

export const e8sToIcp = (amountInE8s: number | bigint) => {
    const icpAmount = Number(amountInE8s) / Number(e8s);
    return icpAmount;
}

export const icpToE8s = (amountInIcp: number) => {
    const e8sAmount = BigInt(Math.round(amountInIcp * Number(e8s)));
    return e8sAmount;
}

export const cyclesToTerra = (amountInTerra: number) => {
    return amountInTerra / 1e12
}

export const terraToCycles = (amountInCycles: number) => {
    return amountInCycles * 1e12
}

export const fromE8sStable = (e8s: bigint, decimals: number = 8): number => {
    const str = e8s.toString();
    const integerPart = str.slice(0, -decimals) || '0';
    const decimalPart = str.slice(-decimals).padStart(decimals, '0');
    return parseFloat(`${integerPart}.${decimalPart}`);
};