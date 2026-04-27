"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AuthError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
            <p className="text-sm font-medium uppercase tracking-widest text-rose-400">Error</p>
            <h1 className="mt-3 text-2xl font-semibold">We couldn’t load this page</h1>
            <p className="mt-3 text-sm text-slate-400">
                Please try again, or head back to sign in.
            </p>
            {error?.digest && (
                <p className="mt-2 text-xs text-slate-500">Error ID: {error.digest}</p>
            )}
            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center justify-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                >
                    Try again
                </button>
                <Link
                    href="/signin"
                    className="inline-flex items-center justify-center rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500"
                >
                    Sign in
                </Link>
            </div>
        </main>
    );
}
