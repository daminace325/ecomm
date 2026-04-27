import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { categoriesCollection, productsCollection } from "@/lib/collections";
import { formatMoney } from "@/lib/money";
import ProductGallery from "@/components/ProductGallery";
import AddToCart from "@/components/AddToCart";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const products = await productsCollection();
    const product = await products.findOne({ slug });
    if (!product) notFound();

    const categories = await categoriesCollection();
    const productCats = product.categories?.length
        ? await categories
              .find({ _id: { $in: product.categories } })
              .project({ name: 1, slug: 1, parentId: 1 })
              .toArray()
        : [];

    // Pick the first leaf category for breadcrumbs (most specific).
    const primary = productCats[0];
    const primaryParent =
        primary?.parentId
            ? await categories.findOne(
                  { _id: primary.parentId },
                  { projection: { name: 1, slug: 1 } }
              )
            : null;

    const stock = product.stock ?? 0;

    return (
        <main className="mx-auto max-w-7xl px-4 py-6">
            {/* Breadcrumbs */}
            <nav className="mb-6 flex items-center gap-1 text-sm text-slate-400">
                <Link href="/" className="hover:text-white">
                    Home
                </Link>
                {primaryParent && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <Link href={`/c/${primaryParent.slug}`} className="hover:text-white">
                            {primaryParent.name}
                        </Link>
                    </>
                )}
                {primary && (
                    <>
                        <ChevronRight className="h-4 w-4" />
                        <Link href={`/c/${primary.slug}`} className="hover:text-white">
                            {primary.name}
                        </Link>
                    </>
                )}
                <ChevronRight className="h-4 w-4" />
                <span className="truncate text-slate-300">{product.title}</span>
            </nav>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <ProductGallery
                    images={product.images ?? []}
                    title={product.title}
                />

                <div className="flex flex-col">
                    <h1 className="text-3xl font-semibold text-white">
                        {product.title}
                    </h1>

                    {productCats.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {productCats.map((c) => (
                                <Link
                                    key={c._id}
                                    href={`/c/${c.slug}`}
                                    className="rounded-full border border-slate-700 bg-slate-800 px-3 py-0.5 text-xs text-slate-300 hover:border-sky-500/50 hover:text-white"
                                >
                                    {c.name}
                                </Link>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-white">
                            {formatMoney(product.price, product.currency ?? "INR")}
                        </span>
                    </div>

                    <div className="mt-6 border-t border-slate-800 pt-6">
                        <AddToCart productId={product._id} stock={stock} />
                    </div>

                    {product.description && (
                        <div className="mt-8 border-t border-slate-800 pt-6">
                            <h2 className="mb-3 text-lg font-semibold text-white">
                                Description
                            </h2>
                            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                                {product.description}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
