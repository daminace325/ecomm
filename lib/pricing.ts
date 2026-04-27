import type { Address } from "@/models/types";

/**
 * Single source of truth for tax & shipping calculation.
 * Used by:
 *   - POST /api/orders        (authoritative — what the user is actually charged)
 *   - POST /api/cart/summary  (preview shown on the cart page)
 *   - /checkout server page   (display passed down to CheckoutClient)
 *
 * Keep this file pure and deterministic so server and client agree on totals.
 *
 * All amounts are in the currency's major unit (e.g. rupees, dollars), matching
 * the rest of the codebase. Results are rounded to 2 decimal places.
 */

export interface PricingInput {
    subtotal: number;
    currency: string;
    shippingAddress?: Address;
}

export interface PricingBreakdown {
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
    /** Human-readable note for UI, e.g. "Free over ₹499". */
    shippingNote?: string;
    /** Human-readable note for UI, e.g. "Incl. 18% GST". */
    taxNote?: string;
}

interface CurrencyRule {
    /** Flat shipping fee charged when subtotal is below freeShippingOver. */
    shippingFlat: number;
    /** Subtotal at which shipping becomes free. */
    freeShippingOver: number;
    /** Tax rate as a fraction (0.18 = 18%). */
    taxRate: number;
    taxLabel?: string;
    currencySymbol: string;
}

// Conservative defaults. Real rates should come from a tax provider per
// jurisdiction; this is a sensible MVP that matches the current INR-first UX.
const RULES: Record<string, CurrencyRule> = {
    INR: {
        shippingFlat: 49,
        freeShippingOver: 499,
        taxRate: 0.18,
        taxLabel: "GST",
        currencySymbol: "₹",
    },
    USD: {
        shippingFlat: 5,
        freeShippingOver: 50,
        taxRate: 0,
        currencySymbol: "$",
    },
    EUR: {
        shippingFlat: 5,
        freeShippingOver: 50,
        taxRate: 0,
        currencySymbol: "€",
    },
};

const DEFAULT_RULE: CurrencyRule = {
    shippingFlat: 0,
    freeShippingOver: 0,
    taxRate: 0,
    currencySymbol: "",
};

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
    const subtotal = round2(Math.max(0, input.subtotal));
    const currency = input.currency || "INR";
    const rule = RULES[currency] ?? DEFAULT_RULE;

    const freeShipping = subtotal >= rule.freeShippingOver && rule.freeShippingOver > 0;
    const shipping = subtotal === 0 ? 0 : freeShipping ? 0 : round2(rule.shippingFlat);

    const tax = round2(subtotal * rule.taxRate);
    const total = round2(subtotal + shipping + tax);

    let shippingNote: string | undefined;
    if (subtotal === 0) {
        shippingNote = undefined;
    } else if (freeShipping) {
        shippingNote = "Free shipping";
    } else if (rule.freeShippingOver > 0) {
        const remaining = round2(rule.freeShippingOver - subtotal);
        shippingNote = `Free over ${rule.currencySymbol}${rule.freeShippingOver} · add ${rule.currencySymbol}${remaining} more`;
    }

    const taxNote =
        rule.taxRate > 0
            ? `Incl. ${(rule.taxRate * 100).toFixed(0)}% ${rule.taxLabel ?? "tax"}`
            : undefined;

    return {
        subtotal,
        shipping,
        tax,
        total,
        currency,
        shippingNote,
        taxNote,
    };
}
