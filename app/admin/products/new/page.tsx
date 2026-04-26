import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { categoriesCollection } from "@/lib/collections";
import ProductForm from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
    const categories = await categoriesCollection();
    const cats = await categories
        .find({})
        .sort({ name: 1 })
        .project({ name: 1, parentId: 1 })
        .toArray();

    // Only show leaf categories (those with no children) so admins don't tag
    // products with high-level groups when a more specific subcategory exists.
    const parentIds = new Set(
        cats.map((c) => c.parentId as string | null | undefined).filter(Boolean) as string[]
    );
    const nameById = new Map(cats.map((c) => [c._id as string, c.name as string]));

    const categoryOptions = cats
        .filter((c) => !parentIds.has(c._id as string))
        .map((c) => {
            const parentId = c.parentId as string | null | undefined;
            const parentName = parentId ? nameById.get(parentId) : null;
            return {
                _id: c._id as string,
                name: parentName ? `${parentName} — ${c.name as string}` : (c.name as string),
            };
        });

    return (
        <div className="px-8 py-8">
            <Link
                href="/admin/products"
                className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to products
            </Link>
            <h1 className="mb-6 text-3xl font-semibold text-white">New product</h1>
            <ProductForm mode="create" categoryOptions={categoryOptions} />
        </div>
    );
}
