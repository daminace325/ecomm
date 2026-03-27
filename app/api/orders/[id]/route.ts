import { getUserFromNextRequest } from "@/lib/auth_server";
import { ordersCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orders = await ordersCollection();
        const order = await orders.findOne({ _id: params.id });

        if (!order) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (order.userId !== user._id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json({ order });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
    }
}