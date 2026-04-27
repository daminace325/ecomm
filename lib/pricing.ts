import type { Address } from "@/models/types";
import { applyRate } from "@/lib/money";

/**
 * Single source of truth for tax & shipping calculation.
 * Used by:
 *   - POST /api/orders        (authoritative — what the user is actually charged)
 *   - POST /api/cart/summary  (preview shown on the cart page)
 *   - /checkout server page   (display passed down to CheckoutClient)
 *
 * Keep this file pure and deterministic so server and client agree on totals.
 *
 * All amounts are in **integer minor units** (paise / cents). See lib/money.ts.
 */

export interface PricingInput {
    /** Subtotal in minor units. */
    subtotal: number;
    currency: string;
    shippingAddress?: Address;
}

export interface PricingBreakdown {
    /** All amounts are integer minor units. */
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
    /** Flat shipping fee in minor units, charged when subtotal < freeShippingOver. */
    shippingFlat: number;
    /** Subtotal threshold (minor units) at which shipping becomes free. */
    freeShippingOver: number;
    /** Tax rate as a fraction (0.18 = 18%). */
    taxRate: number;
    taxLabel?: string;
    currencySymbol: string;
    /** Free-shipping threshold in major units, for human-readable notes only. */
    freeShippingOverMajor: number;
}

// Conservative defaults. Real rates should come from a tax provider per
// jurisdiction; this is a sensible MVP that matches the current INR-first UX.
const RULES: Record<string, CurrencyRule> = {
    INR: {
        shippingFlat: 4900,         // ₹49
        freeShippingOver: 49900,    // ₹499
        freeShippingOverMajor: 499,
        taxRate: 0.18,
        taxLabel: "GST",
        currencySymbol: "₹",
    },
    USD: {
        shippingFlat: 500,          // $5
        freeShippingOver: 5000,     // $50
        freeShippingOverMajor: 50,
        taxRate: 0,
        currencySymbol: "$",
    },
    EUR: {
        shippingFlat: 500,
        freeShippingOver: 5000,
        freeShippingOverMajor: 50,
        taxRate: 0,
        currencySymbol: "€",
    },
};

const DEFAULT_RULE: CurrencyRule = {
    shippingFlat: 0,
    freeShippingOver: 0,
    freeShippingOverMajor: 0,
    taxRate: 0,
    currencySymbol: "",
};

export function calculatePricing(input: PricingInput): PricingBreakdown {
    const subtotal = Math.max(0, Math.round(input.subtotal || 0));
    const currency = input.currency || "INR";
    const rule = RULES[currency] ?? DEFAULT_RULE;

    const freeShipping = subtotal >= rule.freeShippingOver && rule.freeShippingOver > 0;
    const shipping = subtotal === 0 ? 0 : freeShipping ? 0 : rule.shippingFlat;

    const tax = applyRate(subtotal, rule.taxRate);
    const total = subtotal + shipping + tax;

    let shippingNote: string | undefined;
    if (subtotal === 0) {
        shippingNote = undefined;
    } else if (freeShipping) {
        shippingNote = "Free shipping";
    } else if (rule.freeShippingOver > 0) {
        const remainingMajor = (rule.freeShippingOver - subtotal) / 100;
        shippingNote = `Free over ${rule.currencySymbol}${rule.freeShippingOverMajor} · add ${rule.currencySymbol}${remainingMajor.toFixed(2)} more`;
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
