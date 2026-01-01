import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import { categoriesCollection } from "@/lib/collections";
import { newId } from "@/lib/id";
import { CreateCategorySchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
    try {
        const categories = await categoriesCollection();
        const items = await categories.find({}).sort({ name: 1 }).toArray();
        return NextResponse.json({ items })
    } catch (err) {
        return NextResponse.json({ error: "Failed to get categories" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const body = await req.json();
        const parsed = CreateCategorySchema.safeParse(body);

        if (!parsed.success) {
            const flattenedParsed = z.flattenError(parsed.error);
            return NextResponse.json({ error: flattenedParsed.fieldErrors }, { status: 400 });
        }

        const now = new Date().toISOString();
        const _id = newId();

        const category = {
            _id,
            ...parsed.data,
            createdAt: now,
            updatedAt: now
        }

        const categories = await categoriesCollection();
        await categories.insertOne(category);

        return NextResponse.json({ category }, { status: 201 });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to add the category" }, { status: 500 })
    }
}