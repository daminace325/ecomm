import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import { categoriesCollection, productsCollection } from "@/lib/collections";
import { UpdateCategorySchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const categories = await categoriesCollection();
        const category = await categories.findOne({ _id: id });

        if (!category) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ category });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch the category" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const body = await req.json();
        const parsed = UpdateCategorySchema.safeParse(body);
        if (!parsed.success) {
            const flattenedParsed = z.flattenError(parsed.error);
            return NextResponse.json({ error: flattenedParsed.fieldErrors }, { status: 400 });
        }

        const now = new Date().toISOString();

        const updatedData = {
            ...parsed.data,
            updatedAt: now
        }

        const categories = await categoriesCollection();
        if (parsed.data.slug) {
            const existingSlug = await categories.findOne({ slug: parsed.data.slug, _id: { $ne: id } });
            if (existingSlug) {
                return NextResponse.json({ error: "A category with this slug already exists" }, { status: 409 });
            }
        }

        if (parsed.data.parentId) {
            if (parsed.data.parentId === id) {
                return NextResponse.json({ error: "Category cannot be its own parent" }, { status: 400 });
            }
            const parent = await categories.findOne({ _id: parsed.data.parentId });
            if (!parent) {
                return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
            }
            if (parent.parentId) {
                return NextResponse.json({ error: "Only 2-level category nesting is allowed" }, { status: 400 });
            }
            if (parent.parentId === id) {
                return NextResponse.json({ error: "Circular category relationship not allowed" }, { status: 400 });
            }
            // If this category itself has children, it cannot become a child (would create grandchildren).
            const hasChildren = await categories.countDocuments({ parentId: id });
            if (hasChildren > 0) {
                return NextResponse.json(
                    { error: "Cannot nest: this category already has subcategories" },
                    { status: 400 }
                );
            }
        }

        const result = await categories.updateOne({ _id: id }, { $set: updatedData });

        if (result.matchedCount === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        const updated = await categories.findOne({ _id: id });
        return NextResponse.json({ category: updated });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to update the category" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const categories = await categoriesCollection();
        const products = await productsCollection();

        const [childCount, productCount] = await Promise.all([
            categories.countDocuments({ parentId: id }),
            products.countDocuments({ categories: id }),
        ]);

        if (childCount > 0 || productCount > 0) {
            const parts: string[] = [];
            if (childCount > 0) parts.push(`${childCount} subcategor${childCount === 1 ? "y" : "ies"}`);
            if (productCount > 0) parts.push(`${productCount} product${productCount === 1 ? "" : "s"}`);
            return NextResponse.json(
                {
                    error: `Cannot delete: category still has ${parts.join(" and ")}. Reassign or delete them first.`,
                    childCount,
                    productCount,
                },
                { status: 409 }
            );
        }

        const result = await categories.deleteOne({ _id: id });

        if (result.deletedCount === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to delete the category" }, { status: 500 })
    }
}