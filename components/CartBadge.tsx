"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";

type CartItem = { qty: number };

export default function CartBadge() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/cart")
            .then((r) => (r.ok ? r.json() : { cart: { items: [] as CartItem[] } }))
            .then((data) => {
                if (cancelled) return;
                const items: CartItem[] = data?.cart?.items ?? [];
                const total = items.reduce((sum, i) => sum + (i?.qty ?? 0), 0);
                setCount(total);
            })
            .catch(() => !cancelled && setCount(0));
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <Link
            href="/cart"
            aria-label="Cart"
            className="relative shrink-0 rounded-md p-2 hover:bg-slate-800"
        >
            <ShoppingCart className="h-6 w-6" />
            {count > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-sky-500 px-1.5 text-center text-xs font-bold text-white">
                    {count}
                </span>
            )}
        </Link>
    );
}
