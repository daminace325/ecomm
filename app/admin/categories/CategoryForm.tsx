"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/models/types";

type Props = {
    mode: "create" | "edit";
    initial?: Pick<Category, "_id" | "name" | "slug" | "parentId">;
    parentOptions: Array<{ _id: string; name: string }>;
};

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function CategoryForm({ mode, initial, parentOptions }: Props) {
    const router = useRouter();
    const [name, setName] = useState(initial?.name ?? "");
    const [slug, setSlug] = useState(initial?.slug ?? "");
    const [parentId, setParentId] = useState<string>(initial?.parentId ?? "");
    const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function onNameChange(value: string) {
        setName(value);
        if (!slugTouched) setSlug(slugify(value));
    }

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const payload: Record<string, unknown> = { name: name.trim(), slug: slug.trim() };
        if (parentId) payload.parentId = parentId;

        try {
            const url =
                mode === "create"
                    ? "/api/categories"
                    : `/api/categories/${initial!._id}`;
            const method = mode === "create" ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(
                    typeof data.error === "string"
                        ? data.error
                        : "Failed to save category"
                );
                return;
            }

            router.push("/admin/categories");
            router.refresh();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
            {error && (
                <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                </div>
            )}

            <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                    Name
                </label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                    Slug
                </label>
                <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugTouched(true);
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                    URL-friendly identifier. Used at /c/&lt;slug&gt;.
                </p>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                    Parent category
                </label>
                <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                    <option value="">— None (top level) —</option>
                    {parentOptions
                        .filter((c) => c._id !== initial?._id)
                        .map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name}
                            </option>
                        ))}
                </select>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400 disabled:opacity-60"
                >
                    {loading
                        ? "Saving..."
                        : mode === "create"
                          ? "Create category"
                          : "Save changes"}
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/admin/categories")}
                    className="rounded border border-slate-700 px-4 py-2 font-medium text-slate-200 hover:bg-slate-800"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
