"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") ?? "/";

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const signupRes = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const signupData = await signupRes.json();
            if (!signupRes.ok) {
                setError(typeof signupData.error === "string" ? signupData.error : "Sign up failed");
                return;
            }

            // Auto sign-in after successful signup so the user gets a session cookie.
            const signinRes = await fetch("/api/auth/signin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!signinRes.ok) {
                router.push(`/signin${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`);
                return;
            }

            router.push(next);
            router.refresh();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md items-center px-4 py-8">
            <div className="w-full rounded-md border border-slate-700 bg-slate-800 p-8 shadow-lg">
                <h1 className="mb-6 text-center text-2xl font-semibold text-white">
                    Create your KartIt account
                </h1>

                {error && (
                    <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-200">
                            Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-200">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-200">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-400 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                        />
                        <p className="mt-1 text-xs text-slate-400">At least 6 characters.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded bg-sky-500 px-4 py-2 font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-400">
                    Already have an account?{" "}
                    <Link
                        href={`/signin${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
                        className="font-medium text-sky-400 hover:underline"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </main>
    );
}
