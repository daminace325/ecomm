"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Address } from "@/models/types";
import { formatApiError } from "@/lib/errors";
import { formatMoney } from "@/lib/money";

type Row = {
    productId: string;
    title: string;
    image: string | null;
    qty: number;
    /** Integer minor units. */
    unitPrice: number;
    /** Integer minor units. */
    lineTotal: number;
    stockIssue: boolean;
    missing: boolean;
};

interface Props {
    addresses: Address[];
    rows: Row[];
    /** All amounts below are integer minor units. */
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
    shippingNote?: string;
    taxNote?: string;
}

export default function CheckoutClient({
    addresses,
    rows,
    subtotal,
    shipping,
    tax,
    total,
    currency,
    shippingNote,
    taxNote,
}: Props) {
    const router = useRouter();
    const [selected, setSelected] = useState(0);
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function placeOrder() {
        setPlacing(true);
        setError(null);
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ addressIndex: selected }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(formatApiError(data?.error, "Failed to place order"));
                setPlacing(false);
                return;
            }
            const orderId = data?.order?._id;
            if (orderId) {
                router.push(`/orders/${orderId}`);
            }
            router.refresh();
        } catch {
            setError("Network error. Please try again.");
            setPlacing(false);
        }
    }

    return (
        <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-8">
                <section>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Shipping address</h2>
                        <Link
                            href="/profile/addresses"
                            className="text-sm text-sky-400 hover:text-sky-300"
                        >
                            Manage addresses
                        </Link>
                    </div>
                    <div className="mt-4 space-y-3">
                        {addresses.map((addr, idx) => {
                            const active = selected === idx;
                            return (
                                <label
                                    key={idx}
                                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 transition ${
                                        active
                                            ? "border-sky-500 bg-sky-500/10"
                                            : "border-slate-700 bg-slate-800 hover:border-slate-600"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="address"
                                        checked={active}
                                        onChange={() => setSelected(idx)}
                                        className="mt-1 h-4 w-4 accent-sky-500"
                                    />
                                    <div className="flex-1 text-sm text-slate-200">
                                        <div className="font-medium text-white">{addr.line1}</div>
                                        {addr.line2 && (
                                            <div className="text-slate-300">{addr.line2}</div>
                                        )}
                                        <div className="text-slate-400">
                                            {addr.city}
                                            {addr.state ? `, ${addr.state}` : ""} {addr.postalCode}
                                        </div>
                                        {addr.country && (
                                            <div className="text-slate-400">{addr.country}</div>
                                        )}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-white">Order items</h2>
                    <div className="mt-4 divide-y divide-slate-700 rounded-md border border-slate-700 bg-slate-800">
                        {rows.map((row) => (
                            <div key={row.productId} className="flex gap-4 p-4">
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-900">
                                    {row.image ? (
                                        <Image
                                            src={row.image}
                                            alt={row.title}
                                            width={64}
                                            height={64}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : null}
                                </div>
                                <div className="flex flex-1 items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-white">
                                            {row.title}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            Qty {row.qty} · {formatMoney(row.unitPrice, currency)} each
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-white">
                                        {formatMoney(row.lineTotal, currency)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-md border border-slate-700 bg-slate-800 p-6">
                    <h2 className="text-lg font-semibold text-white">Summary</h2>
                    <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-300">
                            <dt>Subtotal</dt>
                            <dd>{formatMoney(subtotal, currency)}</dd>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <dt>
                                Shipping
                                {shippingNote && (
                                    <span className="ml-2 text-xs text-slate-500">
                                        {shippingNote}
                                    </span>
                                )}
                            </dt>
                            <dd>
                                {shipping === 0 ? "Free" : formatMoney(shipping, currency)}
                            </dd>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <dt>
                                Tax
                                {taxNote && (
                                    <span className="ml-2 text-xs text-slate-500">{taxNote}</span>
                                )}
                            </dt>
                            <dd>{tax === 0 ? "—" : formatMoney(tax, currency)}</dd>
                        </div>
                        <div className="my-3 h-px bg-slate-700" />
                        <div className="flex justify-between text-base font-semibold text-white">
                            <dt>Total</dt>
                            <dd>{formatMoney(total, currency)}</dd>
                        </div>
                    </dl>

                    {error && (
                        <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={placeOrder}
                        disabled={placing}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {placing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Placing order...
                            </>
                        ) : (
                            "Place order"
                        )}
                    </button>
                    <p className="mt-3 text-center text-xs text-slate-500">
                        Payment on delivery. No card required.
                    </p>
                </div>
            </aside>
        </div>
    );
}
