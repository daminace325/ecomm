import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import { categoriesCollection } from "@/lib/collections";
import { UpdateCategorySchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const categories = await categoriesCollection();
        const category = await categories.findOne({ _id: params.id });

        if (!category) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ category });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch the category" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const body = await req.json();
        const parsed = UpdateCategorySchema.safeParse(body);
        if (!parsed.success) {
            const flattenedParsed = z.flattenError(parsed.error);
            return NextResponse.json({ error: flattenedParsed }, { status: 400 });
        }

        const now = new Date().toISOString();

        const updatedData = {
            ...parsed.data,
            updatedAt: now
        }

        const categories = await categoriesCollection();
        const result = await categories.updateOne({ _id: params.id }, { $set: updatedData });

        if (result.matchedCount === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        const updated = await categories.findOne({ _id: params.id });
        return NextResponse.json({ category: updated });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to update the category" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);
        
        const categories = await categoriesCollection();
        const result = await categories.deleteOne({ _id: params.id });
        
        if (result.deletedCount === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });
        
        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to delete the category" }, { status: 500 })
    }
}