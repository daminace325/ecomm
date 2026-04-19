import { getUserFromNextRequest } from "@/lib/auth_server";
import { cartsCollection } from "@/lib/collections";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const carts = await cartsCollection();
        const cart = await carts.findOne({ userId: user._id });

        if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

        const now = new Date().toISOString();
        await carts.updateOne(
            { userId: user._id },
            { $set: { items: [], updatedAt: now } }
        );

        return NextResponse.json({ cart: { ...cart, items: [], updatedAt: now } });
    } catch (err) {
        return NextResponse.json({ error: "Failed to clear cart" }, { status: 500 });
    }
}
