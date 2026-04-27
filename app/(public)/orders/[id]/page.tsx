import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { getUserFromCookies } from "@/lib/auth_server";
import { ordersCollection, productsCollection } from "@/lib/collections";
import { formatMoney } from "@/lib/money";
import type { OrderStatus } from "@/models/types";
import CancelOrderButton from "@/components/CancelOrderButton";

export const dynamic = "force-dynamic";

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

const TIMELINE: OrderStatus[] = ["pending", "paid", "processing", "shipped", "delivered"];
const CANCELLABLE: OrderStatus[] = ["pending", "paid"];

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const user = await getUserFromCookies();
    const { id } = await params;
    if (!user) redirect(`/signin?next=/orders/${id}`);

    const orders = await ordersCollection();
    const order = await orders.findOne({ _id: id });

    if (!order) notFound();
    if (order.userId !== user._id && user.role !== "admin") notFound();

    const products = await productsCollection();
    const productDocs = await products
        .find({ _id: { $in: order.items.map((i) => i.productId) } })
        .project({ title: 1, slug: 1, images: 1, currency: 1 })
        .toArray();
    const productById = new Map(productDocs.map((p) => [p._id as string, p]));

    // Order-level currency: pick the first item's snapshot, fall back to live
    // product, then INR. All items in an order share a currency in practice.
    const orderCurrency =
        order.items[0]?.currency ??
        productById.get(order.items[0]?.productId)?.currency ??
        "INR";

    const isTerminalCancelled = order.status === "cancelled";
    const isTerminalRefunded = order.status === "refunded";
    const currentTimelineIdx = TIMELINE.indexOf(order.status);
    const showTimeline = !isTerminalCancelled && !isTerminalRefunded;
    const canCancel = CANCELLABLE.includes(order.status);

    return (
        <main className="mx-auto max-w-5xl px-4 py-10">
            <div className="text-sm text-slate-400">
                <Link href="/orders" className="hover:text-sky-400">
                    Your orders
                </Link>
                <span className="mx-2 text-slate-600">/</span>
                <span className="text-slate-300">Order details</span>
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-white">Order details</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                        <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                        >
                            {STATUS_LABELS[order.status]}
                        </span>
                        <span>Placed {formatDateTime(order.createdAt)}</span>
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-500">#{order._id}</div>
                </div>
                {canCancel && <CancelOrderButton orderId={order._id} />}
            </div>

            {showTimeline && (
                <section className="mt-8 rounded-md border border-slate-700 bg-slate-800 p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                        Progress
                    </h2>
                    <ol className="mt-5 grid gap-6 sm:grid-cols-5">
                        {TIMELINE.map((status, idx) => {
                            const reached = idx <= currentTimelineIdx;
                            const isCurrent = idx === currentTimelineIdx;
                            return (
                                <li key={status} className="flex flex-col items-start">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                                                reached
                                                    ? "border-sky-500 bg-sky-500/20 text-sky-300"
                                                    : "border-slate-600 bg-slate-900 text-slate-600"
                                            }`}
                                        >
                                            {reached ? (
                                                <Check className="h-4 w-4" />
                                            ) : (
                                                <Circle className="h-3 w-3" />
                                            )}
                                        </div>
                                    </div>
                                    <div
                                        className={`mt-2 text-xs font-medium ${
                                            isCurrent
                                                ? "text-sky-300"
                                                : reached
                                                  ? "text-slate-200"
                                                  : "text-slate-500"
                                        }`}
                                    >
                                        {STATUS_LABELS[status]}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            )}

            {isTerminalCancelled && (
                <section className="mt-8 rounded-md border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
                    This order was cancelled
                    {order.updatedAt ? ` on ${formatDateTime(order.updatedAt)}` : ""}. Stock has
                    been restored.
                </section>
            )}

            {isTerminalRefunded && (
                <section className="mt-8 rounded-md border border-slate-500/40 bg-slate-500/10 p-6 text-sm text-slate-300">
                    This order was refunded
                    {order.updatedAt ? ` on ${formatDateTime(order.updatedAt)}` : ""}.
                </section>
            )}

            <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
                <section>
                    <h2 className="text-lg font-semibold text-white">Items</h2>
                    <div className="mt-4 divide-y divide-slate-700 rounded-md border border-slate-700 bg-slate-800">
                        {order.items.map((item, idx) => {
                            const product = productById.get(item.productId);
                            // Prefer the snapshot recorded at order time; fall
                            // back to the live product (covers legacy orders).
                            const title = item.title ?? product?.title ?? "Unavailable product";
                            const image = item.image ?? product?.images?.[0] ?? null;
                            const slug = item.slug ?? product?.slug ?? null;
                            const currency = item.currency ?? product?.currency ?? "INR";
                            const lineTotal = item.price * item.qty;
                            return (
                                <div
                                    key={`${item.productId}-${idx}`}
                                    className="flex gap-4 p-4"
                                >
                                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-slate-900">
                                        {image ? (
                                            <Image
                                                src={image}
                                                alt={title}
                                                width={64}
                                                height={64}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : null}
                                    </div>
                                    <div className="flex flex-1 items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            {slug ? (
                                                <Link
                                                    href={`/p/${slug}`}
                                                    className="truncate text-sm font-medium text-white hover:text-sky-300"
                                                >
                                                    {title}
                                                </Link>
                                            ) : (
                                                <div className="truncate text-sm font-medium text-slate-300">
                                                    {title}
                                                </div>
                                            )}
                                            <div className="text-xs text-slate-400">
                                                Qty {item.qty} ·{" "}
                                                {formatMoney(item.price, currency)} each
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-white">
                                            {formatMoney(lineTotal, currency)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <aside className="space-y-6">
                    <div className="rounded-md border border-slate-700 bg-slate-800 p-6">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                            Shipping address
                        </h2>
                        <div className="mt-3 text-sm text-slate-200">
                            <div className="font-medium text-white">
                                {order.shippingAddress.line1}
                            </div>
                            {order.shippingAddress.line2 && (
                                <div>{order.shippingAddress.line2}</div>
                            )}
                            <div className="text-slate-400">
                                {order.shippingAddress.city}
                                {order.shippingAddress.state
                                    ? `, ${order.shippingAddress.state}`
                                    : ""}{" "}
                                {order.shippingAddress.postalCode}
                            </div>
                            {order.shippingAddress.country && (
                                <div className="text-slate-400">
                                    {order.shippingAddress.country}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-md border border-slate-700 bg-slate-800 p-6">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                            Summary
                        </h2>
                        <dl className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between text-slate-300">
                                <dt>Subtotal</dt>
                                <dd>{formatMoney(order.subtotal, orderCurrency)}</dd>
                            </div>
                            <div className="flex justify-between text-slate-300">
                                <dt>Shipping</dt>
                                <dd>
                                    {order.shipping
                                        ? formatMoney(order.shipping, orderCurrency)
                                        : "Free"}
                                </dd>
                            </div>
                            <div className="flex justify-between text-slate-300">
                                <dt>Tax</dt>
                                <dd>{order.tax ? formatMoney(order.tax, orderCurrency) : "—"}</dd>
                            </div>
                            <div className="my-3 h-px bg-slate-700" />
                            <div className="flex justify-between text-base font-semibold text-white">
                                <dt>Total</dt>
                                <dd>{formatMoney(order.total, orderCurrency)}</dd>
                            </div>
                        </dl>
                    </div>
                </aside>
            </div>
        </main>
    );
}
