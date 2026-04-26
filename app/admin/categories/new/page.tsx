import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { categoriesCollection } from "@/lib/collections";
import CategoryForm from "../CategoryForm";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
    const categories = await categoriesCollection();
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
            <h1 className="mb-6 text-3xl font-semibold text-white">New category</h1>
            <CategoryForm mode="create" parentOptions={parentOptions} />
        </div>
    );
}
