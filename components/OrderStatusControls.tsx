"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { OrderStatus } from "@/models/types";
import { formatApiError } from "@/lib/errors";

const STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "Order Placed",
    paid: "Payment Received",
    processing: "Preparing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
};

// Allowed forward transitions for happy-path. Admin can also override to
// cancelled / refunded from most non-terminal states.
const NEXT_STEPS: Record<OrderStatus, OrderStatus[]> = {
    pending: ["paid", "cancelled"],
    paid: ["processing", "cancelled", "refunded"],
    processing: ["shipped", "cancelled", "refunded"],
    shipped: ["delivered", "refunded"],
    delivered: ["refunded"],
    cancelled: [],
    refunded: [],
};

const TRANSITION_STYLES: Record<OrderStatus, string> = {
    pending: "bg-amber-500 hover:bg-amber-400 text-slate-900",
    paid: "bg-sky-500 hover:bg-sky-400 text-slate-900",
    processing: "bg-indigo-500 hover:bg-indigo-400 text-white",
    shipped: "bg-violet-500 hover:bg-violet-400 text-white",
    delivered: "bg-emerald-500 hover:bg-emerald-400 text-slate-900",
    cancelled: "bg-red-500 hover:bg-red-400 text-white",
    refunded: "bg-slate-500 hover:bg-slate-400 text-white",
};

interface Props {
    orderId: string;
    currentStatus: OrderStatus;
}

export default function OrderStatusControls({ orderId, currentStatus }: Props) {
    const router = useRouter();
    const [updating, setUpdating] = useState<OrderStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    const next = NEXT_STEPS[currentStatus];

    async function update(status: OrderStatus) {
        setUpdating(status);
        setError(null);
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(formatApiError(data?.error, "Failed to update status"));
                setUpdating(null);
                return;
            }
            setUpdating(null);
            router.refresh();
        } catch {
            setError("Network error. Please try again.");
            setUpdating(null);
        }
    }

    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Update status
            </h2>

            {next.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">
                    This order is in a terminal state ({STATUS_LABELS[currentStatus]}). No
                    further updates available.
                </p>
            ) : (
                <div className="mt-4 space-y-2">
                    {next.map((status) => {
                        const isLoading = updating === status;
                        const disabled = updating !== null;
                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => update(status)}
                                disabled={disabled}
                                className={`inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${TRANSITION_STYLES[status]}`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    `Mark as ${STATUS_LABELS[status]}`
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {error && (
                <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {error}
                </div>
            )}
        </div>
    );
}
