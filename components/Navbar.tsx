import Link from "next/link";
import { Search, User } from "lucide-react";
import { categoriesCollection } from "@/lib/collections";
import { getUserFromCookies } from "@/lib/auth_server";
import CartBadge from "./CartBadge";

export default async function Navbar() {
    const categories = await categoriesCollection();
    const [topCategories, user] = await Promise.all([
        categories
            .find({ $or: [{ parentId: null }, { parentId: { $exists: false } }] })
            .sort({ name: 1 })
            .limit(10)
            .toArray(),
        getUserFromCookies(),
    ]);

    return (
        <header className="sticky top-0 z-50 bg-slate-900 text-white shadow">
            <div className="flex items-center gap-4 px-4 py-3">
                <Link href="/" className="shrink-0 text-2xl font-bold tracking-tight">
                    Kart<span className="text-sky-400">It</span>
                </Link>

                <form action="/search" className="flex-1">
                    <div className="flex w-full max-w-3xl mx-auto overflow-hidden rounded-md">
                        <input
                            name="q"
                            type="search"
                            placeholder="Search products..."
                            className="flex-1 bg-slate-100 px-4 py-2 text-slate-900 outline-none"
                        />
                        <button
                            type="submit"
                            aria-label="Search"
                            className="flex items-center justify-center bg-sky-500 px-4 text-white hover:bg-sky-400"
                        >
                            <Search className="h-5 w-5" />
                        </button>
                    </div>
                </form>

                <CartBadge isAuthenticated={!!user} />

                <Link
                    href="/account"
                    aria-label="Account"
                    className="shrink-0 rounded-md p-2 hover:bg-slate-800"
                >
                    <User className="h-6 w-6" />
                </Link>
            </div>

            <nav className="flex gap-1 overflow-x-auto bg-slate-800 px-4 py-1 text-sm">
                {topCategories.length === 0 ? (
                    <span className="px-2 py-1 text-slate-400">No categories yet</span>
                ) : (
                    topCategories.map((c) => (
                        <Link
                            key={c._id}
                            href={`/c/${c.slug}`}
                            className="whitespace-nowrap rounded px-3 py-1 hover:bg-slate-700"
                        >
                            {c.name}
                        </Link>
                    ))
                )}
            </nav>
        </header>
    );
}
