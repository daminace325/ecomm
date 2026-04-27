"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import type { Product } from "@/models/types";
import { slugify } from "@/lib/strings";
import { formatApiError } from "@/lib/errors";
import { toMajor, toMinor } from "@/lib/money";

type CategoryOption = { _id: string; name: string };

type Props = {
    mode: "create" | "edit";
    initial?: Pick<
        Product,
        "_id" | "title" | "slug" | "description" | "images" | "price" | "currency" | "categories" | "stock"
    >;
    categoryOptions: CategoryOption[];
};

export default function ProductForm({ mode, initial, categoryOptions }: Props) {
    const router = useRouter();

    const [title, setTitle] = useState(initial?.title ?? "");
    const [slug, setSlug] = useState(initial?.slug ?? "");
    const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
    const [description, setDescription] = useState(initial?.description ?? "");
    // Form holds price in major units (e.g. "49.00" rupees). Stored in DB as
    // integer minor units (paise) — converted at submit and on initial load.
    const [price, setPrice] = useState<string>(
        initial?.price !== undefined ? String(toMajor(initial.price)) : ""
    );
    const [currency, setCurrency] = useState(initial?.currency ?? "INR");
    const [stock, setStock] = useState<string>(
        initial?.stock !== undefined ? String(initial.stock) : "0"
    );
    const [categories, setCategories] = useState<string[]>(initial?.categories ?? []);
    const [images, setImages] = useState<string[]>(initial?.images ?? []);

    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function onTitleChange(value: string) {
        setTitle(value);
        if (!slugTouched) setSlug(slugify(value));
    }

    function toggleCategory(id: string) {
        setCategories((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        setError(null);

        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/images/upload", {
                    method: "POST",
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) {
                    setError(formatApiError(data?.error, "Upload failed"));
                    break;
                }
                setImages((prev) => [...prev, data.url]);
            }
        } catch {
            setError("Network error during upload");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    }

    function removeImage(url: string) {
        setImages((prev) => prev.filter((i) => i !== url));
    }

    async function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        setError(null);

        const priceNum = Number(price);
        const stockNum = Number(stock);

        if (Number.isNaN(priceNum) || priceNum < 0) {
            setError("Price must be a non-negative number");
            return;
        }
        if (!Number.isInteger(stockNum) || stockNum < 0) {
            setError("Stock must be a non-negative integer");
            return;
        }

        setLoading(true);

        const payload = {
            title: title.trim(),
            slug: slug.trim(),
            description: description.trim() || undefined,
            images,
            price: toMinor(priceNum),
            currency: currency.trim() || "INR",
            categories,
            stock: stockNum,
        };

        try {
            const url =
                mode === "create" ? "/api/products" : `/api/products/${initial!._id}`;
            const method = mode === "create" ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(formatApiError(data?.error, "Failed to save product"));
                return;
            }

            router.push("/admin/products");
            router.refresh();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
            {error && (
                <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                </div>
            )}

            <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                    Title
                </label>
                <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
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
                    URL-friendly identifier. Used at /p/&lt;slug&gt;.
                </p>
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
                    Description
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-200">
                        Price
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-200">
                        Currency
                    </label>
                    <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-200">
                        Stock
                    </label>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                </div>
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                    Categories
                </label>
                {categoryOptions.length === 0 ? (
                    <p className="text-sm text-slate-400">
                        No categories yet. Create one first.
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {categoryOptions.map((c) => {
                            const active = categories.includes(c._id);
                            return (
                                <button
                                    type="button"
                                    key={c._id}
                                    onClick={() => toggleCategory(c._id)}
                                    className={
                                        active
                                            ? "rounded-full border border-sky-500 bg-sky-500/20 px-3 py-1 text-sm text-sky-200"
                                            : "rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
                                    }
                                >
                                    {c.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                    Images
                </label>

                {images.length > 0 && (
                    <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {images.map((url) => (
                            <div
                                key={url}
                                className="group relative aspect-square overflow-hidden rounded border border-slate-700 bg-slate-900"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(url)}
                                    className="absolute right-1 top-1 rounded-full bg-slate-900/80 p-1 text-red-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-500 hover:text-white"
                                    aria-label="Remove image"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
                    {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4" />
                    )}
                    {uploading ? "Uploading..." : "Upload images"}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        disabled={uploading}
                        onChange={handleUpload}
                        className="hidden"
                    />
                </label>
                <p className="mt-1 text-xs text-slate-400">
                    JPEG, PNG, WebP, or GIF. Max 5MB each.
                </p>
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={loading || uploading}
                    className="rounded bg-sky-500 px-4 py-2 font-medium text-white hover:bg-sky-400 disabled:opacity-60"
                >
                    {loading
                        ? "Saving..."
                        : mode === "create"
                          ? "Create product"
                          : "Save changes"}
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/admin/products")}
                    className="rounded border border-slate-700 px-4 py-2 font-medium text-slate-200 hover:bg-slate-800"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
