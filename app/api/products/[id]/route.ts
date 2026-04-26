import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import { categoriesCollection, ordersCollection, productsCollection } from "@/lib/collections";
import { destroyImagesByUrl } from "@/lib/cloudinary";
import { UpdateProductSchema } from "@/lib/validators";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Order statuses where the product is still "in flight" (not yet completed
// or cancelled). Deleting a product referenced by any of these would orphan
// active fulfillment work, so we block it.
const IN_FLIGHT_ORDER_STATUSES = ["pending", "paid", "processing", "shipped"] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const products = await productsCollection();
        const product = await products.findOne({ _id: id });

        if (!product) return NextResponse.json({ error: "Not Found" }, { status: 404 });

        return NextResponse.json({ product });
    } catch (err) {
        return NextResponse.json({ error: "Failed to get the product" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
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
        if (parsed.data.slug) {
            const existingSlug = await products.findOne({ slug: parsed.data.slug, _id: { $ne: id } });
            if (existingSlug) {
                return NextResponse.json({ error: "A product with this slug already exists" }, { status: 409 });
            }
        }

        if (parsed.data.categories && parsed.data.categories.length > 0) {
            const categories = await categoriesCollection();
            const validCount = await categories.countDocuments({ _id: { $in: parsed.data.categories } });
            if (validCount !== parsed.data.categories.length) {
                return NextResponse.json({ error: "One or more category IDs are invalid" }, { status: 400 });
            }
        }

        // If images array is being updated, find which existing images are no
        // longer referenced and delete them from Cloudinary (best-effort).
        let removedImages: string[] = [];
        if (parsed.data.images) {
            const existing = await products.findOne({ _id: id }, { projection: { images: 1 } });
            const oldImages = existing?.images ?? [];
            const newSet = new Set(parsed.data.images);
            removedImages = oldImages.filter((u) => !newSet.has(u));
        }

        const result = await products.updateOne({ _id: id }, { $set: updatedData });

        if (result.matchedCount === 0) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        if (removedImages.length > 0) {
            // Fire-and-forget; don't block the response on Cloudinary.
            destroyImagesByUrl(removedImages).catch(() => {});
        }

        const updated = await products.findOne({_id: id});
        return NextResponse.json({ product: updated })
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to update the product" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const products = await productsCollection();

        // Block delete if any in-flight order references this product. Admin
        // must cancel/refund those orders first. Delivered/cancelled/refunded
        // orders are unaffected because their display is preserved by the
        // snapshot fields on each order item.
        const orders = await ordersCollection();
        const inFlightCount = await orders.countDocuments({
            "items.productId": id,
            status: { $in: [...IN_FLIGHT_ORDER_STATUSES] },
        });
        if (inFlightCount > 0) {
            return NextResponse.json(
                {
                    error: `Cannot delete: this product is part of ${inFlightCount} active order${inFlightCount === 1 ? "" : "s"}. Cancel or complete ${inFlightCount === 1 ? "it" : "them"} first.`,
                },
                { status: 409 }
            );
        }

        // Read images first so we can clean them up after the delete.
        const product = await products.findOne({ _id: id }, { projection: { images: 1 } });
        const result = await products.deleteOne({ _id: id });

        if (result.deletedCount === 0) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        if (product?.images && product.images.length > 0) {
            destroyImagesByUrl(product.images).catch(() => {});
        }

        return NextResponse.json({ ok: true });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to delete the product" }, { status: 500 });
    }
}