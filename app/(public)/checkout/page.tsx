import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, MapPin } from "lucide-react";
import { getUserFromCookies } from "@/lib/auth_server";
import { cartsCollection, productsCollection } from "@/lib/collections";
import CheckoutClient from "@/components/CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
    const user = await getUserFromCookies();
    if (!user) redirect("/signin?next=/checkout");

    const carts = await cartsCollection();
    const cart = await carts.findOne({ userId: user._id });
    const items = cart?.items ?? [];

    if (items.length === 0) {
        redirect("/cart");
    }

    const products = await productsCollection();
    const productDocs = await products
        .find({ _id: { $in: items.map((i) => i.productId) } })
        .project({ title: 1, slug: 1, images: 1, price: 1, currency: 1, stock: 1 })
        .toArray();
    const productById = new Map(productDocs.map((p) => [p._id as string, p]));

    type Row = {
        productId: string;
        title: string;
        image: string | null;
        qty: number;
        unitPrice: number;
        lineTotal: number;
        stockIssue: boolean;
        missing: boolean;
    };

    const rows: Row[] = items.map((item) => {
        const product = productById.get(item.productId);
        const lineTotal = item.priceAtAdd * item.qty;
        return {
            productId: item.productId,
            title: product?.title ?? "Unavailable product",
            image: product?.images?.[0] ?? null,
            qty: item.qty,
            unitPrice: item.priceAtAdd,
            lineTotal,
            stockIssue: !!product && product.stock < item.qty,
            missing: !product,
        };
    });

    const subtotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);
    const currency =
        (productDocs.find((p) => p.currency)?.currency as string | undefined) ?? "INR";
    const blocked = rows.some((r) => r.missing || r.stockIssue);
    const addresses = user.addresses ?? [];

    return (
        <main className="mx-auto max-w-6xl px-4 py-10">
            <h1 className="text-3xl font-semibold text-white">Checkout</h1>
            <p className="mt-1 text-sm text-slate-400">
                Review your shipping address and order summary, then place your order.
            </p>

            {addresses.length === 0 ? (
                <div className="mt-8 rounded-md border border-amber-500/40 bg-amber-500/10 p-6">
                    <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
                        <div className="flex-1">
                            <h2 className="font-medium text-amber-100">
                                You need a shipping address
                            </h2>
                            <p className="mt-1 text-sm text-amber-200/80">
                                Add a shipping address to your profile before placing an order.
                            </p>
                            <Link
                                href="/profile/addresses"
                                className="mt-4 inline-flex items-center rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-amber-400"
                            >
                                Add address
                            </Link>
                        </div>
                    </div>
                </div>
            ) : blocked ? (
                <div className="mt-8 rounded-md border border-red-500/40 bg-red-500/10 p-6">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
                        <div className="flex-1">
                            <h2 className="font-medium text-red-100">
                                Some items in your cart need attention
                            </h2>
                            <p className="mt-1 text-sm text-red-200/80">
                                One or more products are unavailable or out of stock. Update your
                                cart before checking out.
                            </p>
                            <Link
                                href="/cart"
                                className="mt-4 inline-flex items-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400"
                            >
                                Back to cart
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <CheckoutClient
                    addresses={addresses}
                    rows={rows}
                    subtotal={subtotal}
                    currency={currency}
                />
            )}
        </main>
    );
}
