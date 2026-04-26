import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import { ordersCollection, productsCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;

// Statuses for which stock has already been deducted from inventory.
// Moving FROM one of these TO cancelled/refunded should restore stock.
const STOCK_HELD_STATUSES = new Set(["pending", "paid", "processing", "shipped"]);
const STOCK_RELEASE_STATUSES = new Set(["cancelled", "refunded"]);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromNextRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orders = await ordersCollection();
        const order = await orders.findOne({ _id: id });

        if (!order) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (order.userId !== user._id && user.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ order });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromNextRequest(req);
        requireAdminFromNextRequestSync(user);

        const body = await req.json();
        const { status } = body;

        if (!status || !VALID_STATUSES.includes(status)) {
            return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
        }

        const orders = await ordersCollection();
        const existing = await orders.findOne({ _id: id });
        if (!existing) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        if (existing.status === status) {
            return NextResponse.json({ order: existing });
        }

        const now = new Date().toISOString();
        const result = await orders.updateOne(
            { _id: id, status: existing.status },
            { $set: { status, updatedAt: now } }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json(
                { error: "Order status changed, refresh and retry" },
                { status: 409 }
            );
        }

        // Restore stock when transitioning from a stock-held status into a
        // release status (cancelled/refunded). Skip if the previous status
        // was already a release status (idempotent).
        if (
            STOCK_RELEASE_STATUSES.has(status) &&
            STOCK_HELD_STATUSES.has(existing.status)
        ) {
            const products = await productsCollection();
            for (const item of existing.items) {
                await products.updateOne(
                    { _id: item.productId },
                    { $inc: { stock: item.qty } }
                );
            }
        }

        const updated = await orders.findOne({ _id: id });
        return NextResponse.json({ order: updated });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
}