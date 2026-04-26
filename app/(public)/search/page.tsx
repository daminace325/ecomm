import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { productsCollection } from "@/lib/collections";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const SORT_OPTIONS = [
    { value: "relevance", label: "Relevance" },
    { value: "newest", label: "Newest" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

function escapeRegex(str: string) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; page?: string; sort?: string }>;
}) {
    const sp = await searchParams;
    const rawQuery = (sp.q ?? "").trim();
    const page = Math.max(1, Number(sp.page ?? "1") || 1);
    const sort = (SORT_OPTIONS.find((o) => o.value === sp.sort)?.value ?? "relevance") as SortValue;

    let total = 0;
    let items: Array<Record<string, unknown>> = [];

    if (rawQuery.length > 0) {
        const products = await productsCollection();
        const regex = new RegExp(escapeRegex(rawQuery), "i");
        const filter = {
            $or: [
                { title: { $regex: regex } },
                { description: { $regex: regex } },
                { tags: { $regex: regex } },
            ],
        };

        let mongoSort: Record<string, 1 | -1>;
        switch (sort) {
            case "price_asc":
                mongoSort = { price: 1 };
                break;
            case "price_desc":
                mongoSort = { price: -1 };
                break;
            case "newest":
                mongoSort = { createdAt: -1 };
                break;
            case "relevance":
            default:
                // No real text-index scoring — fall back to newest.
                mongoSort = { createdAt: -1 };
                break;
        }

        total = await products.countDocuments(filter);
        items = await products
            .find(filter)
            .sort(mongoSort)
            .skip((page - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE)
            .project({ title: 1, slug: 1, price: 1, currency: 1, images: 1 })
            .toArray();
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    function pageHref(p: number) {
        const params = new URLSearchParams();
        params.set("q", rawQuery);
        if (p > 1) params.set("page", String(p));
        if (sort !== "relevance") params.set("sort", sort);
        return `/search?${params.toString()}`;
    }

    function sortHref(value: string) {
        const params = new URLSearchParams();
        params.set("q", rawQuery);
        if (value !== "relevance") params.set("sort", value);
        return `/search?${params.toString()}`;
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8">
            <h1 className="text-3xl font-semibold text-white">Search</h1>

            <form action="/search" method="get" className="mt-4 flex gap-2">
                <input
                    type="search"
                    name="q"
                    defaultValue={rawQuery}
                    placeholder="Search products..."
                    autoFocus={!rawQuery}
                    className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-sky-400"
                >
                    <SearchIcon className="h-4 w-4" />
                    Search
                </button>
            </form>

            {rawQuery.length === 0 ? (
                <div className="mt-10 rounded-md border border-slate-700 bg-slate-800 p-10 text-center text-slate-400">
                    Enter a search term to find products.
                </div>
            ) : (
                <>
                    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                        <p className="text-sm text-slate-400">
                            {total} {total === 1 ? "result" : "results"} for{" "}
                            <span className="text-slate-200">&ldquo;{rawQuery}&rdquo;</span>
                        </p>
                        {total > 0 && (
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
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="mt-10 rounded-md border border-slate-700 bg-slate-800 p-10 text-center text-slate-400">
                            No products match your search. Try different keywords.
                        </div>
                    ) : (
                        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {items.map((p) => (
                                <ProductCard
                                    key={p._id as string}
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
                </>
            )}
        </main>
    );
}
