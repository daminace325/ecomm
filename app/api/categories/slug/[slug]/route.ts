import { categoriesCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const categories = await categoriesCollection();
        const category = await categories.findOne({ slug });

        if (!category) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ category });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch the category" }, { status: 500 });
    }
}
