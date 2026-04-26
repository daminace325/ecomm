import Link from "next/link";
import { notFound } from "next/navigation";
import { categoriesCollection, productsCollection } from "@/lib/collections";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const SORT_OPTIONS = [
    { value: "newest", label: "Newest" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "title_asc", label: "Name: A–Z" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function sortToMongo(sort: SortValue): Record<string, 1 | -1> {
    switch (sort) {
        case "price_asc":
            return { price: 1 };
        case "price_desc":
            return { price: -1 };
        case "title_asc":
            return { title: 1 };
        case "newest":
        default:
            return { createdAt: -1 };
    }
}

export default async function CategoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string; sort?: string }>;
}) {
    const { slug } = await params;
    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page ?? "1") || 1);
    const sort = (SORT_OPTIONS.find((o) => o.value === sp.sort)?.value ?? "newest") as SortValue;

    const categories = await categoriesCollection();
    const category = await categories.findOne({ slug });
    if (!category) notFound();

    // Build the set of category ids to query: this category itself + any
    // children (categories are limited to 2 levels). For a child category
    // there are no further descendants.
    const childIds = await categories
        .find({ parentId: category._id })
        .project({ _id: 1 })
        .toArray();
    const ids = [category._id as string, ...childIds.map((c) => c._id as string)];

    const parent = category.parentId
        ? await categories.findOne(
              { _id: category.parentId },
              { projection: { name: 1, slug: 1 } }
          )
        : null;

    const products = await productsCollection();
    const filter = { categories: { $in: ids } };
    const total = await products.countDocuments(filter);
    const items = await products
        .find(filter)
        .sort(sortToMongo(sort))
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .project({ title: 1, slug: 1, price: 1, currency: 1, images: 1 })
        .toArray();

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    function pageHref(p: number) {
        const params = new URLSearchParams();
        if (p > 1) params.set("page", String(p));
        if (sort !== "newest") params.set("sort", sort);
        const qs = params.toString();
        return qs ? `/c/${slug}?${qs}` : `/c/${slug}`;
    }

    function sortHref(value: string) {
        const params = new URLSearchParams();
        if (value !== "newest") params.set("sort", value);
        const qs = params.toString();
        return qs ? `/c/${slug}?${qs}` : `/c/${slug}`;
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8">
            <nav className="text-sm text-slate-400">
                <Link href="/" className="hover:text-sky-400">
                    Home
                </Link>
                {parent && (
                    <>
                        <span className="mx-2 text-slate-600">/</span>
                        <Link href={`/c/${parent.slug}`} className="hover:text-sky-400">
                            {parent.name}
                        </Link>
                    </>
                )}
                <span className="mx-2 text-slate-600">/</span>
                <span className="text-slate-300">{category.name}</span>
            </nav>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-white">{category.name}</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        {total} {total === 1 ? "product" : "products"}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-400">Sort:</span>
                    {SORT_OPTIONS.map((o) => {
                        const active = sort === o.value;
                        return (
                            <Link
                                key={o.value}
                                href={sortHref(o.value)}
                                className={`rounded-md border px-3 py-1 text-xs transition ${
                                    active
                                        ? "border-sky-500 bg-sky-500/10 text-sky-300"
                                        : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                                }`}
                            >
                                {o.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="mt-10 rounded-md border border-slate-700 bg-slate-800 p-10 text-center text-slate-400">
                    No products in this category yet.
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

            {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-between text-sm">
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
        </main>
    );
}
