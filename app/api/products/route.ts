import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import { categoriesCollection, productsCollection } from "@/lib/collections";
import { newId } from "@/lib/id";
import { CreateProductSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const q = url.searchParams.get("q") ?? "";

        const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "12")));

        const filter: any = {};
        if (q) filter.title = { $regex: q, $options: "i" };

        const products = await productsCollection();
        const cursor = products.find(filter).sort({ createdAt: -1 }).project({ title: 1, price: 1, images: 1, slug: 1, stock: 1 });
        const items = await cursor.skip((page - 1) * limit).limit(limit).toArray();
        const total = await products.countDocuments(filter);

        return NextResponse.json({ items, total, page, limit });
    } catch (err) {
        return NextResponse.json({ error: "Failed to get products" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const body = await req.json();
        const parsed = CreateProductSchema.safeParse(body);
        if (!parsed.success) {
            const flattenedParsed = z.flattenError(parsed.error);
            return NextResponse.json({ error: flattenedParsed.fieldErrors }, { status: 400 });
        }
        const now = new Date().toISOString();
        const _id = newId();

        const product = {
            _id,
            ...parsed.data,
            createdAt: now,
            updatedAt: now,
        };

        const products = await productsCollection();
        await products.insertOne(product);

        return NextResponse.json({ product }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: "Failed to add the product" }, { status: 500 });
    }
}