import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { getUserFromCookies } from "@/lib/auth_server";
import { ordersCollection } from "@/lib/collections";
import { formatMoney } from "@/lib/money";
import type { OrderStatus } from "@/models/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<OrderStatus, string> = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    paid: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    processing: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    shipped: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    cancelled: "bg-red-500/15 text-red-300 border-red-500/30",
    refunded: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    pending: "Order Placed",
    paid: "Payment Received",
    processing: "Preparing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded",
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const user = await getUserFromCookies();
    if (!user) redirect("/signin?next=/orders");

    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page ?? "1") || 1);

    const orders = await ordersCollection();
    const filter = { userId: user._id };
    const total = await orders.countDocuments(filter);
    const items = await orders
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray();

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <main className="mx-auto max-w-5xl px-4 py-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold text-white">Your orders</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        {total} {total === 1 ? "order" : "orders"} placed
                    </p>
                </div>
                <Link
                    href="/account"
                    className="text-sm text-sky-400 hover:text-sky-300"
                >
                    Back to account
                </Link>
            </div>

            {items.length === 0 ? (
                <div className="mt-10 flex flex-col items-center rounded-md border border-slate-700 bg-slate-800 p-10 text-center">
                    <Package className="h-12 w-12 text-slate-500" />
                    <h2 className="mt-4 text-xl font-semibold text-white">No orders yet</h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Once you place an order, it will appear here.
                    </p>
                    <Link
                        href="/"
                        className="mt-6 inline-flex items-center rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-sky-400"
                    >
                        Browse products
                    </Link>
                </div>
            ) : (
                <>
                    <div className="mt-8 space-y-4">
                        {items.map((order) => {
                            const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
                            const orderCurrency = order.items[0]?.currency ?? "INR";
                            return (
                                <Link
                                    key={order._id}
                                    href={`/orders/${order._id}`}
                                    className="block rounded-md border border-slate-700 bg-slate-800 p-5 transition hover:border-slate-600"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                                                >
                                                    {STATUS_LABELS[order.status]}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    Placed {formatDate(order.createdAt)}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-sm text-slate-300">
                                                {itemCount} {itemCount === 1 ? "item" : "items"}
                                            </div>
                                            <div className="mt-1 truncate font-mono text-xs text-slate-500">
                                                #{order._id}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-semibold text-white">
                                                {formatMoney(order.total, orderCurrency)}
                                            </div>
                                            <div className="mt-1 text-xs text-sky-400">
                                                View details →
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-8 flex items-center justify-between text-sm">
                            <Link
                                href={`/orders?page=${page - 1}`}
                                aria-disabled={page <= 1}
                                tabIndex={page <= 1 ? -1 : undefined}
                                className={`rounded-md border border-slate-700 px-4 py-2 ${
                                    page <= 1
                                        ? "pointer-events-none opacity-40"
                                        : "text-slate-200 hover:border-slate-600"
                                }`}
                            >
                                ← Previous
                            </Link>
                            <span className="text-slate-400">
                                Page {page} of {totalPages}
                            </span>
                            <Link
                                href={`/orders?page=${page + 1}`}
                                aria-disabled={page >= totalPages}
                                tabIndex={page >= totalPages ? -1 : undefined}
                                className={`rounded-md border border-slate-700 px-4 py-2 ${
                                    page >= totalPages
                                        ? "pointer-events-none opacity-40"
                                        : "text-slate-200 hover:border-slate-600"
                                }`}
                            >
                                Next →
                            </Link>
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
