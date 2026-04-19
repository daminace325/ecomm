import { getUserFromNextRequest } from "@/lib/auth_server";
import { ordersCollection, productsCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";

const CANCELLABLE_STATUSES = ["pending", "paid"] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const orders = await ordersCollection();
        const order = await orders.findOne({ _id: id });

        if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (order.userId !== user._id && user.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (!CANCELLABLE_STATUSES.includes(order.status as typeof CANCELLABLE_STATUSES[number])) {
            return NextResponse.json(
                { error: `Order cannot be cancelled in status '${order.status}'` },
                { status: 409 }
            );
        }

        const now = new Date().toISOString();
        const result = await orders.updateOne(
            { _id: id, status: { $in: [...CANCELLABLE_STATUSES] } },
            { $set: { status: "cancelled", updatedAt: now } }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: "Order status changed, refresh and retry" }, { status: 409 });
        }

        // Restore stock
        const products = await productsCollection();
        for (const item of order.items) {
            await products.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.qty } }
            );
        }

        const updated = await orders.findOne({ _id: id });
        return NextResponse.json({ order: updated });
    } catch (err) {
        return NextResponse.json({ error: "Failed to cancel order" }, { status: 500 });
    }
}
