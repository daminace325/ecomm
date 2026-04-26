import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { categoriesCollection, productsCollection } from "@/lib/collections";
import ProductForm from "../../ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const products = await productsCollection();
    const product = await products.findOne({ _id: id });
    if (!product) notFound();

    const categories = await categoriesCollection();
    const cats = await categories
        .find({})
        .sort({ name: 1 })
        .project({ name: 1, parentId: 1 })
        .toArray();

    // Only show leaf categories (those with no children).
    const parentIds = new Set(
        cats.map((c) => c.parentId as string | null | undefined).filter(Boolean) as string[]
    );
    const nameById = new Map(cats.map((c) => [c._id as string, c.name as string]));

    const selected = new Set<string>(product.categories ?? []);

    const categoryOptions = cats
        .filter((c) => {
            const id = c._id as string;
            // Include leaves, plus any currently-selected category (even if it
            // has since become a parent) so admins can see and re-tag it.
            return !parentIds.has(id) || selected.has(id);
        })
        .map((c) => {
            const id = c._id as string;
            const parentId = c.parentId as string | null | undefined;
            const parentName = parentId ? nameById.get(parentId) : null;
            const isStale = parentIds.has(id);
            const base = parentName ? `${parentName} — ${c.name as string}` : (c.name as string);
            return {
                _id: id,
                name: isStale ? `${base} (parent — please re-tag)` : base,
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
            <h1 className="mb-6 text-3xl font-semibold text-white">Edit product</h1>
            <ProductForm
                mode="edit"
                initial={{
                    _id: product._id,
                    title: product.title,
                    slug: product.slug,
                    description: product.description,
                    images: product.images ?? [],
                    price: product.price,
                    currency: product.currency,
                    categories: product.categories ?? [],
                    stock: product.stock,
                }}
                categoryOptions={categoryOptions}
            />
        </div>
    );
}
