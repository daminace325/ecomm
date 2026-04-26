import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingCart, AlertTriangle } from "lucide-react";
import { getUserFromCookies } from "@/lib/auth_server";
import { cartsCollection, productsCollection } from "@/lib/collections";
import CartItemControls from "@/components/CartItemControls";
import ClearCartButton from "@/components/ClearCartButton";

export const dynamic = "force-dynamic";

export default async function CartPage() {
    const user = await getUserFromCookies();
    if (!user) redirect("/signin?next=/cart");

    const carts = await cartsCollection();
    const cart = await carts.findOne({ userId: user._id });
    const items = cart?.items ?? [];

    const products = await productsCollection();
    const productDocs = items.length
        ? await products
              .find({ _id: { $in: items.map((i) => i.productId) } })
              .project({ title: 1, slug: 1, images: 1, price: 1, currency: 1, stock: 1 })
              .toArray()
        : [];
    const productById = new Map(productDocs.map((p) => [p._id as string, p]));

    const rows = items.map((item) => {
        const product = productById.get(item.productId);
        const lineTotal = item.priceAtAdd * item.qty;
        return { item, product, lineTotal };
    });

    const subtotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);
    const currency =
        (rows.find((r) => r.product?.currency)?.product?.currency as string | undefined) ?? "INR";

    if (items.length === 0) {
        return (
            <main className="mx-auto max-w-3xl px-4 py-16">
                <div className="flex flex-col items-center rounded-md border border-slate-700 bg-slate-800 p-10 text-center">
                    <ShoppingCart className="h-12 w-12 text-slate-500" />
                    <h1 className="mt-4 text-2xl font-semibold text-white">
                        Your cart is empty
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Browse the store and add items to get started.
                    </p>
                    <Link
                        href="/"
                        className="mt-6 rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
                    >
                        Continue shopping
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-6xl px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-semibold text-white">Your Cart</h1>
                <ClearCartButton />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-3">
                    {rows.map(({ item, product, lineTotal }) => {
                        if (!product) {
                            return (
                                <div
                                    key={item.productId}
                                    className="flex items-center gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
                                >
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <div className="flex-1">
                                        This product is no longer available. Remove it to continue.
                                    </div>
                                    <CartItemControls
                                        productId={item.productId}
                                        qty={item.qty}
                                        stock={0}
                                    />
                                </div>
                            );
                        }

                        const stock = (product.stock as number) ?? 0;
                        const cover = (product.images as string[] | undefined)?.[0];
                        const overStock = item.qty > stock;

                        return (
                            <div
                                key={item.productId}
                                className="flex flex-col gap-4 rounded-md border border-slate-700 bg-slate-800 p-4 sm:flex-row"
                            >
                                <Link
                                    href={`/p/${product.slug as string}`}
                                    className="h-24 w-24 shrink-0 overflow-hidden rounded bg-slate-900"
                                >
                                    {cover ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={cover}
                                            alt={product.title as string}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                                            No image
                                        </div>
                                    )}
                                </Link>

                                <div className="flex flex-1 flex-col gap-2">
                                    <Link
                                        href={`/p/${product.slug as string}`}
                                        className="font-medium text-white hover:text-sky-400"
                                    >
                                        {product.title as string}
                                    </Link>
                                    <p className="text-sm text-slate-400">
                                        {currency} {item.priceAtAdd} each
                                    </p>
                                    {overStock && (
                                        <p className="inline-flex items-center gap-1 text-xs text-amber-300">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            Only {stock} in stock — please reduce quantity.
                                        </p>
                                    )}
                                    {stock === 0 && (
                                        <p className="inline-flex items-center gap-1 text-xs text-red-300">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            Out of stock
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col items-end justify-between gap-3">
                                    <p className="text-base font-semibold text-white">
                                        {currency} {lineTotal}
                                    </p>
                                    <CartItemControls
                                        productId={item.productId}
                                        qty={item.qty}
                                        stock={stock}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <aside className="h-fit rounded-md border border-slate-700 bg-slate-800 p-5">
                    <h2 className="text-lg font-semibold text-white">Order summary</h2>
                    <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between text-slate-300">
                            <dt>
                                Subtotal ({rows.reduce((n, r) => n + r.item.qty, 0)} item
                                {rows.reduce((n, r) => n + r.item.qty, 0) === 1 ? "" : "s"})
                            </dt>
                            <dd>
                                {currency} {subtotal}
                            </dd>
                        </div>
                        <div className="flex justify-between text-slate-300">
                            <dt>Shipping</dt>
                            <dd className="text-slate-400">Calculated at checkout</dd>
                        </div>
                        <div className="flex justify-between border-t border-slate-700 pt-3 text-base font-semibold text-white">
                            <dt>Total</dt>
                            <dd>
                                {currency} {subtotal}
                            </dd>
                        </div>
                    </dl>

                    <Link
                        href="/checkout"
                        className="mt-5 block rounded-md bg-sky-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-sky-400"
                    >
                        Proceed to checkout
                    </Link>
                    <Link
                        href="/"
                        className="mt-2 block text-center text-sm text-slate-400 hover:text-white"
                    >
                        Continue shopping
                    </Link>
                </aside>
            </div>
        </main>
    );
}
