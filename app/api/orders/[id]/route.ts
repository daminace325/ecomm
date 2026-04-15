import { getUserFromNextRequest, requireAdminFromNextRequestSync } from "@/lib/auth_server";
import { ordersCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";

const VALID_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;

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
        const now = new Date().toISOString();
        const result = await orders.updateOne(
            { _id: id },
            { $set: { status, updatedAt: now } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const updated = await orders.findOne({ _id: id });
        return NextResponse.json({ order: updated });
    } catch (err) {
        if (err instanceof Response) throw err;
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
}