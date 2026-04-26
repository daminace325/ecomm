import Link from "next/link";
import { categoriesCollection, productsCollection } from "@/lib/collections";
import ProductCard from "@/components/ProductCard";

// ISR: regenerate the home page at most once every 60 seconds.
// Reads from MongoDB but doesn't need instant consistency, so we
// serve a cached page and refresh in the background.
export const revalidate = 60;

export default async function Home() {
    const categories = await categoriesCollection();
    const products = await productsCollection();

    const allCategories = await categories
        .find({})
        .project({ name: 1, slug: 1, parentId: 1 })
        .toArray();

    // Build parent -> children map (categories are limited to 2 levels deep).
    const childrenByParent = new Map<string, string[]>();
    for (const c of allCategories) {
        const parentId = c.parentId as string | null | undefined;
        if (!parentId) continue;
        const arr = childrenByParent.get(parentId) ?? [];
        arr.push(c._id as string);
        childrenByParent.set(parentId, arr);
    }

    const topCategories = allCategories
        .filter((c) => !c.parentId)
        .sort((a, b) => (a.name as string).localeCompare(b.name as string))
        .slice(0, 10);

    const sections = await Promise.all(
        topCategories.map(async (cat) => {
            const ids = [cat._id as string, ...(childrenByParent.get(cat._id as string) ?? [])];
            const items = await products
                .find({ categories: { $in: ids } })
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
                <div className="rounded-md border border-slate-700 bg-slate-800 p-8 text-center text-slate-400">
                    No categories yet. Add some via the admin to populate the storefront.
                </div>
            )}

            <div className="space-y-8">
                {sections.map(({ category, items }) => (
                    <section
                        key={category._id}
                        className="rounded-md border border-slate-700 bg-slate-800 p-4 shadow-sm"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">
                                {category.name}
                            </h2>
                            <Link
                                href={`/c/${category.slug}`}
                                className="text-sm text-sky-400 hover:underline"
                            >
                                See all →
                            </Link>
                        </div>

                        {items.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-300">
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

