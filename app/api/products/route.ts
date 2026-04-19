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
        const category = url.searchParams.get("category");
        const minPrice = url.searchParams.get("minPrice");
        const maxPrice = url.searchParams.get("maxPrice");
        const sort = url.searchParams.get("sort") ?? "newest";

        const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
        const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "12")));

        const filter: Record<string, unknown> = {};
        if (q) filter.title = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        if (category) filter.categories = category;

        const priceFilter: Record<string, number> = {};
        if (minPrice !== null && !isNaN(Number(minPrice))) priceFilter.$gte = Number(minPrice);
        if (maxPrice !== null && !isNaN(Number(maxPrice))) priceFilter.$lte = Number(maxPrice);
        if (Object.keys(priceFilter).length > 0) filter.price = priceFilter;

        const sortMap: Record<string, Record<string, 1 | -1>> = {
            newest: { createdAt: -1 },
            price_asc: { price: 1 },
            price_desc: { price: -1 },
        };
        const sortSpec = sortMap[sort] ?? sortMap.newest;

        const products = await productsCollection();
        const cursor = products
            .find(filter)
            .sort(sortSpec)
            .project({ title: 1, price: 1, currency: 1, images: 1, slug: 1, stock: 1 });
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
        const existingSlug = await products.findOne({ slug: parsed.data.slug });
        if (existingSlug) {
            return NextResponse.json({ error: "A product with this slug already exists" }, { status: 409 });
        }

        if (parsed.data.categories.length > 0) {
            const categories = await categoriesCollection();
            const validCount = await categories.countDocuments({ _id: { $in: parsed.data.categories } });
            if (validCount !== parsed.data.categories.length) {
                return NextResponse.json({ error: "One or more category IDs are invalid" }, { status: 400 });
            }
        }

        await products.insertOne(product);

        return NextResponse.json({ product }, { status: 201 });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to add the product" }, { status: 500 });
    }
}