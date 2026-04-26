import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { categoriesCollection } from "@/lib/collections";
import CategoryForm from "../../CategoryForm";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const categories = await categoriesCollection();
    const category = await categories.findOne({ _id: id });
    if (!category) notFound();

    const parents = await categories
        .find({ $or: [{ parentId: null }, { parentId: { $exists: false } }] })
        .sort({ name: 1 })
        .project({ name: 1 })
        .toArray();
    const parentOptions = parents.map((p) => ({
        _id: p._id as string,
        name: p.name as string,
    }));

    return (
        <div className="px-8 py-8">
            <Link
                href="/admin/categories"
                className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to categories
            </Link>
            <h1 className="mb-6 text-3xl font-semibold text-white">
                Edit category
            </h1>
            <CategoryForm
                mode="edit"
                initial={{
                    _id: category._id,
                    name: category.name,
                    slug: category.slug,
                    parentId: category.parentId ?? null,
                }}
                parentOptions={parentOptions}
            />
        </div>
    );
}
