import { productsCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const products = await productsCollection();
        const product = await products.findOne({ slug });

        if (!product) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ product });
    } catch (err) {
        return NextResponse.json({ error: "Failed to get the product" }, { status: 500 });
    }
}
