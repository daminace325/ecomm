/**
 * Money is stored and transferred in **integer minor units** (paise / cents)
 * everywhere in this app: database documents, API request/response bodies,
 * server-to-client props, and pricing calculations. Major units (rupees /
 * dollars) only exist at the UI boundary — form inputs converted on submit,
 * formatted strings on render.
 *
 * This avoids JS float drift (0.1 + 0.2 problem) on totals/tax/shipping.
 *
 * Helpers here are the *only* place conversions should happen.
 */

/** Rupees → paise (or dollars → cents). Rounds to nearest minor unit. */
export function toMinor(major: number): number {
    if (!Number.isFinite(major)) return 0;
    return Math.round(major * 100);
}

/** Paise → rupees (or cents → dollars). For display/form initialization only. */
export function toMajor(minor: number): number {
    return (minor || 0) / 100;
}

/** Multiply a minor-unit amount by an integer quantity. */
export function multiplyMinor(amountMinor: number, qty: number): number {
    return Math.round((amountMinor || 0) * qty);
}

/** Apply a fractional rate (e.g. 0.18 for 18% tax) to a minor-unit amount. */
export function applyRate(amountMinor: number, rate: number): number {
    return Math.round((amountMinor || 0) * rate);
}

/**
 * Format a minor-unit amount as a localized currency string.
 * Falls back to "<CCY> 0.00" if the currency code is unknown to Intl.
 */
export function formatMoney(amountMinor: number, currency: string): string {
    const major = toMajor(amountMinor);
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currency || "INR",
        }).format(major);
    } catch {
        return `${currency} ${major.toFixed(2)}`;
    }
}
