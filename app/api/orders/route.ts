import { getUserFromNextRequest } from "@/lib/auth_server";
import { cartsCollection, ordersCollection, productsCollection } from "@/lib/collections";
import { newId } from "@/lib/id";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!user.addresses || user.addresses.length === 0) {
            return NextResponse.json({ error: "Shipping address required" }, { status: 400 });
        }

        const shippingAddress = user.addresses[0];

        const carts = await cartsCollection();
        const cart = await carts.findOne({ userId: user._id });

        if (!cart) {
            return NextResponse.json({ error: "Cart not found" }, { status: 404 });
        }
        if (!cart.items || cart.items.length === 0) {
            return NextResponse.json({ error: "Cart cannot be empty" }, { status: 400 });
        }

        const productIds = cart.items.map(items => items.productId);
        const products = await productsCollection();
        const productDocs = await products
            .find({ _id: { $in: productIds } })
            .toArray();

        if (productDocs.length !== productIds.length) {
            return NextResponse.json({ error: "One or more products not found" }, { status: 404 });
        }

        for (const cartItem of cart.items) {
            const product = productDocs.find(p => p._id === cartItem.productId);
            if (!product) {
                return NextResponse.json({ error: "Product not found" }, { status: 404 });
            }
            if (product.stock < cartItem.qty) {
                return NextResponse.json({ error: "Insufficient stock" }, { status: 409 });
            }
        }

        const bulkOps = cart.items.map(cartItem => ({
            updateOne: {
                filter: { _id: cartItem.productId, stock: { $gte: cartItem.qty } },
                update: { $inc: { stock: -cartItem.qty } }
            }
        }));

        const bulkResult = await products.bulkWrite(bulkOps, { ordered: false });

        if (bulkResult.matchedCount !== cart.items.length) {
            // Rollback: restore stock for items that were decremented
            const rollbackOps = cart.items.map(cartItem => ({
                updateOne: {
                    filter: { _id: cartItem.productId },
                    update: { $inc: { stock: cartItem.qty } }
                }
            }));
            await products.bulkWrite(rollbackOps, { ordered: false });

            return NextResponse.json({ error: "Stock conflict, order cancelled" }, { status: 409 });
        }

        let subtotal = 0;

        const orderItems = cart.items.map(cartItem => {
            const product = productDocs.find(p => p._id === cartItem.productId)!;

            const lineTotal = product.price * cartItem.qty;
            subtotal += lineTotal;

            return {
                productId: product._id,
                qty: cartItem.qty,
                price: product.price,
                vendorId: product.vendorId ?? undefined
            };
        });

        const tax = 0;
        const shipping = 0;
        const total = subtotal + tax + shipping;

        const now = new Date().toISOString();
        const _id = newId();

        const order = {
            _id,
            userId: user._id,
            items: orderItems,
            shippingAddress,
            subtotal,
            tax,
            shipping,
            total,
            status: "pending" as const,
            createdAt: now
        };

        const orders = await ordersCollection();
        await orders.insertOne(order);

        await carts.updateOne(
            { userId: user._id },
            {
                $set: {
                    items: [],
                    updatedAt: now
                }
            }
        );

        return NextResponse.json({ order }, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromNextRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const orders = await ordersCollection();
        const filter = user.role === "admin" ? {} : { userId: user._id };
        const items = await orders
            .find(filter)
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({ items });
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}