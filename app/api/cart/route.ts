import { getUserFromNextRequest } from "@/lib/auth_server";
import { cartsCollection, productsCollection } from "@/lib/collections";
import { newId } from "@/lib/id";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const carts = await cartsCollection();
        const now = new Date().toISOString();

        // Upsert ensures exactly one cart per user even under concurrent requests
        // (the unique index on userId would otherwise reject the second insert).
        const cart = await carts.findOneAndUpdate(
            { userId: user._id },
            {
                $setOnInsert: {
                    _id: newId(),
                    userId: user._id,
                    items: [],
                    updatedAt: now,
                },
            },
            { upsert: true, returnDocument: "after" }
        );

        return NextResponse.json({ cart });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { productId, qty } = body;

        if (!productId || typeof productId !== "string") {
            return NextResponse.json({ error: "ProductID is required" }, { status: 400 });
        }

        if (typeof qty !== "number" || !Number.isInteger(qty) || qty <= 0) {
            return NextResponse.json({ error: "Quantity must be a positive integer" }, { status: 400 });
        }

        const products = await productsCollection();
        const product = await products.findOne({ _id: productId });

        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const carts = await cartsCollection();
        const now = new Date().toISOString();

        // Ensure cart exists race-safely. The unique index on userId means
        // concurrent upserts collapse to a single document.
        await carts.updateOne(
            { userId: user._id },
            {
                $setOnInsert: {
                    _id: newId(),
                    userId: user._id,
                    items: [],
                    updatedAt: now,
                },
            },
            { upsert: true }
        );

        // Try to bump qty on an existing line item; if no line item matched,
        // push a new one. Two ops because Mongo can't conditionally choose
        // between $inc-on-match and $push-on-miss in a single update.
        const incResult = await carts.updateOne(
            { userId: user._id, "items.productId": productId },
            {
                $inc: { "items.$.qty": qty },
                $set: { updatedAt: now },
            }
        );

        if (incResult.matchedCount === 0) {
            await carts.updateOne(
                { userId: user._id },
                {
                    $push: {
                        items: { productId, qty, priceAtAdd: product.price },
                    },
                    $set: { updatedAt: now },
                }
            );
        }

        const cart = await carts.findOne({ userId: user._id });
        return NextResponse.json({ cart });
    } catch (err) {
        return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const url = new URL(req.url);
        const productId = url.searchParams.get("productId");

        if (!productId) return NextResponse.json({ error: "ProductId required" }, { status: 400 });

        const carts = await cartsCollection();
        const cart = await carts.findOne({ userId: user._id });

        if (!cart) return NextResponse.json({ error: "Cart is empty" }, { status: 404 });

        const index = cart.items.findIndex(
            (item) => item.productId === productId
        );

        if (index === -1) return NextResponse.json({ error: "Product not in cart" }, { status: 404 });

        cart.items.splice(index, 1);
        cart.updatedAt = new Date().toISOString();

        await carts.updateOne(
            { userId: user._id },
            {
                $set: {
                    items: cart.items,
                    updatedAt: cart.updatedAt
                }
            }
        );

        return NextResponse.json({ cart });
    } catch (err) {
        return NextResponse.json({ error: "Failed to delete cart" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { productId, qty } = body;

        if (!productId || typeof productId !== "string") {
            return NextResponse.json({ error: "ProductID is required" }, { status: 400 });
        }
        if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 0) {
            return NextResponse.json({ error: "Quantity must be a non-negative integer" }, { status: 400 });
        }

        const carts = await cartsCollection();
        const cart = await carts.findOne({ userId: user._id });

        if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

        const index = cart.items.findIndex((item) => item.productId === productId);
        if (index === -1) return NextResponse.json({ error: "Product not in cart" }, { status: 404 });

        if (qty === 0) {
            cart.items.splice(index, 1);
        } else {
            cart.items[index].qty = qty;
        }
        cart.updatedAt = new Date().toISOString();

        await carts.updateOne(
            { userId: user._id },
            { $set: { items: cart.items, updatedAt: cart.updatedAt } }
        );

        return NextResponse.json({ cart });
    } catch (err) {
        return NextResponse.json({ error: "Failed to update cart item" }, { status: 500 });
    }
}