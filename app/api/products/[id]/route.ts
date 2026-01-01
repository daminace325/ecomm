import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import { productsCollection } from "@/lib/collections";
import { UpdateProductSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const products = await productsCollection();
        const product = await products.findOne({ _id: params.id });

        if (!product) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ product });
    } catch (err) {
        return NextResponse.json({ error: "Failed to get the product" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const body = await req.json();
        const parsed = UpdateProductSchema.safeParse(body);
        if (!parsed.success) {
            const flattenedParsed = z.flattenError(parsed.error);
            return NextResponse.json({ error: flattenedParsed.fieldErrors }, { status: 400 });
        }

        const now = new Date().toISOString();

        const updatedData = {
            ...parsed.data,
            updatedAt: now
        };
        const products = await productsCollection();
        const result = await products.updateOne({ _id: params.id }, { $set: updatedData });

        if (result.matchedCount === 0) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const updated = await products.findOne({_id: params.id});
        return NextResponse.json({ product: updated })
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to update the product" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const products = await productsCollection();
        const result = await products.deleteOne({ _id: params.id });

        if (result.deletedCount === 0) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to delete the product" }, { status: 500 });
    }
}