import Link from "next/link";
import { categoriesCollection, productsCollection } from "@/lib/collections";
import ProductCard from "@/components/ProductCard";

export default async function Home() {
    const categories = await categoriesCollection();
    const products = await productsCollection();

    const topCategories = await categories
        .find({ $or: [{ parentId: null }, { parentId: { $exists: false } }] })
        .sort({ name: 1 })
        .limit(10)
        .toArray();

    const sections = await Promise.all(
        topCategories.map(async (cat) => {
            const items = await products
                .find({ categories: cat._id })
                .sort({ createdAt: -1 })
                .limit(8)
                .project({ title: 1, price: 1, currency: 1, images: 1, slug: 1 })
                .toArray();
            return { category: cat, items };
        })
    );

    return (
        <main className="mx-auto max-w-7xl px-4 py-6">
            {sections.length === 0 && (
                <div className="rounded-md bg-white p-8 text-center text-zinc-500">
                    No categories yet. Add some via the admin to populate the storefront.
                </div>
            )}

            <div className="space-y-8">
                {sections.map(({ category, items }) => (
                    <section
                        key={category._id}
                        className="rounded-md bg-white p-4 shadow-sm"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-zinc-900">
                                {category.name}
                            </h2>
                            <Link
                                href={`/c/${category.slug}`}
                                className="text-sm text-sky-600 hover:underline"
                            >
                                See all →
                            </Link>
                        </div>

                        {items.length === 0 ? (
                            <p className="py-8 text-center text-sm text-zinc-500">
                                No products in this category yet.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                {items.map((p) => (
                                    <ProductCard
                                        key={p._id}
                                        product={{
                                            _id: p._id as string,
                                            title: p.title as string,
                                            slug: p.slug as string,
                                            price: p.price as number,
                                            currency: p.currency as string | undefined,
                                            images: p.images as string[] | undefined,
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                ))}
            </div>
        </main>
    );
}

