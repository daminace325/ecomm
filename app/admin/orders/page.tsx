import Link from "next/link";
import { ordersCollection, usersCollection } from "@/lib/collections";
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

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Order Placed" },
    { value: "paid", label: "Payment Received" },
    { value: "processing", label: "Preparing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
];

function formatMoney(value: number, currency: string) {
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
    } catch {
        return `${currency} ${value.toFixed(2)}`;
    }
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default async function AdminOrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; status?: string }>;
}) {
    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page ?? "1") || 1);
    const statusParam = sp.status ?? "all";
    const isStatusFilter = FILTERS.some(
        (f) => f.value !== "all" && f.value === statusParam
    );

    const filter = isStatusFilter ? { status: statusParam as OrderStatus } : {};

    const orders = await ordersCollection();
    const total = await orders.countDocuments(filter);
    const items = await orders
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray();

    const userIds = Array.from(new Set(items.map((o) => o.userId)));
    const users = await usersCollection();
    const userDocs = userIds.length
        ? await users
              .find({ _id: { $in: userIds } })
              .project({ name: 1, email: 1 })
              .toArray()
        : [];
    const userById = new Map(userDocs.map((u) => [u._id as string, u]));

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    function pageHref(p: number) {
        const params = new URLSearchParams();
        if (p > 1) params.set("page", String(p));
        if (statusParam !== "all") params.set("status", statusParam);
        const qs = params.toString();
        return qs ? `/admin/orders?${qs}` : `/admin/orders`;
    }

    function filterHref(value: string) {
        const params = new URLSearchParams();
        if (value !== "all") params.set("status", value);
        const qs = params.toString();
        return qs ? `/admin/orders?${qs}` : `/admin/orders`;
    }

    return (
        <div className="px-8 py-8">
            <div className="mb-6">
                <h1 className="text-3xl font-semibold text-white">Orders</h1>
                <p className="mt-1 text-sm text-slate-400">
                    {total} {total === 1 ? "order" : "orders"}
                    {isStatusFilter ? ` in ${STATUS_LABELS[statusParam as OrderStatus]}` : ""}
                </p>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
                {FILTERS.map((f) => {
                    const active = statusParam === f.value || (f.value === "all" && !isStatusFilter);
                    return (
                        <Link
                            key={f.value}
                            href={filterHref(f.value)}
                            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                                active
                                    ? "border-sky-500 bg-sky-500/10 text-sky-300"
                                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                            }`}
                        >
                            {f.label}
                        </Link>
                    );
                })}
            </div>

            {items.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">
                    No orders found.
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-900/60 text-left text-xs uppercase tracking-wide text-slate-400">
                                <th className="px-4 py-3">Order</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Items</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {items.map((order) => {
                                const user = userById.get(order.userId);
                                const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
                                return (
                                    <tr key={order._id} className="hover:bg-slate-800/40">
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-xs text-slate-300">
                                                #{order._id.slice(0, 8)}…
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-200">
                                                {user?.name ?? "Unknown"}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {user?.email ?? ""}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-400">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-300">
                                            {itemCount}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-white">
                                            {formatMoney(order.total, "INR")}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                                            >
                                                {STATUS_LABELS[order.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={`/admin/orders/${order._id}`}
                                                className="text-xs font-medium text-sky-400 hover:text-sky-300"
                                            >
                                                Manage →
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between text-sm">
                    <Link
                        href={pageHref(page - 1)}
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
                        href={pageHref(page + 1)}
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
        </div>
    );
}
