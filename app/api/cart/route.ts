import { getUserFromNextRequest } from "@/lib/auth_server";
import { cartsCollection, productsCollection } from "@/lib/collections";
import { newId } from "@/lib/id";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const carts = await cartsCollection();
        let cart = await carts.findOne({ userId: user._id });

        const now = new Date().toISOString();
        const _id = newId();

        if (!cart) {
            cart = {
                _id,
                userId: user._id,
                items: [],
                updatedAt: now
            };

            await carts.insertOne(cart);
        }
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

        if (typeof qty !== "number" || qty <= 0) {
            return NextResponse.json({ error: "Quantity must be valid" }, { status: 400 });
        }

        const products = await productsCollection();
        const product = await products.findOne({ _id: productId });

        if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

        const carts = await cartsCollection();
        let cart = await carts.findOne({ userId: user._id });

        const now = new Date().toISOString();
        const _id = newId();

        if (!cart) {
            cart = {
                _id,
                userId: user._id,
                items: [],
                updatedAt: now
            };
        }

        const itemIndex = cart.items.findIndex(
            (item: any) => item.productId === productId
        );

        if (itemIndex >= 0) {
            cart.items[itemIndex].qty += qty;
        } else {
            cart.items.push({
                productId,
                qty,
                priceAtAdd: product.price
            })
        }

        cart.updatedAt = new Date().toISOString();

        await carts.updateOne(
            { userId: user._id },
            { $set: cart },
            { upsert: true }
        );

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
            (item: any) => item.productId === productId
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