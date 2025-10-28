export function percentile(sorted: number[], p: number) {
    if (sorted.length === 0) return NaN;
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const w = idx - lo;
    return lo === hi ? sorted[lo] : sorted[lo] * (1 - w) + sorted[hi] * w;
}

export function boundsByPercentile(
    values: number[],
    lowP = 0.01,
    highP = 0.99
): [ number, number ] {
    const cleaned = values
        .filter((v) => Number.isFinite(v) && v > 0)
        .sort((a, b) => a - b);
    
    if (cleaned.length < 10) return [0, Number.POSITIVE_INFINITY];

    const lo = percentile(cleaned, lowP);;
    const hi = percentile(cleaned, highP);
    return [lo, hi];
}